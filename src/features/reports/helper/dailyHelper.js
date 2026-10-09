import {
  getLocationHistories,
  getResults,
  getTasks,
  getVehicleTypes,
  getPendingDetails,
} from '@/lib/api/mileapp';
import { getCachedHubs, getLocalStorage } from '@/lib/localStorageHandler';
import { convertLocationHistories } from '@/lib/reportGenerators/helper';
import {
  parseDeliveryToTasks,
  parseRoutingToResults,
} from '@/lib/reportGenerators/reports/daily/parseManualToApi';
import { generateSummaryWorkbook } from '@/lib/reportGenerators/summary/summaryReport';
import { calculateTaskSummaryMetrics } from '@/lib/reportGenerators/summary/taskSummaryMetrics';
import { toastError, toastSuccess } from '@/lib/toast';
import {
  calculateStartFinishDates,
  formatDateUniversal,
  isEmpty,
  toApiDateString,
} from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import { getPreviousRoutingDate } from './help';
const detectRoutingDateFromTasks = (allTasks, fallbackBaseDate) => {
  const dates = [];
  allTasks.forEach((task) => {
    if (task.createdFrom === 'API' && task.createdTime) {
      const datePart = formatDateUniversal(task.createdTime);
      if (datePart) {
        dates.push(datePart);
      }
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
    return maxEl;
  }

  return formatDateUniversal(getPreviousRoutingDate(fallbackBaseDate));
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
    console.error(e);
    return fallbackDate;
  }
};

export const handleSingleDownload = async ({
  hubName,
  selectedDate,
  selectedDateString,
  isCustomRouting,
  routingDate,
  driverData,
  setIsLoading,
  t,
  isIndonesian,
}) => {
  const localeCode = isIndonesian ? 'id' : 'en';
  try {
    setIsLoading(true);

    if (!selectedDateString) throw new Error(t('common.invalid_date'));

    const timeFromTasks = new Date(`${selectedDateString}T00:00:00`).toISOString();
    const timeToTasks = new Date(`${selectedDateString}T23:59:59`).toISOString();

    const allTasks = await getTasks({
      status: 'DONE,ONGOING',
      timeFrom: timeFromTasks,
      timeTo: timeToTasks,
    });

    if (isEmpty(allTasks)) {
      throw new Error(t('common.no_data'));
    }

    let targetRoutingStr;
    if (isCustomRouting) {
      if (!routingDate) throw new Error(t('common.invalid_date'));
      targetRoutingStr = formatDateUniversal(new Date(routingDate));
    } else {
      targetRoutingStr = detectRoutingDateFromTasks(allTasks, selectedDate);
    }

    const locStartObj = new Date(selectedDateString);
    locStartObj.setDate(locStartObj.getDate() - 3);
    locStartObj.setHours(0, 0, 0, 0);

    const locEndObj = new Date(selectedDateString);
    locEndObj.setDate(locEndObj.getDate() + 2);
    locEndObj.setHours(23, 59, 59, 999);

    const { storedLocationAcronym } = getLocalStorage();
    const [filteredResults, hubsData, locationHistoriesRes] = await Promise.all([
      getResults({
        dateFrom: `${targetRoutingStr} 00:00:00`,
        dateTo: `${targetRoutingStr} 23:59:59`,
      }),
      getCachedHubs(),
      getLocationHistories({
        timeFrom: toApiDateString(locStartObj),
        timeTo: toApiDateString(locEndObj),
      }).catch(() => []),
    ]);

    const singleDateHistories = (locationHistoriesRes || []).filter((item) => {
      return item.startTime?.startsWith(selectedDateString);
    });
    const { timeDataObjects } = convertLocationHistories(singleDateHistories, driverData);
    const filteredTimeData = timeDataObjects.filter(
      (item) => !isEmpty(item.startTimeFmt) && !isEmpty(item.finishTimeFmt)
    );

    if (isEmpty(filteredResults) && isEmpty(allTasks) && isEmpty(filteredTimeData)) {
      throw new Error(t('common.no_data'));
    }

    const hasPendingGR = hubsData.activeHub ? hubsData.activeHub.hasPendingGR : false;
    const hubLabel = storedLocationAcronym || hubName;

    const [pendingDetails, masterTruckData] = await Promise.all([
      getPendingDetails(selectedDateString, selectedDateString).catch(() => []),
      getVehicleTypes(),
    ]);
    const taskSummaryMetrics = await calculateTaskSummaryMetrics({
      allTasks,
      allResults: filteredResults,
      fetchedDrivers: driverData,
      hasPendingGR,
      t,
    });

    const { wb } = await generateSummaryWorkbook(
      driverData,
      allTasks,
      filteredResults,
      singleDateHistories,
      selectedDateString,
      selectedDateString,
      taskSummaryMetrics,
      masterTruckData,
      t,
      localeCode,
      hasPendingGR,
      pendingDetails,
      true
    );

    const baseDailyReport = t('navbar.daily_report');
    const formattedDate = formatDateUniversal(selectedDateString, 'DD.MM.YYYY');
    const singleExcelFileName = `${baseDailyReport} - ${formattedDate} - ${hubLabel}.xlsx`;

    XLSX.writeFile(wb, singleExcelFileName);
    toastSuccess(t('common.toast.success'));
  } catch (err) {
    toastError(t('common.toast.error', { err: err.message }), err);
  } finally {
    setIsLoading(false);
  }
};

export const handleBulkDownload = async ({
  hubName,
  startDate,
  endDate,
  driverData,
  setIsLoading,
  t,
  isIndonesian,
}) => {
  const localeCode = isIndonesian ? 'id' : 'en';
  try {
    setIsLoading(true);

    const startStr = formatDateUniversal(startDate);
    const endStr = formatDateUniversal(endDate);

    const taskStartObj = new Date(startDate);
    taskStartObj.setDate(taskStartObj.getDate() - 4);
    taskStartObj.setHours(0, 0, 0, 0);

    const taskEndObj = new Date(endDate);
    taskEndObj.setDate(taskEndObj.getDate() + 4);
    taskEndObj.setHours(23, 59, 59, 999);

    const routingStartObj = new Date(startDate);
    routingStartObj.setDate(routingStartObj.getDate() - 4);
    routingStartObj.setHours(0, 0, 0, 0);

    const routingEndObj = new Date(endDate);
    routingEndObj.setDate(routingEndObj.getDate() + 2);
    routingEndObj.setHours(23, 59, 59, 999);

    const locStartObj = new Date(startDate);
    locStartObj.setDate(locStartObj.getDate() - 3);
    locStartObj.setHours(0, 0, 0, 0);

    const locEndObj = new Date(endDate);
    locEndObj.setDate(locEndObj.getDate() + 2);
    locEndObj.setHours(23, 59, 59, 999);

    const createDateChunks = (start, end, maxDays) => {
      const chunks = [];
      let curr = new Date(start);
      while (curr <= end) {
        let next = new Date(curr);
        next.setDate(next.getDate() + maxDays - 1);
        next.setHours(23, 59, 59, 999);
        if (next > end) next = new Date(end);
        chunks.push({ from: toApiDateString(curr), to: toApiDateString(next) });
        curr = new Date(next);
        curr.setDate(curr.getDate() + 1);
        curr.setHours(0, 0, 0, 0);
      }
      return chunks;
    };

    const taskRanges = createDateChunks(taskStartObj, taskEndObj, 5);
    const routingRanges = createDateChunks(routingStartObj, routingEndObj, 7);
    const historyRanges = createDateChunks(locStartObj, locEndObj, 7);

    const mergeResults = (resArray) => {
      let merged = [];
      resArray.forEach((res) => {
        if (Array.isArray(res)) merged = [...merged, ...res];
        else if (res?.data) merged = [...merged, ...res.data];
        else if (res?.tasks?.data) merged = [...merged, ...res.tasks.data];
      });
      return merged;
    };

    const pTasks = (async () => {
      const rawResults = [];
      for (const range of taskRanges) {
        const res = await getTasks({
          status: 'ONGOING,DONE',
          timeFrom: range.from,
          timeTo: range.to,
        });
        rawResults.push(res);
      }
      return mergeResults(rawResults);
    })();

    const pRouting = (async () => {
      const rawResults = [];
      for (const range of routingRanges) {
        const res = await getResults({
          routingDateObj: new Date(range.from),
          deliveryDateObj: new Date(range.to),
        });
        rawResults.push(res);
      }
      return mergeResults(rawResults);
    })();

    const pHistory = (async () => {
      const rawResults = [];
      for (const range of historyRanges) {
        const res = await getLocationHistories({ timeFrom: range.from, timeTo: range.to });
        rawResults.push(res);
      }
      return mergeResults(rawResults);
    })();

    const [tasksRes, resultsRes, locRes, hubsDB, masterRes, pendingDetails] = await Promise.all([
      pTasks,
      pRouting,
      pHistory,
      getCachedHubs(),
      getVehicleTypes(),
      getPendingDetails(startStr, endStr).catch(() => []),
    ]);

    const hasPendingGR = hubsDB?.activeHub?.hasPendingGR || false;

    if (isEmpty(tasksRes) && isEmpty(resultsRes)) {
      throw new Error(t('common.no_data'));
    }

    const taskSummaryMetrics = await calculateTaskSummaryMetrics({
      allTasks: tasksRes,
      allResults: resultsRes,
      fetchedDrivers: driverData,
      hasPendingGR,
      t,
    });

    const { wb } = await generateSummaryWorkbook(
      driverData,
      tasksRes,
      resultsRes,
      locRes,
      startStr,
      endStr,
      taskSummaryMetrics,
      masterRes,
      t,
      localeCode,
      hasPendingGR,
      pendingDetails,
      true
    );

    const { storedLocationAcronym } = getLocalStorage();
    const hubLabel = storedLocationAcronym || hubName;
    const baseDailyReport = t('report.daily_report');
    const bulkLabel = t('common.bulk');
    const formattedStart = formatDateUniversal(startStr, 'DD.MM.YYYY');
    const formattedEnd = formatDateUniversal(endStr, 'DD.MM.YYYY');

    const bulkExcelFileName = `${baseDailyReport} (${bulkLabel})- (${formattedStart} - ${formattedEnd}) - ${hubLabel}.xlsx`;
    XLSX.writeFile(wb, bulkExcelFileName);
    toastSuccess(t('common.toast.success'));
  } catch (err) {
    toastError(t('common.toast.error', { err: err.message }), err);
  } finally {
    setIsLoading(false);
  }
};

export const handleManualDownload = async ({
  hubName,
  selectedDateString,
  selectedRoutingFiles,
  selectedDeliveryFiles,
  driverData,
  setIsLoading,
  setIsModalOpen,
  setSelectedRoutingFiles,
  setSelectedDeliveryFiles,
  t,
  isIndonesian,
}) => {
  const localeCode = isIndonesian ? 'id' : 'en';
  try {
    setIsLoading(true);

    const { storedLocationAcronym } = getLocalStorage();
    const hubLabel = storedLocationAcronym || hubName;

    const routingBuffers = await Promise.all(
      selectedRoutingFiles.map((file) => file.arrayBuffer())
    );
    const deliveryBuffers = await Promise.all(
      selectedDeliveryFiles.map((file) => file.arrayBuffer())
    );

    const extractedStartDate = getManualDate('starttime', deliveryBuffers, selectedDateString);
    const { timeFrom, timeTo } = calculateStartFinishDates(extractedStartDate);
    const [vehicleTypes, [hubsData, locationHistoriesRes]] = await Promise.all([
      getVehicleTypes(),
      Promise.all([
        getCachedHubs(),
        getLocationHistories({
          timeFrom,
          timeTo,
        }),
      ]),
    ]);

    const singleDateHistories = (locationHistoriesRes || []).filter((item) => {
      return item.startTime?.startsWith(extractedStartDate);
    });

    const allTasks = await parseDeliveryToTasks(deliveryBuffers);
    const filteredResults = await parseRoutingToResults(
      routingBuffers,
      extractedStartDate,
      allTasks
    );
    const hasPendingGR = hubsData.activeHub ? hubsData.activeHub.hasPendingGR : false;

    const taskSummaryMetrics = await calculateTaskSummaryMetrics({
      allTasks,
      allResults: filteredResults,
      fetchedDrivers: driverData,
      hasPendingGR,
      t,
      isManualMode: true,
    });

    const pendingDetails = await getPendingDetails(extractedStartDate, extractedStartDate).catch(
      () => []
    );

    const { wb } = await generateSummaryWorkbook(
      driverData,
      allTasks,
      filteredResults,
      singleDateHistories,
      extractedStartDate,
      extractedStartDate,
      taskSummaryMetrics,
      vehicleTypes,
      t,
      localeCode,
      hasPendingGR,
      pendingDetails,
      true, // isDailyReport
      true // isManualMode
    );

    const baseDailyReport = t('report.daily_report') || t('navbar.daily_report') || 'Daily Report';
    const formattedDate = formatDateUniversal(extractedStartDate, 'DD.MM.YYYY');
    const excelFileName = `${baseDailyReport} (Manual) - ${formattedDate} - ${hubLabel}.xlsx`;

    XLSX.writeFile(wb, excelFileName);
    toastSuccess(t('common.toast.success'));
    setIsModalOpen(false);
    setSelectedRoutingFiles([]);
    setSelectedDeliveryFiles([]);
  } catch (err) {
    toastError(t('common.toast.error', { err: err.message }), err);
  } finally {
    setIsLoading(false);
  }
};
