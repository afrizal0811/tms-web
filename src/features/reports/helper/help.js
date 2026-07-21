import {
  getLocationHistories,
  getResultsSummary,
  getTasks,
  getVehicleMappings,
  getVehicleTypes,
} from '@/lib/api';
import { getDriverData } from '@/lib/driverData';
import { getCachedHubs, getLocalStorage } from '@/lib/localStorageHandler';
import { generateAutoReportWorkbook, generateManualReportWorkbook } from '@/lib/reportGenerators/';
import { convertLocationHistories } from '@/lib/reportGenerators/helper';
import { toastError, toastSuccess, toastWarning } from '@/lib/toast';
import {
  calculateStartFinishDates,
  formatDateUniversal,
  isDateSunday,
  isEmpty,
  toApiDateString,
} from '@/lib/utils';
import JSZip from 'jszip';
import * as XLSX from 'xlsx-js-style';

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
      limit: 5000,
    });

    if (isEmpty(allTasks)) {
      throw new Error(t('common.toast.error', { err: t('common.no_data') }));
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
      limit: 1000,
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
          limit: 5000,
          startFinish: 'true',
          fields: 'finish,startTime,email,trackedTime,totalDistance',
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
      throw new Error(t('common.toast.error', { err: t('common.no_data') }));
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
        limit: 1000,
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
        limit: 1000,
        hubId,
      };

      const { timeFrom: timeFromHistories, timeTo: timeToHistories } =
        calculateStartFinishDates(dateForFile);

      const [filteredResults, locationHistoriesRes] = await Promise.all([
        getResultsSummary(summaryPayload),
        getLocationHistories({
          timeFrom: timeFromHistories,
          timeTo: timeToHistories,
          limit: 1000,
          startFinish: 'true',
          fields: 'finish,startTime,email,trackedTime,totalDistance',
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
          limit: 5000,
          startFinish: 'true',
          fields: 'finish,startTime,email,trackedTime,totalDistance',
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
