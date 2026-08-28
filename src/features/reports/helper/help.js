import {
  getLocationHistories,
  getResult,
  getResultHistories,
  getResultsSummary,
  getTasks,
  getVehicleMappings,
  getVehicleTypes,
} from '@/lib/api';
import { getDriverData } from '@/lib/driverData';
import { getCachedHubs, getLocalStorage } from '@/lib/localStorageHandler';
import { convertLocationHistories } from '@/lib/reportGenerators/helper';
import {
  buildRoutingMap,
  buildSyncTimeMap,
  generateAutoReportWorkbook,
  generateKpiWorkbook,
  generateManualReportWorkbook,
  generateTaskDetailWorkbook,
  generateTaskManualDetailWorkbook,
  groupTasksByDriver,
} from '@/lib/reportGenerators/reports';
import { toastError, toastSuccess, toastWarning } from '@/lib/toast';
import {
  calculateMinuteDifference,
  calculateStartFinishDates,
  formatDateUniversal,
  formatUTC7,
  getBasePlate,
  isDateSunday,
  isEmpty,
  normalizeEmail,
  parseCustomerString,
  toApiDateString,
} from '@/lib/utils';
import JSZip from 'jszip';
import * as XLSX from 'xlsx-js-style';
import {
  taskDateHeaders,
  taskHeaders,
  taskKeyMapping,
  taskManualHeaders,
  taskManualKeyMapping,
} from './constants';

const parseDate = (dateStr) => new Date(dateStr.replace(/-/g, '/'));

export const getDatesInRange = (startDate, endDate) => {
  const dates = [];
  let currentDate = new Date(startDate);
  currentDate.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  while (currentDate <= end) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
};

export const bulkDownloader = async ({
  startDate,
  endDate,
  driverData,
  zipPrefix,
  setIsLoading,
  processDateCallback,
  t,
}) => {
  if (!driverData || isEmpty(driverData)) {
    toastError(t('common.toast.error', { err: t('common.no_driver') }));
    return;
  }

  setIsLoading(true);

  try {
    const originalStartDateString = formatDateUniversal(startDate, 'DD.MM.YYYY');
    const originalEndDateString = formatDateUniversal(endDate, 'DD.MM.YYYY');
    const {
      storedLocation: hubId,
      storedLocationName: hubName,
      storedLocationAcronym,
    } = getLocalStorage();
    const hubLabel = storedLocationAcronym || hubName;
    const datesToProcess = getDatesInRange(startDate, endDate);
    const zip = new JSZip();
    let filesGenerated = 0;
    let sundaysSkipped = 0;
    const skippedDates = [];

    for (const dateObj of datesToProcess) {
      const dateForFile = formatDateUniversal(dateObj);
      if (isDateSunday(dateForFile)) {
        sundaysSkipped++;
        continue;
      }
      try {
        const result = await processDateCallback({
          dateObj,
          dateForFile,
          hubId,
          hubName: hubLabel,
        });
        if (result?.error) {
          skippedDates.push(dateForFile);
          continue;
        }

        if (result?.wb || result?.excelFileName) {
          const { wb, excelFileName } = result;
          const excelUint8Array = XLSX.write(wb, {
            bookType: 'xlsx',
            type: 'array',
          });
          zip.file(excelFileName, excelUint8Array);
          filesGenerated++;
          continue;
        }

        skippedDates.push(dateForFile);
      } catch (err) {
        skippedDates.push(dateForFile);
        console.error(err);
      }
    }

    const totalSkipped = skippedDates.length + sundaysSkipped;
    const failedZipText = t('report.toast.failed_zip');
    const noDataText = t('common.no_data');
    const skipDateText = t('report.toast.skip_data', {
      skippedDates: skippedDates.length,
    });
    const skipSundayText = t('report.toast.skip_sunday', {
      sundaysSkipped,
    });

    if (filesGenerated === 0) {
      throw new Error(`${failedZipText}, ${noDataText.toLowerCase()}`);
    }

    if (totalSkipped > 0) {
      if (skippedDates.length > 0 && sundaysSkipped > 0) {
        toastWarning(`${skipDateText}, ${skipSundayText.toLowerCase()}`);
      } else if (skippedDates.length > 0) {
        toastWarning(skipDateText);
      } else if (sundaysSkipped > 0) {
        toastWarning(skipSundayText);
      }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(zipBlob);
    link.download = `${zipPrefix} - (${originalStartDateString} - ${originalEndDateString}) - ${hubLabel}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toastSuccess(t('common.toast.success'));
  } catch (e) {
    toastError(t('common.toast.error', { err: e.message }));
  } finally {
    setIsLoading(false);
  }
};

export const getManualDate = (headerName, deliveryBuffers, fallbackDate) => {
  try {
    const dates = [];

    for (const buf of deliveryBuffers) {
      const wbInput = XLSX.read(buf, { type: 'array' });
      const sheetName =
        wbInput.SheetNames.find((s) => s.toLowerCase() === 'main') || wbInput.SheetNames[0];
      const rawRows = XLSX.utils.sheet_to_json(wbInput.Sheets[sheetName], { header: 1 });

      const headIdx = rawRows.findIndex((row) => {
        if (!Array.isArray(row)) return false;
        const rStr = row.map((c) => String(c).toLowerCase().trim());
        return rStr.includes('_id') && rStr.includes('flow');
      });

      if (headIdx === -1) continue;

      const headers = rawRows[headIdx].map((h) => String(h).toLowerCase().trim());
      const idxStart = headers.indexOf(headerName);

      if (idxStart === -1) continue;

      for (let i = headIdx + 1; i < rawRows.length; i++) {
        const dPart = rawRows[i]?.[idxStart]
          ? String(rawRows[i][idxStart]).split(/[T\s]/)[0]
          : null;
        if (dPart) dates.push(dPart);
      }
    }

    if (dates.length === 0) return fallbackDate;

    const majorityDate = Object.entries(
      dates.reduce((acc, d) => ({ ...acc, [d]: (acc[d] || 0) + 1 }), {})
    ).sort(([, a], [, b]) => b - a)[0][0];

    const parts = majorityDate.split(/[-/]/);
    if (parts.length !== 3) return majorityDate;

    if (parts[0].length === 4)
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    if (parts[2].length === 4)
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;

    return majorityDate;
  } catch (e) {
    console.error('Gagal mengekstrak tanggal dari file excel task:', e);
    return fallbackDate;
  }
};

const driversCheck = async (selectedLocation, t) => {
  const drivers = await getDriverData(selectedLocation);
  if (isEmpty(drivers)) {
    throw new Error(t('common.toast.error', { err: t('common.no_driver') }));
  }
  return drivers;
};

const fetchVehicleMetadata = async () => {
  const [vehicleTypesObj, mappingsDB] = await Promise.all([
    getVehicleTypes(),
    getVehicleMappings(),
  ]);
  const vehicleTypes = vehicleTypesObj.map((v) => v.name);
  const mappingsObj = mappingsDB.reduce((acc, curr) => {
    acc[curr.plat] = curr.mappedType;
    return acc;
  }, {});
  return { vehicleTypes, mappingsObj };
};

export const handleSingleDownload = async ({
  selectedLocation,
  selectedLocationName,
  selectedDate,
  selectedDateString,
  isCustomRouting,
  routingDate,
  driverData,
  setIsLoading,
  setIsAnyLoading,
  setIsMapping,
  t,
}) => {
  try {
    setIsLoading(true);
    await driversCheck(selectedLocation, t);
    if (setIsAnyLoading) setIsAnyLoading(true);
    if (setIsMapping) setIsMapping(false);

    if (!selectedDateString) throw new Error(t('common.invalid_date'));

    const timeFromTasks = new Date(`${selectedDateString}T00:00:00`).toISOString();
    const timeToTasks = new Date(`${selectedDateString}T23:59:59`).toISOString();

    const { timeFrom: timeFromHistories, timeTo: timeToHistories } =
      calculateStartFinishDates(selectedDateString);

    const allTasks = await getTasks({
      hubId: selectedLocation,
      status: 'DONE,ONGOING',
      timeFrom: timeFromTasks,
      timeTo: timeToTasks,
      timeBy: 'startTime',
    });

    if (isEmpty(allTasks)) {
      throw new Error(t('common.no_data'));
    }

    let targetRoutingStr;
    if (isCustomRouting) {
      if (!routingDate) throw new Error(t('common.invalid_date'));
      targetRoutingStr = formatDateUniversal(new Date(routingDate));
    } else {
      const dates = [];
      allTasks.forEach((task) => {
        if (task.createdFrom === 'API' && task.createdTime) {
          const d = new Date(task.createdTime);
          d.setHours(d.getHours() + 7);
          dates.push(d.toISOString().split('T')[0]);
        }
      });

      if (dates.length > 0) {
        const modeMap = {};
        let maxEl = dates[0],
          maxCount = 1;
        for (const d of dates) {
          modeMap[d] = (modeMap[d] || 0) + 1;
          if (modeMap[d] > maxCount) {
            maxEl = d;
            maxCount = modeMap[d];
          }
        }
        targetRoutingStr = maxEl;
      } else {
        const targetRoutingDateObj = new Date(selectedDate);
        targetRoutingDateObj.setDate(targetRoutingDateObj.getDate() - 1);
        if (targetRoutingDateObj.getDay() === 0)
          targetRoutingDateObj.setDate(targetRoutingDateObj.getDate() - 1);
        targetRoutingStr = formatDateUniversal(targetRoutingDateObj);
      }
    }

    const summaryPayload = {
      dateFrom: `${targetRoutingStr} 00:00:00`,
      dateTo: `${targetRoutingStr} 23:59:59`,
      hubId: selectedLocation,
    };

    const { storedLocationAcronym } = getLocalStorage();
    const [filteredResults, hubsData, locationHistoriesRes, { vehicleTypes, mappingsObj }] =
      await Promise.all([
        getResultsSummary(summaryPayload),
        getCachedHubs(),
        getLocationHistories({
          timeFrom: timeFromHistories,
          timeTo: timeToHistories,
          startFinish: 'true',
          timeBy: 'createdTime',
        }),
        fetchVehicleMetadata(),
      ]);

    const allApiData = locationHistoriesRes?.tasks?.data || [];
    const { timeDataObjects } = convertLocationHistories(
      allApiData || [],
      driverData,
      selectedDateString
    );
    const filteredTimeData = timeDataObjects.filter(
      (item) => !isEmpty(item.startTimeFmt) && !isEmpty(item.finishTimeFmt)
    );

    if (isEmpty(filteredResults) && isEmpty(allTasks) && isEmpty(filteredTimeData)) {
      throw new Error(t('common.no_data'));
    }

    const activeHub = (hubsData || []).find(
      (h) => String(h._id || h.id) === String(selectedLocation)
    );
    const hasPendingGR = activeHub ? activeHub.hasPendingGR : false;
    const hubLabel = storedLocationAcronym || selectedLocationName;

    const { wb, excelFileName } = await generateAutoReportWorkbook({
      driverData,
      filteredResults,
      allTasks,
      timeData: timeDataObjects,
      mappingsObj,
      vehicleTypes,
      targetRoutingStr,
      selectedDateString,
      hubLabel,
      hasPendingGR,
      t,
    });

    XLSX.writeFile(wb, excelFileName);
    toastSuccess(t('common.toast.success'));
  } catch (err) {
    toastError(err.message || String(err));
  } finally {
    setIsLoading(false);
    if (setIsAnyLoading) setIsAnyLoading(false);
    if (setIsMapping) setIsMapping(false);
  }
};

export const handleBulkDownload = async ({
  selectedLocation,
  startDate,
  endDate,
  driverData,
  setIsLoading,
  t,
}) => {
  let mappingsObj = {};
  let vehicleTypes = [];
  let hubsMap = {};
  try {
    setIsLoading(true);
    await driversCheck(selectedLocation, t);
    const [{ vehicleTypes: vTypes, mappingsObj: mObj }, hubsDB] = await Promise.all([
      fetchVehicleMetadata(),
      getCachedHubs(),
    ]);
    vehicleTypes = vTypes;
    mappingsObj = mObj;
    hubsMap = hubsDB.reduce((acc, curr) => {
      acc[String(curr._id || curr.id)] = curr.hasPendingGR || false;
      return acc;
    }, {});
  } catch (e) {
    toastError(t('common.toast.error', { err: e.message }));
    setIsLoading(false);
    return;
  } finally {
    setIsLoading(false);
  }

  bulkDownloader({
    startDate,
    endDate,
    driverData,
    zipPrefix: `${t('report.bulk_report')}`,
    setIsLoading,
    processDateCallback: async ({ dateForFile, hubId, hubName }) => {
      const deliveryDateObj = parseDate(dateForFile);
      const startD = new Date(deliveryDateObj);
      startD.setHours(0, 0, 0, 0);
      const endD = new Date(deliveryDateObj);
      endD.setHours(23, 59, 59, 999);

      const timeFromTasks = toApiDateString(startD);
      const timeToTasks = toApiDateString(endD);

      const allTasks = await getTasks({
        hubId,
        status: 'DONE,ONGOING',
        timeFrom: timeFromTasks,
        timeTo: timeToTasks,
        timeBy: 'startTime',
      });

      if (isEmpty(allTasks)) return null;

      const dates = [];
      allTasks.forEach((task) => {
        if (task.createdFrom === 'API' && task.createdTime) {
          const d = new Date(task.createdTime);
          d.setHours(d.getHours() + 7);
          dates.push(d.toISOString().split('T')[0]);
        }
      });

      let targetRoutingStr;
      if (dates.length > 0) {
        const modeMap = {};
        let maxEl = dates[0],
          maxCount = 1;
        for (const d of dates) {
          modeMap[d] = (modeMap[d] || 0) + 1;
          if (modeMap[d] > maxCount) {
            maxEl = d;
            maxCount = modeMap[d];
          }
        }
        targetRoutingStr = maxEl;
      } else {
        const targetRoutingDateObj = new Date(deliveryDateObj);
        targetRoutingDateObj.setDate(targetRoutingDateObj.getDate() - 1);
        if (targetRoutingDateObj.getDay() === 0) {
          targetRoutingDateObj.setDate(targetRoutingDateObj.getDate() - 1);
        }
        targetRoutingStr = formatDateUniversal(targetRoutingDateObj);
      }

      const summaryPayload = {
        dateFrom: `${targetRoutingStr} 00:00:00`,
        dateTo: `${targetRoutingStr} 23:59:59`,
        hubId,
      };

      const { timeFrom: timeFromHistories, timeTo: timeToHistories } =
        calculateStartFinishDates(dateForFile);

      const [filteredResults, locationHistoriesRes] = await Promise.all([
        getResultsSummary(summaryPayload),
        getLocationHistories({
          timeFrom: timeFromHistories,
          timeTo: timeToHistories,
          startFinish: 'true',
          timeBy: 'createdTime',
        }),
      ]);

      const allApiData = locationHistoriesRes?.tasks?.data || [];
      const { timeDataObjects } = convertLocationHistories(
        allApiData || [],
        driverData,
        dateForFile
      );
      const filteredTimeData = timeDataObjects.filter(
        (item) => !isEmpty(item.startTimeFmt) && !isEmpty(item.finishTimeFmt)
      );
      const hasPendingGR = hubsMap[String(hubId)] || false;
      if (!isEmpty(filteredResults) && !isEmpty(allTasks) && !isEmpty(filteredTimeData)) {
        return await generateAutoReportWorkbook({
          driverData,
          filteredResults,
          allTasks,
          timeData: timeDataObjects,
          mappingsObj,
          vehicleTypes,
          targetRoutingStr,
          selectedDateString: dateForFile,
          hubLabel: hubName,
          hasPendingGR,
          t,
        });
      }
      return null;
    },
    t,
  });
};

export const handleManualDownload = async ({
  selectedLocation,
  selectedLocationName,
  selectedDate,
  selectedDateString,
  isCustomRouting,
  routingDate,
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
    await driversCheck(selectedLocation, t);
    setIsLoading(true);

    const { storedLocationAcronym } = getLocalStorage();
    const hubLabel = storedLocationAcronym || selectedLocationName;

    let targetRoutingDateObj;
    if (isCustomRouting) {
      if (!routingDate) throw new Error(t('common.invalid_date'));
      targetRoutingDateObj = new Date(routingDate);
    } else {
      if (!selectedDate) throw new Error(t('common.invalid_date'));
      targetRoutingDateObj = new Date(selectedDate);
      targetRoutingDateObj.setDate(targetRoutingDateObj.getDate() - 1);
      if (targetRoutingDateObj.getDay() === 0)
        targetRoutingDateObj.setDate(targetRoutingDateObj.getDate() - 1);
    }
    const targetRoutingStr = formatDateUniversal(targetRoutingDateObj);

    const routingBuffers = await Promise.all(
      selectedRoutingFiles.map((file) => file.arrayBuffer())
    );
    const deliveryBuffers = await Promise.all(
      selectedDeliveryFiles.map((file) => file.arrayBuffer())
    );

    const extractedStartDate = getManualDate('starttime', deliveryBuffers, selectedDateString);
    const { timeFrom, timeTo } = calculateStartFinishDates(extractedStartDate);
    const [{ vehicleTypes, mappingsObj }, [hubsData, locationHistoriesRes]] = await Promise.all([
      fetchVehicleMetadata(),
      Promise.all([
        getDriverData(selectedLocation),
        getLocationHistories({
          timeFrom,
          timeTo,
          startFinish: 'true',
          timeBy: 'createdTime',
        }),
      ]),
    ]);

    const allApiData = locationHistoriesRes?.tasks?.data || [];
    const { timeDataObjects } = convertLocationHistories(
      allApiData || [],
      driverData,
      extractedStartDate
    );
    const activeHub = (hubsData || []).find(
      (h) => String(h._id || h.id) === String(selectedLocation)
    );
    const hasPendingGR = activeHub ? activeHub.hasPendingGR : false;
    const { wb, excelFileName } = await generateManualReportWorkbook({
      routingBuffers,
      deliveryBuffers,
      driverData,
      timeData: timeDataObjects,
      mappingsObj,
      vehicleTypes,
      targetRoutingStr: getManualDate('assignedtime', deliveryBuffers, targetRoutingStr),
      selectedDateString: extractedStartDate,
      hubLabel,
      hasPendingGR,
      t,
    });

    XLSX.writeFile(wb, excelFileName);
    toastSuccess(t('common.toast.success'));
    setIsModalOpen(false);
    setSelectedRoutingFiles([]);
    setSelectedDeliveryFiles([]);
  } catch (err) {
    toastError(err.message || String(err));
  } finally {
    setIsLoading(false);
  }
};

/* ============================================================
 * KPI section
 * ============================================================ */

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

  const targetRoutingDateObj = new Date(targetDateObj);
  targetRoutingDateObj.setDate(
    targetRoutingDateObj.getDate() - (targetRoutingDateObj.getDay() === 1 ? 2 : 1)
  );

  const [tasks, rawResults, histories] = await Promise.all([
    getTasks({
      hubId: selectedHub.id,
      status: 'DONE,ONGOING',
      timeFrom,
      timeTo,
      timeBy: 'startTime',
    }),
    getResultsSummary({
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
    zipPrefix: 'Bulk KPI',
    setIsLoading,
    processDateCallback: async ({ dateObj }) => {
      const { wb, fileName, hasError } = await processSingleKpiDate(dateObj, drivers, selectedHub);
      if (hasError) toastWarning(`Data tidak lengkap untuk ${formatDateUniversal(dateObj)}`);
      return { wb, excelFileName: fileName };
    },
    t,
  });
};

/* ============================================================
 * Custom section
 * ============================================================ */

const getReportDates = (start, end) => {
  const localStart = new Date(start);
  localStart.setHours(0, 0, 0, 0);

  const validEndDate = end ? new Date(end) : new Date(start);
  validEndDate.setHours(23, 59, 59, 999);

  const timeFromUtc = toApiDateString(localStart);
  const timeToUtc = toApiDateString(validEndDate);

  const startString = formatDateUniversal(localStart);
  const endString = formatDateUniversal(validEndDate);

  const { timeFrom: locTimeFrom } = calculateStartFinishDates(startString);
  const { timeTo: locTimeTo } = calculateStartFinishDates(endString);

  return { timeFromUtc, timeToUtc, locTimeFrom, locTimeTo, selectedDateString: startString };
};

export const processTaskRoutingReport = async (storedLocation, datesToProcess, locationName, t) => {
  const driverData = await getDriverData(storedLocation);
  const hubsList = getCachedHubs() || [];
  const activeHub = hubsList.find((h) => h._id === storedLocation);
  const hubCoordsStr =
    activeHub?.lat && activeHub?.lng ? `${activeHub.lat},${activeHub.lng}` : null;

  const generatedFiles = [];

  for (const date of datesToProcess) {
    const { timeFromUtc, timeToUtc, locTimeFrom, locTimeTo, selectedDateString } = getReportDates(
      date,
      date
    );

    const [tasks, locHistories] = await Promise.all([
      getTasks({
        hubId: storedLocation,
        status: 'DONE,ONGOING',
        timeFrom: timeFromUtc,
        timeTo: timeToUtc,
        timeBy: 'startTime',
        isNeedFields: false,
      }),
      getLocationHistories({
        timeFrom: locTimeFrom,
        timeTo: locTimeTo,
        startFinish: 'true',
        timeBy: 'createdTime',
      }),
    ]);

    const tasksData = !isEmpty(tasks) && Array.isArray(tasks) ? tasks : tasks?.data || [];
    if (isEmpty(tasksData)) continue;

    const uniqueRoutingIds = [
      ...new Set(tasksData.map((task) => task.routingResultId).filter(Boolean)),
    ];

    const routingResults = await Promise.all(uniqueRoutingIds.map((id) => getResult(id)));
    const routingMap = buildRoutingMap(routingResults);

    const timeMap = buildSyncTimeMap(locHistories, driverData, selectedDateString);
    const groupedData = groupTasksByDriver(tasksData);

    const wb = generateTaskDetailWorkbook(
      groupedData,
      timeMap,
      routingMap,
      hubCoordsStr,
      taskHeaders,
      taskKeyMapping
    );

    const dateStr = formatDateUniversal(date, 'DD.MM.YYYY');
    const fileName = `${t('report.task_routing')} - ${dateStr} - ${locationName}.xlsx`;
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

    generatedFiles.push({ fileName, wb, wbout });
  }

  return generatedFiles;
};

export const processTaskManualReport = async (storedLocation, datesToProcess, locationName, t) => {
  const generatedFiles = [];

  for (const date of datesToProcess) {
    const { timeFromUtc, timeToUtc } = getReportDates(date, date);

    const tasks = await getTasks({
      hubId: storedLocation,
      status: 'DONE,ONGOING',
      timeFrom: timeFromUtc,
      timeTo: timeToUtc,
      timeBy: 'startTime',
      isNeedFields: false,
    });

    const tasksData = !isEmpty(tasks) && Array.isArray(tasks) ? tasks : tasks?.data || [];
    if (isEmpty(tasksData)) continue;

    const uniqueRoutingIds = [
      ...new Set(tasksData.map((task) => task.routingResultId).filter(Boolean)),
    ];

    const historiesRes =
      uniqueRoutingIds.length > 0 ? await getResultHistories(uniqueRoutingIds) : [];

    const overrideTaskMap = new Map();
    (historiesRes || []).forEach((item) => {
      (item.history || []).forEach((h) => {
        ['move', 'dropped', 'switch', 'change', 'manual'].forEach((key) => {
          (h[key]?.data || []).forEach((m) => {
            const ver = Number(m.version) || 0;

            let targetVisits = m.visits || [];
            if (key === 'change' && m.description) {
              if (m.description.toLowerCase().startsWith('visit ')) {
                const specific = targetVisits.filter(
                  (v) => v.visitName && m.description.includes(v.visitName)
                );
                if (specific.length > 0) targetVisits = specific;
              }
            }

            targetVisits.forEach((v) => {
              if (v.visitId && v.visitId.includes('-')) {
                const tId = v.visitId.substring(v.visitId.indexOf('-') + 1);
                if (!overrideTaskMap.has(tId)) overrideTaskMap.set(tId, []);
                overrideTaskMap.get(tId).push({
                  action: key === 'manual' ? 'manual' : (m.action || key).toLowerCase(),
                  version: ver,
                });
              }
            });
          });
        });
      });
    });

    tasksData.forEach((task) => {
      const taskId = String(task._id || task.id);
      const isUnassigned =
        (!task.eta || task.eta === '-' || task.eta === '') &&
        (!task.etd || task.etd === '-' || task.etd === '') &&
        (!task.routePlannedOrder ||
          task.routePlannedOrder === '-' ||
          task.routePlannedOrder === '');

      if (overrideTaskMap.has(taskId)) {
        task.isManual = true;
        task.manualType = 'Forced Assign';
        const sortedActions = overrideTaskMap
          .get(taskId)
          .sort((a, b) => a.version - b.version)
          .map((item) => item.action);
        task.action = [...new Set(sortedActions)].join(', ');
      } else if (isUnassigned) {
        task.isManual = true;
        task.manualType = 'Manual Assign';
        task.action = '-';
      } else {
        task.isManual = false;
        task.manualType = null;
        task.action = null;
      }
    });

    const groupedData = groupTasksByDriver(tasksData);

    const wb = generateTaskManualDetailWorkbook(
      groupedData,
      taskManualHeaders,
      taskManualKeyMapping,
      historiesRes
    );

    const dateStr = formatDateUniversal(date, 'DD.MM.YYYY');
    const fileName = `${t('report.task_manual')} - ${dateStr} - ${locationName}.xlsx`;
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

    generatedFiles.push({ fileName, wb, wbout });
  }

  return generatedFiles;
};

export const processTaskDateReport = async (storedLocation, datesToProcess, locationName, t) => {
  const generatedFiles = [];
  const drivers = await getDriverData(storedLocation);

  const driverMap = new Map();
  drivers.forEach((d) => {
    if (d.email) {
      driverMap.set(normalizeEmail(d.email), { name: d.name || '-', plat: d.plat || '-' });
    }
  });

  for (const date of datesToProcess) {
    const { timeFromUtc, timeToUtc, locTimeFrom, locTimeTo, selectedDateString } = getReportDates(
      date,
      date
    );

    const [tasks, locHistories] = await Promise.all([
      getTasks({
        hubId: storedLocation,
        status: 'DONE,ONGOING',
        timeFrom: timeFromUtc,
        timeTo: timeToUtc,
        timeBy: 'startTime',
        isNeedFields: false,
      }),
      getLocationHistories({
        timeFrom: locTimeFrom,
        timeTo: locTimeTo,
        startFinish: 'true',
        timeBy: 'createdTime',
      }),
    ]);
    const driverData = await getDriverData(storedLocation);
    const allApiData = locHistories?.tasks?.data || [];
    const { timeDataObjects } = convertLocationHistories(
      allApiData || [],
      driverData,
      selectedDateString
    );
    const filteredTimeData = timeDataObjects.filter(
      (item) => !isEmpty(item.startTimeFmt) && !isEmpty(item.finishTimeFmt)
    );

    const tasksData = !isEmpty(tasks) && Array.isArray(tasks) ? tasks : tasks?.data || [];
    if (isEmpty(tasksData) && isEmpty(filteredTimeData)) {
      throw new Error(t('common.no_data'));
    }

    const sheetData = [taskDateHeaders];

    const parsedRows = tasksData.map((task) => {
      const { name, id, location, invoiceNumber } = parseCustomerString(task.customerOrder);
      const arrivalSource = task.klikJikaSudahSampai || task.klikJikaAndaSudahSampai;
      const doneSource = task.page3DoneTime || task.doneTime;
      const flow = task.flow || '-';
      const created = task.createdTime ? formatUTC7(task.createdTime, 'DD/MM/YYYY HH:mm') : '-';
      const arrived = arrivalSource ? formatUTC7(arrivalSource, 'DD/MM/YYYY HH:mm') : '-';
      const assigned = task.assignedTime ? formatUTC7(task.assignedTime, 'DD/MM/YYYY HH:mm') : '-';
      const completed = doneSource ? formatUTC7(doneSource, 'DD/MM/YYYY HH:mm') : '-';
      let serviceLevel = '-';
      let startTrip = null;
      let driverName = '-';
      let licenseNumber = '-';
      if (task.createdTime && doneSource) {
        const diff = calculateMinuteDifference(task.createdTime, doneSource);
        if (diff !== null) {
          const days = Math.ceil(diff / 1440) || 1;
          serviceLevel = `${days}`;
        }
      }

      const assigneeArray = task.assignee || [];
      const assigneeEmail = Array.isArray(assigneeArray) ? assigneeArray[0] : assigneeArray;

      if (assigneeEmail) {
        const driverHistory = filteredTimeData.find((item) => item.email === assigneeEmail);
        const timeDriver =
          driverHistory?.startDate && driverHistory?.startTimeFmt
            ? `${driverHistory.startDate} ${driverHistory.startTimeFmt}`
            : '-';

        startTrip = !isEmpty(timeDriver)
          ? formatDateUniversal(timeDriver.replace(/-/g, '/'), 'DD/MM/YYYY HH:mm')
          : '-';

        const d = driverMap.get(normalizeEmail(assigneeEmail));
        if (d) {
          driverName = d.name;
          licenseNumber = getBasePlate(d.plat);
        }
      }

      return {
        row: [
          flow,
          driverName,
          licenseNumber,
          name || '-',
          id || '-',
          location || '-',
          invoiceNumber || '-',
          created,
          assigned,
          startTrip,
          arrived,
          completed,
          serviceLevel,
        ],
        driverName,
        rawCompleted: task.doneTime || '',
      };
    });

    parsedRows.sort((a, b) => {
      const driverCmp = a.driverName.localeCompare(b.driverName);
      if (driverCmp !== 0) return driverCmp;
      return a.rawCompleted.localeCompare(b.rawCompleted);
    });
    parsedRows.forEach((item) => sheetData.push(item.row));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = 0; R <= range.e.r; ++R) {
      for (let C = 0; C <= range.e.c; ++C) {
        const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
        if (ws[cell_address]) {
          if (R === 0) {
            ws[cell_address].s = {
              font: { bold: true, color: { rgb: 'FFFFFF' } },
              fill: { patternType: 'solid', fgColor: { rgb: '0369A1' } },
              alignment: { horizontal: 'center', vertical: 'center' },
            };

            if (C === 12) {
              ws[cell_address].c = [{ a: 'System', t: 'Completed Time - Created Time' }];
            }
          } else {
            const isLeft = C === 1 || C === 3 || C === 6;
            ws[cell_address].s = {
              alignment: { horizontal: isLeft ? 'left' : 'center', vertical: 'center' },
            };
          }
        }
      }
    }
    ws['!cols'] = taskDateHeaders.map(() => ({ wch: 20 }));

    XLSX.utils.book_append_sheet(wb, ws, 'Task Date');

    const dateStr = formatDateUniversal(date, 'DD.MM.YYYY');
    const fileName = `${t('report.task_date')} - ${dateStr} - ${locationName}.xlsx`;
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

    generatedFiles.push({ fileName, wb, wbout });
  }

  return generatedFiles;
};
