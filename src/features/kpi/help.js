import { getLocationHistories, getResultsSummary, getTask, getTasks } from '@/lib/api';
import { toastError, toastSuccess, toastWarning } from '@/lib/toast';
import { calculateStartFinishDates, formatDateUniversal, formatToApiUtc } from '@/lib/utils';
import JSZip from 'jszip';
import * as XLSX from 'xlsx-js-style';
import { convertLocationHistories } from '../../lib/reportGenerators/helper/convertLocationHistories';
import { generateKpiWorkbook } from '../../lib/reportGenerators/kpi/kpiReport';

const getDatesInRange = (start, end) => {
  const dates = [];
  let current = new Date(start);
  const stop = new Date(end);
  current.setHours(0, 0, 0, 0);
  stop.setHours(0, 0, 0, 0);
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

const processSingleDate = async (targetDateObj, drivers, selectedHub) => {
  const dateString = formatDateUniversal(targetDateObj);
  const startObj = new Date(targetDateObj);
  startObj.setHours(0, 0, 0, 0);
  const timeFrom = formatToApiUtc(startObj);
  const timeTo = formatToApiUtc(new Date(startObj.setHours(23, 59, 59)));
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

  const uniqueNames = [
    ...new Set((rawResults || []).filter((r) => r.name && r.name !== '-').map((r) => r.name)),
  ];

  const validRoutingIds = new Set();

  for (const name of uniqueNames) {
    try {
      const nameResults = await getResultsSummary({
        routingDateObj: targetRoutingDateObj,
        deliveryDateObj: targetDateObj,
        hubId: selectedHub.id,
        s: name,
      });

      if (!nameResults || nameResults.length === 0) continue;

      for (const item of nameResults) {
        const routingId = item._id;
        let totalCheckedTasks = 0;
        let totalValidTasks = 0;
        let hasTestedAnyTrip = false;

        if (item.result && Array.isArray(item.result.routing)) {
          for (const route of item.result.routing) {
            const validCustomerTrips = (route.trips || []).filter(
              (t) => !t.isHub && t.visitId && t.visitId.includes('taskId-')
            );

            if (validCustomerTrips.length > 0) {
              hasTestedAnyTrip = true;

              const maxSample =
                validCustomerTrips.length > 5 ? 5 : Math.min(2, validCustomerTrips.length);
              const shuffledTrips = shuffleArray(validCustomerTrips);
              const sampledTrips = shuffledTrips.slice(0, maxSample);

              const extractedIds = sampledTrips
                .map((trip) => {
                  const match = trip.visitId.match(/taskId-([a-zA-Z0-9]+)/);
                  return match ? match[1] : null;
                })
                .filter(Boolean);

              totalCheckedTasks += extractedIds.length;

              if (extractedIds.length > 0) {
                const taskPromises = extractedIds.map((id) => getTask(id).catch(() => null));
                const taskResults = await Promise.all(taskPromises);

                taskResults.forEach((taskRes) => {
                  if (taskRes) {
                    const taskData = taskRes.data || taskRes;
                    if (String(taskData?.task?.routingResultId) === String(routingId)) {
                      totalValidTasks++;
                    }
                  }
                });
              }
            }
          }
        }

        if (hasTestedAnyTrip && totalCheckedTasks > 0) {
          const successRatio = (totalValidTasks / totalCheckedTasks) * 100;
          if (successRatio >= 70) {
            validRoutingIds.add(routingId);
          }
        }
      }
    } catch (err) {}
  }

  const filteredResults = (rawResults || []).filter((r) => validRoutingIds.has(r._id));

  const historiesData = histories?.tasks?.data || [];
  const { kpiHistories } = convertLocationHistories(historiesData || [], drivers, dateString);

  const { wb, fileName, hasError } = generateKpiWorkbook(
    dateString,
    selectedHub.name,
    drivers,
    filteredResults,
    tasks || [],
    kpiHistories
  );

  return { wb, fileName, hasError };
};

function parseToNumber(val) {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const str = String(val)
    .replace(/,/g, '')
    .replace(/[^0-9.-]/g, '')
    .trim();
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function formatExcelDate(val) {
  if (typeof val === 'number') {
    const date = new Date((val - (25567 + 2)) * 86400 * 1000);
    if (isNaN(date.getTime())) return String(val);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const HH = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${dd}-${mm}-${yyyy} ${HH}:${min}`;
  }
  return String(val || '').trim();
}

async function parseRoutingFiles(files) {
  const resultsData = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });

    let targetSheetName =
      workbook.SheetNames.find((name) => name.toLowerCase().includes('summary')) ||
      workbook.SheetNames[0];

    const ws = workbook.Sheets[targetSheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

    let routingName = file.name.replace(/\.[^/.]+$/, '');
    if (routingName.includes('-')) {
      const parts = routingName.split('-');
      routingName = parts.slice(1).join('-').trim();
    }

    let headerRowIdx = -1;
    for (let r = 0; r < Math.min(50, rows.length); r++) {
      const rowStr = (rows[r] || [])
        .join('')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
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

    const getColIdxForVehicle = () => {
      return headers.findIndex((h) => {
        if (h === undefined || h === null) return false;
        const cleanH = String(h)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '');
        return (
          (cleanH.includes('assignedvehicle') || cleanH.includes('vehicle')) &&
          !cleanH.includes('id')
        );
      });
    };

    const getColIdx = (keyword) => {
      const cleanKeyword = keyword.toLowerCase().replace(/[^a-z0-9]/g, '');
      return headers.findIndex((h) => {
        if (h === undefined || h === null) return false;
        const cleanH = String(h)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '');
        return cleanH.includes(cleanKeyword);
      });
    };

    const colIdx = {
      vehicleName: getColIdx('vehiclename'),
      assignee: getColIdx('assignee'),
      visit: getColIdx('visittime'),
      travel: getColIdx('traveltime'),
      wait: getColIdx('waitingtime'),
      spent: getColIdx('spenttime'),
      totalVisits: getColIdx('totalvisit'),
      totalDistance: getColIdx('totaldistance'),
      totalWeight: getColIdx('totalweight'),
      totalVolume: getColIdx('totalvolume'),
      assignedVehicle: getColIdxForVehicle(),
      maxWeight: Math.max(getColIdx('vehiclemaxweight'), getColIdx('maxweight')),
      maxVolume: Math.max(getColIdx('vehiclemaxvolume'), getColIdx('maxvolume')),
    };

    const routingArray = [];

    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const rowData = rows[r];

      if (
        !rowData ||
        rowData.length === 0 ||
        colIdx.vehicleName === -1 ||
        !rowData[colIdx.vehicleName]
      )
        continue;

      const vehicleName = String(rowData[colIdx.vehicleName] || '').trim();
      const assignee = colIdx.assignee !== -1 ? String(rowData[colIdx.assignee] || '').trim() : '';

      const visit = colIdx.visit !== -1 ? parseToNumber(rowData[colIdx.visit]) : 0;
      const travel = colIdx.travel !== -1 ? parseToNumber(rowData[colIdx.travel]) : 0;
      const wait = colIdx.wait !== -1 ? parseToNumber(rowData[colIdx.wait]) : 0;
      let spent = colIdx.spent !== -1 ? parseToNumber(rowData[colIdx.spent]) : 0;

      const totalVisits =
        colIdx.totalVisits !== -1 ? parseToNumber(rowData[colIdx.totalVisits]) : 0;
      const totalDistance =
        colIdx.totalDistance !== -1 ? parseToNumber(rowData[colIdx.totalDistance]) : 0;
      const totalWeight =
        colIdx.totalWeight !== -1 ? parseToNumber(rowData[colIdx.totalWeight]) : 0;
      const totalVolume =
        colIdx.totalVolume !== -1 ? parseToNumber(rowData[colIdx.totalVolume]) : 0;

      const maxWeight = colIdx.maxWeight !== -1 ? parseToNumber(rowData[colIdx.maxWeight]) : 0;
      const maxVolume = colIdx.maxVolume !== -1 ? parseToNumber(rowData[colIdx.maxVolume]) : 0;

      if (spent <= 0) {
        spent = visit + travel + wait;
      }

      routingArray.push({
        vehicleName: vehicleName,
        assignee: assignee,
        totalVisitTime: visit,
        totalTravelTime: travel,
        totalWaitingTime: wait,
        totalSpentTime: spent,
        totalVisits: totalVisits,
        totalDistance: totalDistance,
        totalWeight: totalWeight,
        totalVolume: totalVolume,
        maxWeight: maxWeight,
        maxVolume: maxVolume,
        trips: [{ isHub: false, weight: 0, volume: 0, distance: 0 }],
      });
    }

    resultsData.push({
      description: routingName,
      result: {
        routing: routingArray,
      },
    });
  }

  return resultsData;
}

async function parseTaskFiles(files) {
  const parsedTasks = [];
  const dateFrequency = {};

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const ws = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

    let headerRowIdx = -1;
    for (let r = 0; r < Math.min(15, rows.length); r++) {
      const rowStr = (rows[r] || [])
        .join('')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      if (rowStr.includes('assignedto') && rowStr.includes('statusdelivery')) {
        headerRowIdx = r;
        break;
      }
    }

    if (headerRowIdx === -1) continue;
    const headers = rows[headerRowIdx];

    const getColIdx = (keyword) => {
      const cleanKeyword = keyword.toLowerCase().replace(/[^a-z0-9]/g, '');
      return headers.findIndex((h) => {
        if (h === undefined || h === null) return false;
        const cleanH = String(h)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '');
        return cleanH.includes(cleanKeyword);
      });
    };

    const colIdx = {
      flow: getColIdx('flow'),
      startTime: getColIdx('starttime'),
      assignedTo: getColIdx('assignedto'),
      assignedVehicle: getColIdx('assignedvehicle'),
      statusGr: getColIdx('statusgr'),
      alasan: getColIdx('alasan'),
      customerOrder: getColIdx('customerorder'),
      typeStorage: getColIdx('typestorage'),
      statusDelivery: getColIdx('statusdelivery'),
      gpsSesuai: getColIdx('gpssesuai'),
    };

    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0 || colIdx.assignedTo === -1 || !row[colIdx.assignedTo]) continue;

      const statDeliv =
        colIdx.statusDelivery !== -1 ? String(row[colIdx.statusDelivery] || '').trim() : '';
      const statGr = colIdx.statusGr !== -1 ? String(row[colIdx.statusGr] || '').trim() : '';
      const startTime = colIdx.startTime !== -1 ? formatExcelDate(row[colIdx.startTime]) : '';
      const gps = colIdx.gpsSesuai !== -1 ? String(row[colIdx.gpsSesuai] || '').trim() : '';

      if (startTime) {
        const parts = startTime.split(' ')[0];
        let isoDate = '';
        if (parts.includes('-')) {
          const splitDash = parts.split('-');
          if (splitDash[0].length === 4) isoDate = parts;
          else if (splitDash[2]?.length === 4)
            isoDate = `${splitDash[2]}-${splitDash[1]}-${splitDash[0]}`;
        } else if (parts.includes('/')) {
          const splitSlash = parts.split('/');
          if (splitSlash[2]?.length === 4)
            isoDate = `${splitSlash[2]}-${splitSlash[1]}-${splitSlash[0]}`;
          else if (splitSlash[0].length === 4) isoDate = parts.replace(/\//g, '-');
        }
        if (isoDate) dateFrequency[isoDate] = (dateFrequency[isoDate] || 0) + 1;
      }

      parsedTasks.push({
        flow: colIdx.flow !== -1 ? String(row[colIdx.flow] || '').trim() : '-',
        startTime: startTime,
        assignedVehicle:
          colIdx.assignedVehicle !== -1 ? String(row[colIdx.assignedVehicle] || '').trim() : '-',
        driverName: String(row[colIdx.assignedTo] || '').trim(),
        typeStorage: colIdx.typeStorage !== -1 ? String(row[colIdx.typeStorage] || '').trim() : '-',
        customerOrder:
          colIdx.customerOrder !== -1 ? String(row[colIdx.customerOrder] || '').trim() : '-',
        statusDelivery: statDeliv,
        statusGr: statGr,
        alasan: colIdx.alasan !== -1 ? String(row[colIdx.alasan] || '').trim() : '-',
        gpsSesuai: [gps],
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
      throw new Error(
        'Tidak dapat mendeteksi tanggal pengiriman dari kolom startTime di file Task.'
      );
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
    } catch (err) {
      toastWarning('Gagal menarik data lokasi API, menggunakan data kosong.');
    }

    const historiesData = histories?.tasks?.data || [];
    const { timeDataObjects } = convertLocationHistories(
      historiesData || [],
      drivers,
      targetDateStr
    );

    const combinedTasks = parsedTasksData;
    const { wb } = generateKpiWorkbook(
      targetDateStr,
      selectedHub.name,
      drivers,
      parsedResultsData,
      combinedTasks,
      timeDataObjects
    );

    const formattedDateForName = formatDateUniversal(targetDateObj, 'DD.MM.YYYY');
    const manualFileName = `Manual Data KPI - ${formattedDateForName} - ${selectedHub.name}.xlsx`;

    XLSX.writeFile(wb, manualFileName);

    toastSuccess(`File berhasil diunduh (Mode Manual)`);
    return;
  }

  if (downloadMode === 'single') {
    if (!singleDate) throw new Error('Silahkan pilih tanggal!');
    const { wb, fileName, hasError } = await processSingleDate(singleDate, drivers, selectedHub);

    XLSX.writeFile(wb, fileName);
    if (hasError) toastError('Terdapat data yang hilang. Periksa sheet Error Data!');
    toastSuccess(`Data berhasil diunduh!`);
  } else {
    if (!startDate || !endDate) throw new Error('Silahkan pilih rentang tanggal!');
    if (endDate < startDate) throw new Error('Tanggal akhir tidak boleh kurang dari tanggal awal.');

    const dateList = getDatesInRange(startDate, endDate);
    if (dateList.length > 16) throw new Error('Rentang tanggal terlalu besar.');

    const zip = new JSZip();
    let errorCount = 0;

    for (let i = 0; i < dateList.length; i++) {
      const currentDate = dateList[i];

      if (currentDate.getDay() === 0) continue;

      try {
        const { wb, fileName, hasError } = await processSingleDate(
          currentDate,
          drivers,
          selectedHub
        );
        if (hasError) errorCount++;
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        zip.file(fileName, excelBuffer);
      } catch (err) {
        toastError(`Gagal memproses ${formatDateUniversal(currentDate)}: ${err.message}`);
        zip.file(
          `ERROR_LOG_${formatDateUniversal(currentDate)}.txt`,
          `Gagal menarik data: ${err.message}`
        );
      }
    }

    const zipContent = await zip.generateAsync({ type: 'blob' });
    const zipFileName = `Bulk Data KPI - ${formatDateUniversal(
      startDate,
      'DD.MM.YYYY'
    )} sd ${formatDateUniversal(endDate, 'DD.MM.YYYY')} - ${selectedHub.name}.zip`;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(zipContent);
    link.download = zipFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (errorCount > 0)
      toastWarning(`Selesai dengan catatan: ${errorCount} hari memiliki data error.`);
    else toastSuccess('Semua data berhasil diunduh dalam ZIP!');
  }
};
