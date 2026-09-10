import {
  getLocationHistories,
  getResults,
  getTasks,
  getVehicleMappings,
  getVehicleTypes,
} from '@/lib/api/mileapp';
import { getDriverData } from '@/lib/driverData';
import { getCachedHubs, getLocalStorage } from '@/lib/localStorageHandler';
import { convertLocationHistories } from '@/lib/reportGenerators/helper';
import {
  generateAutoReportWorkbook,
  generateManualReportWorkbook,
} from '@/lib/reportGenerators/reports';
import { toastError, toastSuccess } from '@/lib/toast';
import {
  calculateStartFinishDates,
  formatDateUniversal,
  isEmpty,
  toApiDateString,
} from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import { bulkDownloader, getPreviousRoutingDate } from './help';

const parseDate = (dateStr) => new Date(dateStr.replace(/-/g, '/'));

const detectRoutingDateFromTasks = (allTasks, fallbackBaseDate) => {
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
    return maxEl;
  }

  return formatDateUniversal(getPreviousRoutingDate(fallbackBaseDate));
};

const getHasPendingGR = (hubsData, hubId) => {
  const activeHub = (hubsData || []).find((h) => String(h._id || h.id) === String(hubId));
  return activeHub ? activeHub.hasPendingGR : false;
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
    return fallbackDate;
  }
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
  hubId,
  hubName,
  selectedDate,
  selectedDateString,
  isCustomRouting,
  routingDate,
  driverData,
  setIsLoading,
  t,
}) => {
  try {
    setIsLoading(true);

    if (!selectedDateString) throw new Error(t('common.invalid_date'));

    const timeFromTasks = new Date(`${selectedDateString}T00:00:00`).toISOString();
    const timeToTasks = new Date(`${selectedDateString}T23:59:59`).toISOString();

    const { timeFrom: timeFromHistories, timeTo: timeToHistories } =
      calculateStartFinishDates(selectedDateString);

    const allTasks = await getTasks({
      hubId: hubId,
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
      targetRoutingStr = detectRoutingDateFromTasks(allTasks, selectedDate);
    }

    const summaryPayload = {
      dateFrom: `${targetRoutingStr} 00:00:00`,
      dateTo: `${targetRoutingStr} 23:59:59`,
      hubId: hubId,
    };

    const { storedLocationAcronym } = getLocalStorage();
    const [filteredResults, hubsData, locationHistoriesRes, { vehicleTypes, mappingsObj }] =
      await Promise.all([
        getResults(summaryPayload),
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

    const hasPendingGR = getHasPendingGR(hubsData, hubId);
    const hubLabel = storedLocationAcronym || hubName;

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
  }
};

export const handleBulkDownload = async ({
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
    zipPrefix: `${t('report.daily_report')} (${t('common.bulk')})`,
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

      const targetRoutingStr = detectRoutingDateFromTasks(allTasks, deliveryDateObj);

      const summaryPayload = {
        dateFrom: `${targetRoutingStr} 00:00:00`,
        dateTo: `${targetRoutingStr} 23:59:59`,
        hubId,
      };

      const { timeFrom: timeFromHistories, timeTo: timeToHistories } =
        calculateStartFinishDates(dateForFile);

      const [filteredResults, locationHistoriesRes] = await Promise.all([
        getResults(summaryPayload),
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
  hubId,
  hubName,
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
    setIsLoading(true);

    const { storedLocationAcronym } = getLocalStorage();
    const hubLabel = storedLocationAcronym || hubName;

    let targetRoutingDateObj;
    if (isCustomRouting) {
      if (!routingDate) throw new Error(t('common.invalid_date'));
      targetRoutingDateObj = new Date(routingDate);
    } else {
      if (!selectedDate) throw new Error(t('common.invalid_date'));
      targetRoutingDateObj = getPreviousRoutingDate(selectedDate);
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
        getDriverData(hubId),
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
    const hasPendingGR = getHasPendingGR(hubsData, hubId);
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
