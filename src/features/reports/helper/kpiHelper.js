import { getLocationHistories, getResults, getTasks } from '@/lib/api/mileapp';
import { convertLocationHistories } from '@/lib/reportGenerators/helper';
import { generateKpiWorkbook } from '@/lib/reportGenerators/reports';
import { toastError, toastSuccess, toastWarning } from '@/lib/toast';
import {
  calculateStartFinishDates,
  formatDateUniversal,
  isEmpty,
  toApiDateString,
} from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import { bulkDownloader, getPreviousRoutingDate } from './help';

const cleanStr = (str) => String(str || '').trim();
const normalizeStr = (str) =>
  cleanStr(str)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const parseToNumber = (val) =>
  typeof val === 'number' ? val : Number(String(val).replace(/[^0-9.-]/g, '')) || 0;

const formatExcelDate = (val) => {
  if (typeof val !== 'number') return cleanStr(val);
  const d = new Date((val - 25569) * 86400000);
  return isNaN(d) ? String(val) : formatDateUniversal(d, 'DD-MM-YYYY HH:mm');
};

const getColIdx = (headers, keyword) => {
  const kw = normalizeStr(keyword);
  return headers.findIndex((h) => h && normalizeStr(h).includes(kw));
};

const evaluateRoutingValidity = (results, taskMap) => {
  if (isEmpty(results)) return [];

  return results
    .filter((item) => {
      if (!item.name || item.name === '-') {
        return false;
      }
      if (!Array.isArray(item.result?.routing)) {
        return false;
      }
      let checked = 0,
        valid = 0;

      item.result.routing.forEach((route) => {
        const validTrips = (route.trips || []).filter((t) => !t.isHub && t.visitId);
        if (isEmpty(validTrips)) return;

        [...validTrips]
          .sort(() => 0.5 - Math.random())
          .slice(0, 5)
          .forEach((trip) => {
            let id = trip.visitId;
            if (id.includes('taskId-')) {
              id = id.split('taskId-')[1];
            }
            if (id) {
              checked++;
              const mapValue = taskMap.get(String(id));
              const itemValue = String(item._id);
              if (mapValue === itemValue) valid++;
            }
          });
      });

      if (checked === 0) {
        return true;
      }
      const ratio = valid / checked;
      return ratio >= 0.5;
    })
    .map((i) => i._id);
};
const processSingleKpiDate = async (targetDateObj, drivers, selectedHub) => {
  const dateString = formatDateUniversal(targetDateObj);
  const startObj = new Date(targetDateObj);
  startObj.setHours(0, 0, 0, 0);
  const timeFrom = toApiDateString(startObj);
  const timeTo = toApiDateString(new Date(startObj.setHours(23, 59, 59)));
  const { timeFrom: histFrom, timeTo: histTo } = calculateStartFinishDates(dateString);

  const targetRoutingDateObj = getPreviousRoutingDate(targetDateObj);

  const [tasks, rawResults, histories] = await Promise.all([
    getTasks({
      hubId: selectedHub.id,
      status: 'DONE,ONGOING',
      timeFrom,
      timeTo,
      timeBy: 'startTime',
    }),
    getResults({
      routingDateObj: targetRoutingDateObj,
      deliveryDateObj: targetDateObj,
      hubId: selectedHub.id,
    }),
    getLocationHistories({
      timeFrom: histFrom,
      timeTo: histTo,
      startFinish: 'true',
      timeBy: 'createdTime',
    }),
  ]);

  const taskList = tasks?.data || tasks?.tasks?.data || tasks || [];
  const taskMap = new Map(taskList.map((t) => [String(t._id || t.id), String(t.routingResultId)]));
  const validRoutingIds = new Set(evaluateRoutingValidity(rawResults || [], taskMap));
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
    taskList,
    kpiHistories
  );
};

async function parseRoutingFiles(files) {
  const resultsData = [];
  for (const file of files) {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const sheetName =
      wb.SheetNames.find((n) => n.toLowerCase().includes('summary')) || wb.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });

    const routingName =
      file.name
        .replace(/\.[^/.]+$/, '')
        .split('-')
        .slice(1)
        .join('-')
        .trim() || file.name;
    const headerIdx = rows.findIndex((r) => {
      const s = normalizeStr(r?.join(''));
      return s.includes('vehiclename') && (s.includes('totalvisit') || s.includes('assignee'));
    });
    if (headerIdx === -1) continue;

    const headers = rows[headerIdx];
    const c = {
      name: getColIdx(headers, 'vehiclename'),
      assignee: getColIdx(headers, 'assignee'),
      visit: getColIdx(headers, 'visittime'),
      travel: getColIdx(headers, 'traveltime'),
      wait: getColIdx(headers, 'waitingtime'),
      spent: getColIdx(headers, 'spenttime'),
      tVisits: getColIdx(headers, 'totalvisit'),
      tDist: getColIdx(headers, 'totaldistance'),
      tWeight: getColIdx(headers, 'totalweight'),
      tVol: getColIdx(headers, 'totalvolume'),
      mWeight: Math.max(getColIdx(headers, 'vehiclemaxweight'), getColIdx(headers, 'maxweight')),
      mVol: Math.max(getColIdx(headers, 'vehiclemaxvolume'), getColIdx(headers, 'maxvolume')),
    };

    const routingArray = rows
      .slice(headerIdx + 1)
      .filter((r) => r?.length > 0 && c.name !== -1 && r[c.name])
      .map((r) => {
        const v = c.visit !== -1 ? parseToNumber(r[c.visit]) : 0;
        const t = c.travel !== -1 ? parseToNumber(r[c.travel]) : 0;
        const w = c.wait !== -1 ? parseToNumber(r[c.wait]) : 0;
        const s = c.spent !== -1 ? parseToNumber(r[c.spent]) : 0;
        return {
          vehicleName: c.name !== -1 ? cleanStr(r[c.name]) : '',
          assignee: c.assignee !== -1 ? cleanStr(r[c.assignee]) : '',
          totalVisitTime: v,
          totalTravelTime: t,
          totalWaitingTime: w,
          totalSpentTime: s <= 0 ? v + t + w : s,
          totalVisits: c.tVisits !== -1 ? parseToNumber(r[c.tVisits]) : 0,
          totalDistance: c.tDist !== -1 ? parseToNumber(r[c.tDist]) : 0,
          totalWeight: c.tWeight !== -1 ? parseToNumber(r[c.tWeight]) : 0,
          totalVolume: c.tVol !== -1 ? parseToNumber(r[c.tVol]) : 0,
          maxWeight: c.mWeight !== -1 ? parseToNumber(r[c.mWeight]) : 0,
          maxVolume: c.mVol !== -1 ? parseToNumber(r[c.mVol]) : 0,
          trips: [{ isHub: false, weight: 0, volume: 0, distance: 0 }],
        };
      });
    resultsData.push({ description: routingName, result: { routing: routingArray } });
  }
  return resultsData;
}

async function parseTaskFiles(files) {
  const parsedTasks = [];
  const dates = {};

  for (const file of files) {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });

    const headerIdx = rows.findIndex((r) => {
      const s = normalizeStr(r?.join(''));
      return s.includes('assignedto') && s.includes('statusdelivery');
    });
    if (headerIdx === -1) continue;

    const headers = rows[headerIdx];
    const c = {
      flow: getColIdx(headers, 'flow'),
      start: getColIdx(headers, 'starttime'),
      to: getColIdx(headers, 'assignedto'),
      veh: getColIdx(headers, 'assignedvehicle'),
      gr: getColIdx(headers, 'statusgr'),
      alasan: getColIdx(headers, 'alasan'),
      order: getColIdx(headers, 'customerorder'),
      storage: getColIdx(headers, 'typestorage'),
      deliv: getColIdx(headers, 'statusdelivery'),
      gps: getColIdx(headers, 'gpssesuai'),
    };

    rows
      .slice(headerIdx + 1)
      .filter((r) => r?.length > 0 && c.to !== -1 && r[c.to])
      .forEach((r) => {
        const start = c.start !== -1 ? formatExcelDate(r[c.start]) : '';
        if (start) {
          let iso = '';
          const p = start.split(' ')[0];
          if (p.includes('-')) {
            const s = p.split('-');
            iso = s[0].length === 4 ? p : s[2]?.length === 4 ? `${s[2]}-${s[1]}-${s[0]}` : '';
          } else if (p.includes('/')) {
            const s = p.split('/');
            iso =
              s[2]?.length === 4
                ? `${s[2]}-${s[1]}-${s[0]}`
                : s[0].length === 4
                  ? p.replace(/\//g, '-')
                  : '';
          }
          if (iso) dates[iso] = (dates[iso] || 0) + 1;
        }

        parsedTasks.push({
          flow: c.flow !== -1 ? cleanStr(r[c.flow]) || '-' : '-',
          startTime: start,
          assignedVehicle: c.veh !== -1 ? cleanStr(r[c.veh]) || '-' : '-',
          driverName: c.to !== -1 ? cleanStr(r[c.to]) : '',
          typeStorage: c.storage !== -1 ? cleanStr(r[c.storage]) || '-' : '-',
          customerOrder: c.order !== -1 ? cleanStr(r[c.order]) || '-' : '-',
          statusDelivery: c.deliv !== -1 ? cleanStr(r[c.deliv]) : '',
          statusGr: c.gr !== -1 ? cleanStr(r[c.gr]) : '',
          alasan: c.alasan !== -1 ? cleanStr(r[c.alasan]) || '-' : '-',
          gpsSesuai: [c.gps !== -1 ? cleanStr(r[c.gps]) : ''],
        });
      });
  }

  const majorityDate = Object.keys(dates).reduce((a, b) => (dates[a] > dates[b] ? a : b), null);
  return { tasks: parsedTasks, majorityDate };
}

const executeManualKpiDownload = async ({ routingFiles, taskFiles, selectedHub, drivers }) => {
  let routing = [],
    tasks = [],
    dateStr = null;

  if (!isEmpty(routingFiles)) {
    try {
      routing = await parseRoutingFiles(routingFiles);
    } catch (e) {
      throw new Error('Gagal membaca format file Routing: ' + e.message);
    }
  }

  if (!isEmpty(taskFiles)) {
    try {
      const r = await parseTaskFiles(taskFiles);
      tasks = r.tasks;
      dateStr = r.majorityDate;
    } catch (e) {
      throw new Error('Gagal membaca format file Task: ' + e.message);
    }
  }

  if (!dateStr)
    throw new Error('Tidak dapat mendeteksi tanggal pengiriman dari kolom startTime di file Task.');

  const dateObj = new Date(dateStr);
  const formattedDate = formatDateUniversal(dateObj);
  const { timeFrom, timeTo } = calculateStartFinishDates(formattedDate);

  let histories = [];
  try {
    histories =
      (await getLocationHistories({
        timeFrom,
        timeTo,
        startFinish: 'true',
        timeBy: 'createdTime',
      })) || [];
  } catch {
    toastWarning('Gagal menarik data lokasi API, menggunakan data kosong.');
  }

  const { kpiHistories: historiesData } = convertLocationHistories(
    histories?.tasks?.data || [],
    drivers,
    formattedDate
  );
  const { wb } = generateKpiWorkbook(
    formattedDate,
    selectedHub.name,
    drivers,
    routing,
    tasks,
    historiesData
  );

  XLSX.writeFile(
    wb,
    `Manual KPI - ${formatDateUniversal(dateObj, 'DD.MM.YYYY')} - ${selectedHub.name}.xlsx`
  );
  toastSuccess('File berhasil diunduh (Mode Manual)');
};

export const handleKpiDownload = async ({
  downloadMode,
  singleDate,
  startDate,
  endDate,
  selectedHub,
  drivers,
  dataSource = 'auto',
  routingFiles = [],
  taskFiles = [],
  setIsLoading = () => {},
  t = (key) => key,
}) => {
  if (dataSource === 'manual')
    return executeManualKpiDownload({ routingFiles, taskFiles, selectedHub, drivers });

  if (downloadMode === 'single') {
    if (!singleDate) throw new Error('Silahkan pilih tanggal!');
    const { wb, fileName, hasError } = await processSingleKpiDate(singleDate, drivers, selectedHub);
    XLSX.writeFile(wb, fileName);
    if (hasError) toastError('Terdapat data yang hilang. Periksa sheet Error Data!');
    return toastSuccess('Data berhasil diunduh!');
  }

  if (!startDate || !endDate) throw new Error('Silahkan pilih rentang tanggal!');
  if (endDate < startDate) throw new Error('Tanggal akhir tidak boleh kurang dari tanggal awal.');

  return bulkDownloader({
    startDate,
    endDate,
    driverData: drivers,
    zipPrefix: `${t('report.kpi_report')} (${t('common.bulk')})`,
    setIsLoading,
    processDateCallback: async ({ dateObj }) => {
      const { wb, fileName, hasError } = await processSingleKpiDate(dateObj, drivers, selectedHub);
      if (hasError) toastWarning(`Data tidak lengkap untuk ${formatDateUniversal(dateObj)}`);
      return { wb, excelFileName: fileName };
    },
    t,
  });
};
