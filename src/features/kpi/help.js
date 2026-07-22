import { getLocationHistories, getResultsSummary, getTasks } from '@/lib/api';
import { toastError, toastSuccess, toastWarning } from '@/lib/toast';
import { calculateStartFinishDates, formatDateUniversal, toApiDateString } from '@/lib/utils';
import JSZip from 'jszip';
import * as XLSX from 'xlsx-js-style';
import { convertLocationHistories } from '../../lib/reportGenerators/helper/convertLocationHistories';
import { generateKpiWorkbook } from '../../lib/reportGenerators/kpi/kpiReport';

const cleanStr = (str) => String(str || '').trim();
const normalizeStr = (str) =>
  String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const getDatesInRange = (start, end) => {
  const dates = [];
  let current = new Date(start);
  current.setHours(0, 0, 0, 0);
  const stop = new Date(end).setHours(0, 0, 0, 0);
  while (current <= stop) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

const shuffleArray = (array) => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

const parseToNumber = (val) => {
  if (val == null || val === '') return 0;
  if (typeof val === 'number') return val;
  const num = parseFloat(
    String(val)
      .replace(/,/g, '')
      .replace(/[^0-9.-]/g, '')
      .trim()
  );
  return isNaN(num) ? 0 : num;
};

const formatExcelDate = (val) => {
  if (typeof val === 'number') {
    const date = new Date((val - 25569) * 86400 * 1000);
    if (isNaN(date.getTime())) return String(val);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
  return cleanStr(val);
};

const getColIdx = (headers, keyword) => {
  const cleanKw = normalizeStr(keyword);
  return headers.findIndex((h) => h != null && normalizeStr(h).includes(cleanKw));
};

const evaluateRoutingValidity = async (
  name,
  targetRoutingDateObj,
  targetDateObj,
  hubId,
  taskMap
) => {
  try {
    const nameResults = await getResultsSummary({
      routingDateObj: targetRoutingDateObj,
      deliveryDateObj: targetDateObj,
      hubId,
      s: name,
    });

    if (!nameResults || nameResults.length === 0) return [];

    const validIds = [];
    for (const item of nameResults) {
      if (!item.result || !Array.isArray(item.result.routing)) continue;

      let totalChecked = 0;
      let totalValid = 0;
      let hasTested = false;

      for (const route of item.result.routing) {
        const validCustomerTrips = (route.trips || []).filter(
          (t) => !t.isHub && t.visitId?.includes('taskId-')
        );

        if (validCustomerTrips.length > 0) {
          hasTested = true;
          const sampledTrips = shuffleArray(validCustomerTrips).slice(
            0,
            Math.min(5, validCustomerTrips.length)
          );
          const extractedIds = sampledTrips
            .map((trip) => trip.visitId.match(/taskId-([a-zA-Z0-9]+)/)?.[1])
            .filter(Boolean);

          totalChecked += extractedIds.length;
          extractedIds.forEach((id) => {
            if (taskMap.get(String(id)) === String(item._id)) totalValid++;
          });
        }
      }

      if (hasTested && totalChecked > 0 && (totalValid / totalChecked) * 100 >= 70) {
        validIds.push(item._id);
      }
    }
    return validIds;
  } catch {
    return [];
  }
};

const processSingleDate = async (targetDateObj, drivers, selectedHub) => {
  const dateString = formatDateUniversal(targetDateObj);
  const startObj = new Date(targetDateObj);
  startObj.setHours(0, 0, 0, 0);
  const timeFrom = toApiDateString(startObj);
  const timeTo = toApiDateString(new Date(startObj.setHours(23, 59, 59)));
  const { timeFrom: histFrom, timeTo: histTo } = calculateStartFinishDates(dateString);

  const targetRoutingDateObj = new Date(targetDateObj);
  targetRoutingDateObj.setDate(targetRoutingDateObj.getDate() - 1);
  if (targetRoutingDateObj.getDay() === 0) {
    targetRoutingDateObj.setDate(targetRoutingDateObj.getDate() - 1);
  }

  const [tasks, rawResults, histories] = await Promise.all([
    getTasks({
      hubId: selectedHub.id,
      status: 'DONE',
      timeFrom,
      timeTo,
      timeBy: 'startTime',
      limit: 5000,
    }),
    getResultsSummary({
      routingDateObj: targetRoutingDateObj,
      deliveryDateObj: targetDateObj,
      hubId: selectedHub.id,
    }),
    getLocationHistories({
      timeFrom: histFrom,
      timeTo: histTo,
      limit: 5000,
      startFinish: 'true',
      fields: 'finish,startTime,email,trackedTime,totalDistance',
      timeBy: 'createdTime',
    }),
  ]);

  const taskMap = new Map();
  const allTasksData = tasks?.data || tasks?.tasks?.data || tasks || [];
  allTasksData.forEach((t) => {
    const taskId = t._id || t.id;
    if (taskId && t.routingResultId) taskMap.set(String(taskId), String(t.routingResultId));
  });

  const uniqueNames = [
    ...new Set((rawResults || []).map((r) => r.name).filter((n) => n && n !== '-')),
  ];
  const validationPromises = uniqueNames.map((name) =>
    evaluateRoutingValidity(name, targetRoutingDateObj, targetDateObj, selectedHub.id, taskMap)
  );

  const validIdsArrays = await Promise.all(validationPromises);
  const validRoutingIds = new Set(validIdsArrays.flat());

  const filteredResults = (rawResults || []).filter((r) => validRoutingIds.has(r._id));
  const { kpiHistories } = convertLocationHistories(
    histories?.tasks?.data || [],
    drivers,
    dateString
  );

  return generateKpiWorkbook(
    dateString,
    selectedHub.name,
    drivers,
    filteredResults,
    tasks || [],
    kpiHistories
  );
};

async function parseRoutingFiles(files) {
  const resultsData = [];
  for (const file of files) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const targetSheetName =
      workbook.SheetNames.find((name) => name.toLowerCase().includes('summary')) ||
      workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[targetSheetName], { header: 1 });

    let routingName = file.name.replace(/\.[^/.]+$/, '');
    if (routingName.includes('-')) routingName = routingName.split('-').slice(1).join('-').trim();

    let headerRowIdx = -1;
    for (let r = 0; r < Math.min(50, rows.length); r++) {
      const rowStr = normalizeStr(rows[r]?.join(''));
      if (
        rowStr.includes('vehiclename') &&
        (rowStr.includes('totalvisit') || rowStr.includes('assignee'))
      ) {
        headerRowIdx = r;
        break;
      }
    }

    if (headerRowIdx === -1) continue;
    const headers = rows[headerRowIdx];

    const colIdx = {
      vehicleName: getColIdx(headers, 'vehiclename'),
      assignee: getColIdx(headers, 'assignee'),
      visit: getColIdx(headers, 'visittime'),
      travel: getColIdx(headers, 'traveltime'),
      wait: getColIdx(headers, 'waitingtime'),
      spent: getColIdx(headers, 'spenttime'),
      totalVisits: getColIdx(headers, 'totalvisit'),
      totalDistance: getColIdx(headers, 'totaldistance'),
      totalWeight: getColIdx(headers, 'totalweight'),
      totalVolume: getColIdx(headers, 'totalvolume'),
      maxWeight: Math.max(getColIdx(headers, 'vehiclemaxweight'), getColIdx(headers, 'maxweight')),
      maxVolume: Math.max(getColIdx(headers, 'vehiclemaxvolume'), getColIdx(headers, 'maxvolume')),
    };

    const routingArray = [];
    const safeNum = (row, idx) => (idx !== -1 ? parseToNumber(row[idx]) : 0);
    const safeStr = (row, idx) => (idx !== -1 ? cleanStr(row[idx]) : '');

    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const rowData = rows[r];
      if (
        !rowData ||
        rowData.length === 0 ||
        colIdx.vehicleName === -1 ||
        !rowData[colIdx.vehicleName]
      )
        continue;

      const visit = safeNum(rowData, colIdx.visit);
      const travel = safeNum(rowData, colIdx.travel);
      const wait = safeNum(rowData, colIdx.wait);
      let spent = safeNum(rowData, colIdx.spent);
      if (spent <= 0) spent = visit + travel + wait;

      routingArray.push({
        vehicleName: safeStr(rowData, colIdx.vehicleName),
        assignee: safeStr(rowData, colIdx.assignee),
        totalVisitTime: visit,
        totalTravelTime: travel,
        totalWaitingTime: wait,
        totalSpentTime: spent,
        totalVisits: safeNum(rowData, colIdx.totalVisits),
        totalDistance: safeNum(rowData, colIdx.totalDistance),
        totalWeight: safeNum(rowData, colIdx.totalWeight),
        totalVolume: safeNum(rowData, colIdx.totalVolume),
        maxWeight: safeNum(rowData, colIdx.maxWeight),
        maxVolume: safeNum(rowData, colIdx.maxVolume),
        trips: [{ isHub: false, weight: 0, volume: 0, distance: 0 }],
      });
    }
    resultsData.push({ description: routingName, result: { routing: routingArray } });
  }
  return resultsData;
}

async function parseTaskFiles(files) {
  const parsedTasks = [];
  const dateFrequency = {};

  for (const file of files) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });

    let headerRowIdx = -1;
    for (let r = 0; r < Math.min(15, rows.length); r++) {
      const rowStr = normalizeStr(rows[r]?.join(''));
      if (rowStr.includes('assignedto') && rowStr.includes('statusdelivery')) {
        headerRowIdx = r;
        break;
      }
    }

    if (headerRowIdx === -1) continue;
    const headers = rows[headerRowIdx];

    const colIdx = {
      flow: getColIdx(headers, 'flow'),
      startTime: getColIdx(headers, 'starttime'),
      assignedTo: getColIdx(headers, 'assignedto'),
      assignedVehicle: getColIdx(headers, 'assignedvehicle'),
      statusGr: getColIdx(headers, 'statusgr'),
      alasan: getColIdx(headers, 'alasan'),
      customerOrder: getColIdx(headers, 'customerorder'),
      typeStorage: getColIdx(headers, 'typestorage'),
      statusDelivery: getColIdx(headers, 'statusdelivery'),
      gpsSesuai: getColIdx(headers, 'gpssesuai'),
    };

    const safeStr = (row, idx) => (idx !== -1 ? cleanStr(row[idx]) : '');

    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0 || colIdx.assignedTo === -1 || !row[colIdx.assignedTo]) continue;

      const startTime = colIdx.startTime !== -1 ? formatExcelDate(row[colIdx.startTime]) : '';
      if (startTime) {
        const parts = startTime.split(' ')[0];
        let isoDate = '';
        if (parts.includes('-')) {
          const splitDash = parts.split('-');
          isoDate =
            splitDash[0].length === 4
              ? parts
              : splitDash[2]?.length === 4
                ? `${splitDash[2]}-${splitDash[1]}-${splitDash[0]}`
                : '';
        } else if (parts.includes('/')) {
          const splitSlash = parts.split('/');
          isoDate =
            splitSlash[2]?.length === 4
              ? `${splitSlash[2]}-${splitSlash[1]}-${splitSlash[0]}`
              : splitSlash[0].length === 4
                ? parts.replace(/\//g, '-')
                : '';
        }
        if (isoDate) dateFrequency[isoDate] = (dateFrequency[isoDate] || 0) + 1;
      }

      parsedTasks.push({
        flow: safeStr(row, colIdx.flow) || '-',
        startTime,
        assignedVehicle: safeStr(row, colIdx.assignedVehicle) || '-',
        driverName: safeStr(row, colIdx.assignedTo),
        typeStorage: safeStr(row, colIdx.typeStorage) || '-',
        customerOrder: safeStr(row, colIdx.customerOrder) || '-',
        statusDelivery: safeStr(row, colIdx.statusDelivery),
        statusGr: safeStr(row, colIdx.statusGr),
        alasan: safeStr(row, colIdx.alasan) || '-',
        gpsSesuai: [safeStr(row, colIdx.gpsSesuai)],
      });
    }
  }

  let majorityDate = null;
  let maxCount = 0;
  for (const [date, count] of Object.entries(dateFrequency)) {
    if (count > maxCount) {
      maxCount = count;
      majorityDate = date;
    }
  }
  return { tasks: parsedTasks, majorityDate };
}

const executeManualDownload = async ({ routingFiles, taskFiles, selectedHub, drivers }) => {
  let parsedResultsData = [];
  if (routingFiles.length > 0) {
    try {
      parsedResultsData = await parseRoutingFiles(routingFiles);
    } catch (err) {
      throw new Error('Gagal membaca format file Routing: ' + err.message);
    }
  }

  let parsedTasksData = [];
  let extractedDateStr = null;
  if (taskFiles.length > 0) {
    try {
      const taskResult = await parseTaskFiles(taskFiles);
      parsedTasksData = taskResult.tasks;
      extractedDateStr = taskResult.majorityDate;
    } catch (err) {
      throw new Error('Gagal membaca format file Task: ' + err.message);
    }
  }

  if (!extractedDateStr) {
    throw new Error('Tidak dapat mendeteksi tanggal pengiriman dari kolom startTime di file Task.');
  }

  const targetDateObj = new Date(extractedDateStr);
  const targetDateStr = formatDateUniversal(targetDateObj);
  const { timeFrom: histFrom, timeTo: histTo } = calculateStartFinishDates(targetDateStr);

  let histories = [];
  try {
    histories =
      (await getLocationHistories({
        timeFrom: histFrom,
        timeTo: histTo,
        limit: 5000,
        startFinish: 'true',
        fields: 'finish,startTime,email,trackedTime,totalDistance',
        timeBy: 'createdTime',
      })) || [];
  } catch {
    toastWarning('Gagal menarik data lokasi API, menggunakan data kosong.');
  }

  const { timeDataObjects } = convertLocationHistories(
    histories?.tasks?.data || [],
    drivers,
    targetDateStr
  );
  const { wb } = generateKpiWorkbook(
    targetDateStr,
    selectedHub.name,
    drivers,
    parsedResultsData,
    parsedTasksData,
    timeDataObjects
  );

  XLSX.writeFile(
    wb,
    `Manual KPI - ${formatDateUniversal(targetDateObj, 'DD.MM.YYYY')} - ${selectedHub.name}.xlsx`
  );
  toastSuccess('File berhasil diunduh (Mode Manual)');
};

export const executeDownload = async ({
  downloadMode,
  singleDate,
  startDate,
  endDate,
  selectedHub,
  drivers,
  dataSource = 'auto',
  routingFiles = [],
  taskFiles = [],
}) => {
  if (dataSource === 'manual') {
    return executeManualDownload({ routingFiles, taskFiles, selectedHub, drivers });
  }

  if (downloadMode === 'single') {
    if (!singleDate) throw new Error('Silahkan pilih tanggal!');
    const { wb, fileName, hasError } = await processSingleDate(singleDate, drivers, selectedHub);
    XLSX.writeFile(wb, fileName);
    if (hasError) toastError('Terdapat data yang hilang. Periksa sheet Error Data!');
    toastSuccess('Data berhasil diunduh!');
    return;
  }

  if (!startDate || !endDate) throw new Error('Silahkan pilih rentang tanggal!');
  if (endDate < startDate) throw new Error('Tanggal akhir tidak boleh kurang dari tanggal awal.');

  const dateList = getDatesInRange(startDate, endDate);
  if (dateList.length > 16) throw new Error('Rentang tanggal terlalu besar.');

  const zip = new JSZip();
  let errorCount = 0;

  for (const currentDate of dateList) {
    if (currentDate.getDay() === 0) continue;
    try {
      const { wb, fileName, hasError } = await processSingleDate(currentDate, drivers, selectedHub);
      if (hasError) errorCount++;
      zip.file(fileName, XLSX.write(wb, { bookType: 'xlsx', type: 'array' }));
    } catch (err) {
      toastError(`Gagal memproses ${formatDateUniversal(currentDate)}: ${err.message}`);
      zip.file(
        `ERROR_LOG_${formatDateUniversal(currentDate)}.txt`,
        `Gagal menarik data: ${err.message}`
      );
    }
  }

  const zipContent = await zip.generateAsync({ type: 'blob' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(zipContent);
  link.download = `Bulk KPI - ${formatDateUniversal(startDate, 'DD.MM.YYYY')} sd ${formatDateUniversal(endDate, 'DD.MM.YYYY')} - ${selectedHub.name}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  if (errorCount > 0)
    toastWarning(`Selesai dengan catatan: ${errorCount} hari memiliki data error.`);
  else toastSuccess('Semua data berhasil diunduh dalam ZIP!');
};
