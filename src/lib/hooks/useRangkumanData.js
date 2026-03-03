import { useLanguage } from '@/context/LanguageContext';
import {
  getBatchHistories,
  getLocationHistories,
  getResultsSummary,
  getTasks,
} from '@/lib/apiService';
import { LOCATIONS_SHOW_PENDING_GR } from '@/lib/constants';
import { getOrFetchDriverData } from '@/lib/driverDataHelper';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { generateRangkumanDataPreview } from '@/lib/reportGenerators/rangkumanReport';
import { toastError } from '@/lib/toastHelper';
import { formatDateUniversal, formatToApiUtc, parseCustomerString } from '@/lib/utils';
import { useCallback, useEffect, useRef, useState } from 'react';

export const getInitialDate = () => {
  const now = new Date();
  if (now.getDate() > 1) return now;
  const targetDate = new Date(now);
  targetDate.setDate(targetDate.getDate() - 1);
  if (targetDate.getDay() === 0) targetDate.setDate(targetDate.getDate() - 1);
  return targetDate;
};

const getRoutingDateKeyFromDateStr = (dateStr) => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  let offset = 1;
  if (d.getDay() === 1) offset = 2;
  d.setDate(d.getDate() - offset);
  if (d.getDay() === 0) d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const da = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${da}`;
};

const cleanPlat = (str) => (str || '').replace(/\s+/g, '').toLowerCase();

export default function useRangkumanData() {
  const { t, lang } = useLanguage();

  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedLocationName, setSelectedLocationName] = useState('');
  const [selectedDate, setSelectedDate] = useState(getInitialDate());
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

  const [dismissedDots, setDismissedDots] = useState({});
  const fetchStartTimeRef = useRef(null);

  useEffect(() => {
    const { storedLocation, storedLocationName, storedMasterTruck } = getLocalStorage();
    if (typeof window !== 'undefined') {
      if (storedLocation) setSelectedLocation(storedLocation);
      if (storedLocationName) setSelectedLocationName(storedLocationName);
      try {
        if (storedMasterTruck) setMasterTruckData(JSON.parse(storedMasterTruck));
      } catch (e) {
        toastError(e.message);
      }
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

  const wait = (ms) => new Promise((res) => setTimeout(res, ms));

  const fetchWithRetry = useCallback(async (fn, { retries = 3, baseMs = 500 } = {}) => {
    let attempt = 0;
    while (true) {
      try {
        return await fn();
      } catch (err) {
        attempt++;
        const status = err?.response?.status || err?.status || null;
        if (attempt > retries || (status && status >= 400 && status < 500 && status !== 429)) {
          throw err.message;
        }
        await wait(baseMs * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 100));
      }
    }
  }, []);

  const fetchWithTracker = useCallback(async (promiseOrFn, label) => {
    setPendingEndpoints((prev) => [...prev, label]);
    try {
      return typeof promiseOrFn === 'function' ? await promiseOrFn() : await promiseOrFn;
    } finally {
      setPendingEndpoints((prev) => prev.filter((item) => item !== label));
    }
  }, []);

  const processTaskSummaryMetrics = useCallback(
    async (allTasks, allResults, fetchedDrivers) => {
      setIsCalculatingMetrics(true);
      setHistoryProgress(0);
      const tempMetrics = {};
      const uniqueVehicles = {};

      const initDate = (dateKey) => {
        if (!tempMetrics[dateKey]) {
          tempMetrics[dateKey] = {
            dry: {
              dp: 0,
              dt_total: 0,
              dt_sum: 0,
              dt_hist: 0,
              ma_base: 0,
              ma_hist: 0,
              rt: 0,
              co: 0,
              pr: 0,
              tv: 0,
              dt_tasks: [],
              ma_tasks: [],
              rt_tasks: [],
              co_tasks: [],
              pr_tasks: [],
              tv_details: [],
            },
            frozen: {
              dp: 0,
              dt_total: 0,
              dt_sum: 0,
              dt_hist: 0,
              ma_base: 0,
              ma_hist: 0,
              rt: 0,
              co: 0,
              pr: 0,
              tv: 0,
              dt_tasks: [],
              ma_tasks: [],
              rt_tasks: [],
              co_tasks: [],
              pr_tasks: [],
              tv_details: [],
            },
            unknown: {
              dp: 0,
              dt_total: 0,
              dt_sum: 0,
              dt_hist: 0,
              ma_base: 0,
              ma_hist: 0,
              rt: 0,
              co: 0,
              pr: 0,
              tv: 0,
              dt_tasks: [],
              ma_tasks: [],
              rt_tasks: [],
              co_tasks: [],
              pr_tasks: [],
              tv_details: [],
            },
          };
          uniqueVehicles[dateKey] = { dry: new Map(), frozen: new Map() };
        }
      };

      const getTaskDetails = (tripRaw) => {
        const visitId = tripRaw?.visitId || '';

        if (!visitId || !visitId.includes('-')) {
          const rawName = tripRaw?.visitName || '';
          const parsed = parseCustomerString(rawName);
          return {
            customerOrder: rawName,
            customerName: parsed.name || 'Tidak Diketahui',
            flow: 'DELIVERY',
          };
        }

        const taskId = visitId.substring(visitId.indexOf('-') + 1);
        const f = allTasks.find(
          (t) =>
            String(t._id) === String(taskId) ||
            String(t.id) === String(taskId) ||
            String(t.taskId) === String(taskId)
        );

        if (!f) {
          const rawName = tripRaw?.visitName || '';
          const parsed = parseCustomerString(rawName);
          return {
            customerOrder: rawName,
            customerName: parsed.name || 'Tidak Diketahui',
            flow: 'DELIVERY',
          };
        }

        return f;
      };

      const driverMapStorage = {};
      if (Array.isArray(fetchedDrivers)) {
        fetchedDrivers.forEach((d) => {
          if (d.email) driverMapStorage[d.email.toLowerCase()] = (d.storage || '').toUpperCase();
        });
      }

      const shouldShowPendingGR = LOCATIONS_SHOW_PENDING_GR.some((loc) =>
        (selectedLocationName || '').toLowerCase().includes(loc.toLowerCase())
      );

      if (allTasks && Array.isArray(allTasks)) {
        allTasks.forEach((task) => {
          if (!task.doneTime) return;
          const dateKey = getRoutingDateKeyFromDateStr(task.doneTime.substring(0, 10));
          if (!dateKey) return;
          initDate(dateKey);

          const typeRaw = (task.typeStorage || '').toUpperCase();
          let type = typeRaw.includes('FROZEN')
            ? 'frozen'
            : typeRaw.includes('DRY')
              ? 'dry'
              : 'unknown';

          if (!task.eta || !task.etd || !task.routePlannedOrder) {
            task.isNoRouting = true; // <--- FLAG DITAMBAHKAN DI SINI
            tempMetrics[dateKey][type].ma_base += 1;
            tempMetrics[dateKey][type].ma_tasks.push(task);
          }

          const sDeliv = task.statusDelivery;
          const statusArr = Array.isArray(sDeliv) ? sDeliv : [sDeliv];

          if (statusArr.some((s) => s === 'PENDING')) {
            tempMetrics[dateKey][type].rt += 1;
            tempMetrics[dateKey][type].rt_tasks.push(task);
          } else if (!shouldShowPendingGR && statusArr.some((s) => s === 'PENDING GR')) {
            tempMetrics[dateKey][type].rt += 1;
            tempMetrics[dateKey][type].rt_tasks.push({ ...task, isWrongGR: true });
          }

          if (statusArr.some((s) => s === 'BATAL')) {
            tempMetrics[dateKey][type].co += 1;
            tempMetrics[dateKey][type].co_tasks.push(task);
          }
          if (statusArr.some((s) => s === 'TERIMA SEBAGIAN')) {
            tempMetrics[dateKey][type].pr += 1;
            tempMetrics[dateKey][type].pr_tasks.push(task);
          }
        });
      }

      const doneResults = (allResults || []).filter(
        (item) => item.dispatchStatus?.toLowerCase() === 'done'
      );
      const resultIdsToFetch = [];
      const resultMap = new Map();

      doneResults.forEach((res) => {
        let deliveryDateWib = null;
        let attempts = 0;
        const routingArray = res.result?.routing || [];

        for (const vehicle of routingArray) {
          if (attempts >= 5 || deliveryDateWib) break;
          const trips = vehicle.trips?.filter((t) => !t.isHub) || [];
          for (const trip of trips) {
            if (attempts >= 5 || deliveryDateWib) break;
            const foundTask = getTaskDetails(trip);
            if (foundTask && foundTask.startTime) {
              const stObj = new Date(foundTask.startTime);
              const wibSt = new Date(stObj.getTime() + 7 * 60 * 60 * 1000);
              deliveryDateWib = `${wibSt.getUTCFullYear()}-${(wibSt.getUTCMonth() + 1).toString().padStart(2, '0')}-${wibSt.getUTCDate().toString().padStart(2, '0')}`;
            }
            if (trip.visitId && trip.visitId.includes('-')) attempts++;
          }
        }

        let dateKey;
        if (deliveryDateWib) {
          dateKey = getRoutingDateKeyFromDateStr(deliveryDateWib);
        } else {
          const dObj = new Date(res.createdTime);
          const wibObj = new Date(dObj.getTime() + 7 * 60 * 60 * 1000);
          dateKey = res.createdTime
            ? `${wibObj.getUTCFullYear()}-${(wibObj.getUTCMonth() + 1).toString().padStart(2, '0')}-${wibObj.getUTCDate().toString().padStart(2, '0')}`
            : null;
        }

        if (!dateKey || !res._id) return;
        initDate(dateKey);
        resultIdsToFetch.push(res._id);
        resultMap.set(res._id, res);

        let routingDroppedDry = 0;
        let routingDroppedFrozen = 0;
        (res.result?.dropped || []).forEach((trip) => {
          const tagStr = Array.isArray(trip.tags) ? trip.tags[0] : trip.tags;
          const prefix = typeof tagStr === 'string' ? tagStr.split('-')[0].toUpperCase() : '';
          const taskDetail = getTaskDetails(trip);

          if (prefix === 'FRZ' || prefix === 'FROZEN') {
            routingDroppedFrozen += 1;
            tempMetrics[dateKey].frozen.dt_tasks.push(taskDetail);
          } else {
            routingDroppedDry += 1;
            tempMetrics[dateKey].dry.dt_tasks.push(taskDetail);
          }
        });

        tempMetrics[dateKey].dry.dt_sum += routingDroppedDry;
        tempMetrics[dateKey].frozen.dt_sum += routingDroppedFrozen;

        routingArray.forEach((vehicle) => {
          const assigneeEmail = (vehicle.assignee || '').toLowerCase();
          const dpDriverStorage = driverMapStorage[assigneeEmail] || 'DRY';
          const visitsCount =
            vehicle.summary?.totalVisits ?? (vehicle.trips?.filter((t) => !t.isHub).length || 0);

          if (dpDriverStorage.includes('FROZEN')) tempMetrics[dateKey].frozen.dp += visitsCount;
          else tempMetrics[dateKey].dry.dp += visitsCount;

          const rawPlate =
            vehicle.name ||
            vehicle.vehicleName ||
            vehicle.licensePlate ||
            vehicle.plateNumber ||
            vehicle.assignee ||
            '';
          const vToClean = cleanPlat(rawPlate);

          let matchedDriver = fetchedDrivers.find((d) => {
            const p = cleanPlat(d.plat);
            return p && (vToClean.includes(p) || p.includes(vToClean));
          });

          if (!matchedDriver && vehicle.assignee) {
            matchedDriver = fetchedDrivers.find(
              (d) => d.email && d.email.toLowerCase() === assigneeEmail
            );
          }

          const storage = matchedDriver ? (matchedDriver.storage || '').toUpperCase() : 'DRY';
          const type = storage.includes('FROZEN') ? 'frozen' : 'dry';
          const canonicalPlate = matchedDriver
            ? cleanPlat(matchedDriver.plat)
            : vToClean || `unknown-${Math.random()}`;

          if (canonicalPlate) {
            uniqueVehicles[dateKey][type].set(canonicalPlate, {
              plate: matchedDriver ? matchedDriver.plat : rawPlate || '-',
              driverName: matchedDriver
                ? matchedDriver.name
                : vehicle.assignee || 'Tidak Diketahui',
            });
          }
        });
      });

      try {
        if (resultIdsToFetch.length > 0) {
          const batchData = await fetchWithTracker(
            () => fetchWithRetry(() => getBatchHistories(resultIdsToFetch)),
            'Batch Histories'
          );

          (batchData || []).forEach((item) => {
            const originalRes = resultMap.get(item.resultId);
            if (!originalRes) return;

            let dateKey;
            let histDeliveryDateWib = null;
            let histAttempts = 0;
            const originalRoutingArray = originalRes.result?.routing || [];

            for (const vehicle of originalRoutingArray) {
              if (histAttempts >= 5 || histDeliveryDateWib) break;
              const trips = vehicle.trips?.filter((t) => !t.isHub) || [];
              for (const trip of trips) {
                if (histAttempts >= 5 || histDeliveryDateWib) break;
                const foundTask = getTaskDetails(trip);
                if (foundTask && foundTask.startTime) {
                  const stObj = new Date(foundTask.startTime);
                  const wibSt = new Date(stObj.getTime() + 7 * 60 * 60 * 1000);
                  histDeliveryDateWib = `${wibSt.getUTCFullYear()}-${(wibSt.getUTCMonth() + 1).toString().padStart(2, '0')}-${wibSt.getUTCDate().toString().padStart(2, '0')}`;
                }
                if (trip.visitId && trip.visitId.includes('-')) histAttempts++;
              }
            }

            if (histDeliveryDateWib) {
              dateKey = getRoutingDateKeyFromDateStr(histDeliveryDateWib);
            } else {
              const dObj = new Date(originalRes.createdTime);
              const wibObj = new Date(dObj.getTime() + 7 * 60 * 60 * 1000);
              dateKey = `${wibObj.getUTCFullYear()}-${(wibObj.getUTCMonth() + 1).toString().padStart(2, '0')}-${wibObj.getUTCDate().toString().padStart(2, '0')}`;
            }

            let histDry = 0;
            let histFrozen = 0;
            let histMaDry = 0;
            let histMaFrozen = 0;

            (item.history || []).forEach((h) => {
              const isVehicleFromDropped = h.vehicleFrom?.toLowerCase() === 'dropped';
              const isActionMove = h.action?.toLowerCase() === 'move';

              if (isVehicleFromDropped) {
                const vToClean = cleanPlat(h.vehicleTo);
                const foundDriver = fetchedDrivers.find(
                  (d) => cleanPlat(d.plat) && vToClean.includes(cleanPlat(d.plat))
                );
                const storage = foundDriver ? (foundDriver.storage || '').toUpperCase() : 'DRY';
                const isFrozen = storage.includes('FROZEN');

                (h.visits || []).forEach((v) => {
                  const taskDetail = getTaskDetails(v);

                  if (isFrozen) {
                    histFrozen += 1;
                    if (tempMetrics[dateKey]) tempMetrics[dateKey].frozen.dt_tasks.push(taskDetail);
                    if (isActionMove) {
                      histMaFrozen += 1;
                      if (tempMetrics[dateKey])
                        tempMetrics[dateKey].frozen.ma_tasks.push(taskDetail);
                    }
                  } else {
                    histDry += 1;
                    if (tempMetrics[dateKey]) tempMetrics[dateKey].dry.dt_tasks.push(taskDetail);
                    if (isActionMove) {
                      histMaDry += 1;
                      if (tempMetrics[dateKey]) tempMetrics[dateKey].dry.ma_tasks.push(taskDetail);
                    }
                  }
                });
              }
            });

            if (tempMetrics[dateKey]) {
              tempMetrics[dateKey].dry.dt_hist += histDry;
              tempMetrics[dateKey].frozen.dt_hist += histFrozen;
              tempMetrics[dateKey].dry.ma_hist += histMaDry;
              tempMetrics[dateKey].frozen.ma_hist += histMaFrozen;
            }
          });
        }
      } catch (err) {
        toastError(t('summary.toast.error', { err: err.message }));
      }

      Object.keys(tempMetrics).forEach((dateKey) => {
        if (uniqueVehicles[dateKey]) {
          tempMetrics[dateKey].dry.tv = uniqueVehicles[dateKey].dry.size;
          tempMetrics[dateKey].dry.tv_details = Array.from(
            uniqueVehicles[dateKey].dry.values()
          ).sort((a, b) => (a.driverName || '').localeCompare(b.driverName || ''));

          tempMetrics[dateKey].frozen.tv = uniqueVehicles[dateKey].frozen.size;
          tempMetrics[dateKey].frozen.tv_details = Array.from(
            uniqueVehicles[dateKey].frozen.values()
          ).sort((a, b) => (a.driverName || '').localeCompare(b.driverName || ''));
        }

        const m = tempMetrics[dateKey];

        const distributeTasks = (arrProp) => {
          if (m.unknown[arrProp] && m.unknown[arrProp].length > 0) {
            m.dry[arrProp].push(...m.unknown[arrProp]);
            m.unknown[arrProp] = [];
          }
        };
        ['dt_tasks', 'ma_tasks', 'rt_tasks', 'co_tasks', 'pr_tasks'].forEach(distributeTasks);

        const distribute = (prop) => {
          if (m.unknown[prop] > 0) {
            const totalKnown = m.dry.dp + m.frozen.dp;
            let addDry = m.unknown[prop];
            if (totalKnown > 0) {
              const dryRatio = m.dry.dp / totalKnown;
              addDry = Math.round(m.unknown[prop] * dryRatio);
            }
            m.dry[prop] += addDry;
            m.frozen[prop] += m.unknown[prop] - addDry;
            m.unknown[prop] = 0;
          }
        };

        ['ma_base', 'ma_hist', 'rt', 'co', 'pr', 'tv'].forEach(distribute);

        ['dry', 'frozen'].forEach((type) => {
          m[type].dt_total = m[type].dt_sum + m[type].dt_hist;
          m[type].ma_total = m[type].ma_base + m[type].ma_hist;
          m[type].va = 0;
          m[type].tvu = m[type].tv + 0;
        });
      });

      setTaskSummaryMetrics(tempMetrics);
      setIsCalculatingMetrics(false);
    },
    [t, fetchWithTracker, fetchWithRetry, selectedLocationName]
  );

  const fetchData = useCallback(async () => {
    if (!selectedLocation || !selectedDate) return;

    setIsLoading(true);
    setDismissedDots({});
    setPendingEndpoints([]);
    setTaskSummaryMetrics({});
    setIsCalculatingMetrics(false);
    setHistoryProgress(0);
    fetchStartTimeRef.current = Date.now();

    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();

    try {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      const endDatePlusOne = new Date(endDate);
      endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);

      const startStr = formatDateUniversal(startDate);
      const endStr = formatDateUniversal(endDate);

      const routingStartObj = new Date(startDate);
      routingStartObj.setDate(routingStartObj.getDate() - 4);
      routingStartObj.setHours(0, 0, 0, 0);

      const routingEndObj = new Date(endDate);
      routingEndObj.setDate(routingEndObj.getDate() + 2);
      routingEndObj.setHours(23, 59, 59, 999);

      const bufferDate = new Date(startDate);
      bufferDate.setDate(bufferDate.getDate() - 2);

      const locStartObj = new Date(bufferDate);
      locStartObj.setHours(22, 0, 0, 0);

      const taskStartObj = new Date(bufferDate);
      taskStartObj.setHours(0, 0, 0, 0);

      const finalEndObj = new Date(endDatePlusOne);
      finalEndObj.setHours(23, 59, 59, 999);

      const bufferStartObj = new Date(finalEndObj);
      bufferStartObj.setDate(bufferStartObj.getDate() + 1);
      bufferStartObj.setHours(0, 0, 0, 0);

      const bufferEndObj = new Date(bufferStartObj);
      bufferEndObj.setDate(bufferEndObj.getDate() + 4);
      bufferEndObj.setHours(23, 59, 59, 999);

      const midDateObj = new Date(year, month, 15);
      const midNextObj = new Date(year, month, 16);
      midDateObj.setHours(23, 59, 59, 999);
      midNextObj.setHours(0, 0, 0, 0);

      const mergeResults = (resArray) => {
        let merged = [];
        resArray.forEach((res) => {
          if (Array.isArray(res)) merged = [...merged, ...res];
          else if (res?.data) merged = [...merged, ...res.data];
        });
        return merged;
      };

      const pDrivers = fetchWithTracker(() => getOrFetchDriverData(selectedLocation), 'Drivers');

      const taskRanges = [
        { from: formatToApiUtc(taskStartObj), to: formatToApiUtc(midDateObj) },
        { from: formatToApiUtc(midNextObj), to: formatToApiUtc(finalEndObj) },
        { from: formatToApiUtc(bufferStartObj), to: formatToApiUtc(bufferEndObj) },
      ];

      const routingRanges = [
        { from: formatToApiUtc(routingStartObj), to: formatToApiUtc(midDateObj) },
        { from: formatToApiUtc(midNextObj), to: formatToApiUtc(routingEndObj) },
      ];

      const historyRanges = [
        { from: formatToApiUtc(locStartObj), to: formatToApiUtc(midDateObj) },
        { from: formatToApiUtc(midNextObj), to: formatToApiUtc(finalEndObj) },
      ];

      const pTasks = fetchWithTracker(async () => {
        const results = await Promise.all(
          taskRanges.map((range) =>
            fetchWithRetry(() =>
              getTasks({
                hubId: selectedLocation,
                status: 'ONGOING,DONE',
                timeBy: 'startTime',
                limit: 10000,
                timeFrom: range.from,
                timeTo: range.to,
              })
            )
          )
        );
        return mergeResults(results);
      }, 'Tasks');

      const pRouting = fetchWithTracker(async () => {
        const results = await Promise.all(
          routingRanges.map((range) =>
            fetchWithRetry(() =>
              getResultsSummary({
                hubId: selectedLocation,
                limit: 10000,
                dateFrom: range.from,
                dateTo: range.to,
              })
            )
          )
        );
        return mergeResults(results).filter(
          (item) => item.dispatchStatus?.toLowerCase() === 'done'
        );
      }, 'Routing');

      const pHistory = fetchWithTracker(async () => {
        const results = await Promise.all(
          historyRanges.map((range) =>
            fetchWithRetry(() =>
              getLocationHistories({
                limit: 10000,
                startFinish: 'true',
                fields: 'finish,startTime,email,trackedTime,totalDistance',
                timeBy: 'createdTime',
                timeFrom: range.from,
                timeTo: range.to,
              })
            )
          )
        );
        return mergeResults(results);
      }, 'History');

      const [driversRes, tasksRes, resultsRes, locRes] = await Promise.all([
        pDrivers,
        pTasks,
        pRouting,
        pHistory,
      ]);

      setDriverData(driversRes || []);
      const newRawData = {
        tasks: tasksRes || [],
        results: resultsRes || [],
        locations: locRes || [],
      };
      setRawData(newRawData);

      const preview = generateRangkumanDataPreview(
        driversRes || [],
        newRawData.tasks,
        newRawData.results,
        newRawData.locations,
        startStr,
        endStr,
        selectedLocation,
        lang
      );
      setReportPreview(preview);

      await processTaskSummaryMetrics(newRawData.tasks, newRawData.results, driversRes || []);
    } catch (e) {
      toastError(e.message);
      setReportPreview(null);
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedLocation,
    selectedDate,
    fetchWithRetry,
    fetchWithTracker,
    processTaskSummaryMetrics,
    lang,
  ]);

  return {
    selectedLocation,
    selectedLocationName,
    selectedDate,
    setSelectedDate,
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
  };
}
