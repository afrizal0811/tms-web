import { useLanguage } from '@/context/LanguageContext';
import {
  getDrivers,
  getHubs,
  getLocationHistories,
  getResults,
  getTasks,
  getVehicleTypes,
} from '@/lib/api/mileapp';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { generateSummaryDataPreview } from '@/lib/reportGenerators/summary/summaryReport';
import { toastError } from '@/lib/toast';
import { formatDateUniversal, toApiDateString } from '@/lib/utils';
import { useCallback, useEffect, useRef, useState } from 'react';
import { calculateTaskSummaryMetrics } from '@/lib/reportGenerators/summary/taskSummaryMetrics';

export const getInitialDateRange = () => {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);

  const start = new Date(now.setDate(diffToMonday - 7));
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 13);
  end.setHours(23, 59, 59, 999);

  return [start, end];
};

export default function useSummaryData() {
  const { t, localeCode } = useLanguage();

  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedLocationName, setSelectedLocationName] = useState('');
  const [dateRange, setDateRange] = useState(getInitialDateRange());
  const [masterTruckData, setMasterTruckData] = useState(null);
  const [driverData, setDriverData] = useState([]);
  const [rawData, setRawData] = useState({ tasks: [], results: [], locations: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [reportPreview, setReportPreview] = useState(null);
  const [pendingEndpoints, setPendingEndpoints] = useState([]);
  const [taskSummaryMetrics, setTaskSummaryMetrics] = useState({});
  const [isCalculatingMetrics, setIsCalculatingMetrics] = useState(false);
  const [historyProgress, setHistoryProgress] = useState(0);
  const [activeHubLocation, setActiveHubLocation] = useState(null);

  const [dismissedDots, setDismissedDots] = useState({});
  const fetchStartTimeRef = useRef(null);

  useEffect(() => {
    const { storedLocation, storedLocationName } = getLocalStorage();
    if (typeof window !== 'undefined') {
      if (storedLocation) setSelectedLocation(storedLocation);
      if (storedLocationName) setSelectedLocationName(storedLocationName);
    }
  }, []);

  useEffect(() => {
    let interval = null;
    if (isLoading) {
      if (!fetchStartTimeRef.current) fetchStartTimeRef.current = Date.now();
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - fetchStartTimeRef.current) / 1000));
      }, 1000);
    } else {
      setElapsedTime(0);
      fetchStartTimeRef.current = null;
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading]);

  const fetchWithTracker = useCallback(async (promiseOrFn, label) => {
    setPendingEndpoints((prev) => [...prev, label]);
    try {
      return typeof promiseOrFn === 'function' ? await promiseOrFn() : await promiseOrFn;
    } finally {
      setPendingEndpoints((prev) => prev.filter((item) => item !== label));
    }
  }, []);

  const processTaskSummaryMetrics = useCallback(
    async (allTasks, allResults, fetchedDrivers, hasPendingGR) => {
      setIsCalculatingMetrics(true);
      setHistoryProgress(0);

      try {
        const metrics = await calculateTaskSummaryMetrics({
          allTasks,
          allResults,
          fetchedDrivers,
          hasPendingGR,
          fetchWithTracker,
          t,
        });
        setTaskSummaryMetrics(metrics);
      } catch (err) {
        toastError(t('common.toast.error', { err: err.message }), err);
      } finally {
        setIsCalculatingMetrics(false);
      }
    },
    [t, fetchWithTracker]
  );

  const fetchData = useCallback(async () => {
    if (!selectedLocation || !dateRange || !dateRange[0] || !dateRange[1]) return;

    setIsLoading(true);
    setDismissedDots({});
    setPendingEndpoints([]);
    setTaskSummaryMetrics({});
    setIsCalculatingMetrics(false);
    setHistoryProgress(0);
    fetchStartTimeRef.current = Date.now();

    try {
      const startDate = new Date(dateRange[0]);
      const endDate = new Date(dateRange[1]);
      endDate.setHours(23, 59, 59, 999);

      const startStr = formatDateUniversal(startDate);
      const endStr = formatDateUniversal(endDate);

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

      const mergeResults = (resArray) => {
        let merged = [];
        resArray.forEach((res) => {
          if (Array.isArray(res)) merged = [...merged, ...res];
          else if (res?.data) merged = [...merged, ...res.data];
          else if (res?.tasks?.data) merged = [...merged, ...res.tasks.data];
        });
        return merged;
      };

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

      const taskRanges = createDateChunks(taskStartObj, taskEndObj, 5);
      const routingRanges = createDateChunks(routingStartObj, routingEndObj, 7);
      const historyRanges = createDateChunks(locStartObj, locEndObj, 7);

      const pDrivers = fetchWithTracker(() => getDrivers());

      const pTasks = fetchWithTracker(async () => {
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
      }, 'Tasks');

      const pRouting = fetchWithTracker(async () => {
        const rawResults = [];
        for (const range of routingRanges) {
          const res = await getResults({
            routingDateObj: new Date(range.from),
            deliveryDateObj: new Date(range.to),
          });

          rawResults.push(res);
        }
        return mergeResults(rawResults);
      }, 'Routing');

      const pHistory = fetchWithTracker(async () => {
        const rawResults = [];
        for (const range of historyRanges) {
          const res = await getLocationHistories({
            timeFrom: range.from,
            timeTo: range.to,
          });
          rawResults.push(res);
        }
        return mergeResults(rawResults);
      }, 'History');

      const [driversRes, tasksRes, resultsRes, locRes] = await Promise.all([
        pDrivers,
        pTasks,
        pRouting,
        pHistory,
      ]);

      setDriverData(driversRes || []);

      let hasPendingGRValue = false;
      let hubCoordsString = null;

      let currentMasterData = { Dry: { Total: 0 }, Frozen: { Total: 0 } };

      try {
        const [hubsDB, masterRes] = await Promise.all([getHubs(), getVehicleTypes()]);

        currentMasterData = masterRes;
        setMasterTruckData(masterRes);

        const activeHub = hubsDB?.activeHub;
        hasPendingGRValue = activeHub?.hasPendingGR || false;

        if (activeHub && activeHub.lat && (activeHub.lng || activeHub.lon)) {
          hubCoordsString = `${activeHub.lat},${activeHub.lng || activeHub.lon}`;
          setActiveHubLocation({
            lat: parseFloat(activeHub.lat),
            lng: parseFloat(activeHub.lng || activeHub.lon),
            name: activeHub.name || selectedLocationName,
          });
        } else {
          setActiveHubLocation(null);
        }
      } catch (e) {
        toastError(t('common.toast.error', { err: e.message }), e);
        setMasterTruckData(currentMasterData);
      }

      const newRawData = {
        tasks: tasksRes || [],
        results: resultsRes || [],
        locations: locRes || [],
      };
      setRawData(newRawData);

      const preview = await generateSummaryDataPreview(
        driversRes || [],
        newRawData.tasks,
        newRawData.results,
        newRawData.locations,
        startStr,
        endStr,
        localeCode,
        hubCoordsString,
        currentMasterData
      );
      setReportPreview(preview);

      await processTaskSummaryMetrics(
        newRawData.tasks,
        newRawData.results,
        driversRes || [],
        hasPendingGRValue
      );
    } catch (e) {
      toastError(t('common.toast.error', { err: e.message }), e);
      setReportPreview(null);
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedLocation,
    dateRange,
    fetchWithTracker,
    processTaskSummaryMetrics,
    localeCode,
    t,
    selectedLocationName,
  ]);

  return {
    selectedLocation,
    selectedLocationName,
    dateRange,
    setDateRange,
    driverData,
    rawData,
    isLoading,
    elapsedTime,
    reportPreview,
    pendingEndpoints,
    taskSummaryMetrics,
    isCalculatingMetrics,
    historyProgress,
    masterTruckData,
    fetchData,
    dismissedDots,
    setDismissedDots,
    activeHubLocation,
  };
}
