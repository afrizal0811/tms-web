import { getKpiData, getLocationHistories, getPendingDetails, getTasks } from '@/lib/api/mileapp';
import { applyPendingDetailsToTasks } from '@/lib/deliveryStatus';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { convertLocationHistories } from '@/lib/reportGenerators/helper';
import { generateKpiWorkbook, generateManualKpiWorkbook } from '@/lib/reportGenerators/reports';
import { toastError, toastSuccess, toastWarning } from '@/lib/toast';
import { calculateStartFinishDates, formatDateUniversal, isEmpty } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';

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

function finalizeWorkbookDownload({ wb, fileName, hasIncompletePending, t }) {
  if (hasIncompletePending) {
    toastWarning(t('report.toast.incomplete_detail'));
    return;
  }
  XLSX.writeFile(wb, fileName);
  toastSuccess(t('common.toast.success'));
}

async function downloadDbKpiReport({ startDateStr, endDateStr, hubAcronym, drivers, t }) {
  const { storedLocation, storedLocationAcronym, storedLocationName } = getLocalStorage();
  const hubId = storedLocation;
  const hubLabel = hubAcronym || storedLocationAcronym || storedLocationName || '';
  const isSingle = startDateStr === endDateStr;

  const kpiParams = isSingle
    ? { hubId, date: startDateStr }
    : { hubId, dateFrom: startDateStr, dateTo: endDateStr };

  const [kpiRes, tasksRes, pendingDetailsRes] = await Promise.all([
    getKpiData(kpiParams),
    getTasks({
      dateFrom: startDateStr,
      dateTo: endDateStr,
      isShowAll: !hubId || hubId === 'all',
    }).catch(() => []),
    getPendingDetails(startDateStr, endDateStr).catch(() => []),
  ]);

  const rawKpi = Array.isArray(kpiRes) ? kpiRes : kpiRes?.data || [];
  const kpiRecords = [...rawKpi].sort((a, b) =>
    String(a.date || '').localeCompare(String(b.date || ''))
  );

  const rawTasks = Array.isArray(tasksRes) ? tasksRes : tasksRes?.data || [];
  const pendingList = Array.isArray(pendingDetailsRes)
    ? pendingDetailsRes
    : pendingDetailsRes?.data || [];
  const taskList = applyPendingDetailsToTasks(rawTasks, pendingList);

  const { wb, hasKpiRows, hasIncompletePending } = generateKpiWorkbook({
    kpiRecords,
    tasksData: taskList,
    driverData: drivers,
    fallbackDate: startDateStr,
  });

  if (!hasKpiRows && !hasIncompletePending) {
    throw new Error(t('common.no_data'));
  }

  const startFile = formatDateUniversal(startDateStr, 'DD.MM.YYYY');
  const endFile = formatDateUniversal(endDateStr, 'DD.MM.YYYY');
  const datePart = isSingle ? startFile : `(${startFile} - ${endFile})`;
  const fileName = hubLabel ? `KPI - ${datePart} - ${hubLabel}.xlsx` : `KPI - ${datePart}.xlsx`;

  finalizeWorkbookDownload({ wb, fileName, hasIncompletePending, t });
}

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
          const p = start.split(/[ T]/)[0];
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
          basePlat: c.veh !== -1 ? cleanStr(r[c.veh]) || '-' : '-',
          driverName: c.to !== -1 ? cleanStr(r[c.to]) : '',
          typeStorage: c.storage !== -1 ? cleanStr(r[c.storage]) || '-' : '-',
          customerOrder: c.order !== -1 ? cleanStr(r[c.order]) || '-' : '-',
          statusDelivery: c.deliv !== -1 ? cleanStr(r[c.deliv]) : '',
          statusGr: c.gr !== -1 ? cleanStr(r[c.gr]) : '',
          alasan: c.alasan !== -1 ? cleanStr(r[c.alasan]) || '-' : '-',
          gpsSesuai: c.gps !== -1 ? cleanStr(r[c.gps]) : '',
        });
      });
  }

  const majorityDate = Object.keys(dates).reduce((a, b) => (dates[a] > dates[b] ? a : b), null);
  return { tasks: parsedTasks, majorityDate };
}

const executeManualKpiDownload = async ({ routingFiles, taskFiles, hubAcronym, drivers, t }) => {
  let routing = [];
  let tasks = [];
  let dateStr = null;

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

  if (!dateStr) {
    throw new Error('Tidak dapat mendeteksi tanggal pengiriman dari kolom startTime di file Task.');
  }

  const formattedDate = formatDateUniversal(dateStr, 'YYYY-MM-DD');
  const { timeFrom, timeTo } = calculateStartFinishDates(formattedDate);

  const [histories, pendingDetails] = await Promise.all([
    getLocationHistories({
      date: formattedDate,
      timeFrom,
      timeTo,
    }),
    getPendingDetails(formattedDate, formattedDate).catch(() => []),
  ]);

  const singleDateHistories = (histories || []).filter(
    (item) => item.date === formattedDate || item.startTime?.startsWith(formattedDate)
  );
  const { kpiHistories: historiesData } = convertLocationHistories(singleDateHistories, drivers);
  const effectiveTasks = applyPendingDetailsToTasks(tasks, pendingDetails);

  const { wb, fileName, hasIncompletePending } = generateManualKpiWorkbook({
    selectedDate: formattedDate,
    locationName: hubAcronym,
    driverData: drivers,
    resultsData: routing,
    tasksData: effectiveTasks,
    historiesData,
  });

  finalizeWorkbookDownload({ wb, fileName, hasIncompletePending, t });
};

export const handleSingleDownload = async ({
  hubAcronym,
  selectedDate,
  driverData,
  setIsLoading,
  t,
}) => {
  try {
    setIsLoading(true);
    if (!selectedDate) throw new Error(t('common.invalid_date'));
    const dateStr = formatDateUniversal(selectedDate, 'YYYY-MM-DD');
    if (!dateStr || dateStr === '-') throw new Error(t('common.invalid_date'));

    await downloadDbKpiReport({
      startDateStr: dateStr,
      endDateStr: dateStr,
      hubAcronym,
      drivers: driverData,
      t,
    });
  } catch (err) {
    toastError(t('common.toast.error', { err: err.message }), err);
  } finally {
    setIsLoading(false);
  }
};

export const handleBulkDownload = async ({
  hubAcronym,
  startDate,
  endDate,
  driverData,
  setIsLoading,
  t,
}) => {
  try {
    setIsLoading(true);
    if (!startDate || !endDate) {
      throw new Error(t('common.invalid_date') || 'Silahkan pilih rentang tanggal!');
    }

    const startDateStr = formatDateUniversal(startDate, 'YYYY-MM-DD');
    const endDateStr = formatDateUniversal(endDate, 'YYYY-MM-DD');
    if (startDateStr === '-' || endDateStr === '-') throw new Error(t('common.invalid_date'));
    if (endDateStr < startDateStr) {
      throw new Error('Tanggal akhir tidak boleh kurang dari tanggal awal.');
    }

    await downloadDbKpiReport({
      startDateStr,
      endDateStr,
      hubAcronym,
      drivers: driverData,
      t,
    });
  } catch (err) {
    toastError(t('common.toast.error', { err: err.message }), err);
  } finally {
    setIsLoading(false);
  }
};

export const handleManualDownload = async ({
  hubAcronym,
  selectedRoutingFiles,
  selectedDeliveryFiles,
  driverData,
  setIsLoading,
  setIsModalOpen,
  setSelectedRoutingFiles,
  setSelectedDeliveryFiles,
  t,
}) => {
  try {
    setIsLoading(true);
    await executeManualKpiDownload({
      routingFiles: selectedRoutingFiles,
      taskFiles: selectedDeliveryFiles,
      hubAcronym,
      drivers: driverData,
      t,
    });

    setIsModalOpen(false);
    setSelectedRoutingFiles([]);
    setSelectedDeliveryFiles([]);
  } catch (err) {
    toastError(t('common.toast.error', { err: err.message }), err);
  } finally {
    setIsLoading(false);
  }
};
