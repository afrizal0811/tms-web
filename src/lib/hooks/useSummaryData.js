import { useLanguage } from '@/context/LanguageContext';
import {
  getHubs,
  getLocationHistories,
  getResultHistories,
  getResultsSummary,
  getTasks,
  getVehicleMappings,
  getVehicleTypes,
} from '@/lib/api';
import { calculateMasterTruckStorage, getDriverData } from '@/lib/driverData';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { generateSummaryDataPreview } from '@/lib/reportGenerators/summary/summaryReport';
import { toastError } from '@/lib/toast';
import {
  formatDateUniversal,
  formatUTC7,
  getBasePlate,
  getDeliveryDateFromRouting,
  parseCustomerString,
  toApiDateString,
} from '@/lib/utils';
import { useCallback, useEffect, useRef, useState } from 'react';

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

const cleanPlat = (str) => (str || '').replace(/\s+/g, '').toLowerCase();

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

      const taskToRoutingDate = new Map();
      (allResults || []).forEach((res) => {
        const rDate = getDeliveryDateFromRouting(res.createdTime);
        if (!rDate) return;
        const mapTrips = (trips) => {
          (trips || []).forEach((trip) => {
            if (trip.visitId && trip.visitId.includes('-')) {
              taskToRoutingDate.set(trip.visitId.substring(trip.visitId.indexOf('-') + 1), rDate);
            } else if (trip.visitName) {
              taskToRoutingDate.set(trip.visitName, rDate);
            }
          });
        };
        if (res.result?.routing) res.result.routing.forEach((r) => mapTrips(r.trips));
        if (res.result?.dropped) mapTrips(res.result.dropped);
      });

      const tempMetrics = {};
      const uniqueVehicles = {};

      const initDate = (dateKey) => {
        if (!tempMetrics[dateKey]) {
          tempMetrics[dateKey] = {
            actual_tasks_count: 0,
            routingNames: new Set(),
            dry: {
              dp: 0,
              dt_total: 0,
              dt_sum: 0,
              dt_hist: 0,
              ma_hist: 0,
              rt: 0,
              co: 0,
              pr: 0,
              tv: 0,
              dp_tasks: [],
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
              ma_hist: 0,
              rt: 0,
              co: 0,
              pr: 0,
              tv: 0,
              dp_tasks: [],
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
              ma_hist: 0,
              rt: 0,
              co: 0,
              pr: 0,
              tv: 0,
              dp_tasks: [],
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

      const groupedByEmail = {};
      (fetchedDrivers || []).forEach((d) => {
        const email = (d.email || '').toLowerCase().trim();
        if (email) {
          if (!groupedByEmail[email]) groupedByEmail[email] = [];
          groupedByEmail[email].push(d);
        }
      });

      const driverMapStorage = {};
      const conditionalPlates = new Set();

      if (Array.isArray(fetchedDrivers)) {
        fetchedDrivers.forEach((d) => {
          if (d.email) driverMapStorage[d.email.toLowerCase()] = (d.storage || '').toUpperCase();

          const email = (d.email || '').toLowerCase().trim();
          let isConditional = false;

          if (email && groupedByEmail[email]) {
            const group = groupedByEmail[email];
            if (group.length > 1) {
              const spaceCount = (d.plat || '').trim().split(' ').length - 1;
              const minSpaces = Math.min(
                ...group.map((v) => (v.plat || '').trim().split(' ').length - 1)
              );

              if (spaceCount > minSpaces && spaceCount > 2) {
                isConditional = true;
              }
            }
          }

          if (isConditional) {
            if (d.plat) {
              conditionalPlates.add(cleanPlat(d.plat));
            }
          }
        });
      }

      if (allTasks && Array.isArray(allTasks)) {
        allTasks.forEach((task) => {
          const dateKey =
            formatUTC7(task.startTime, 'YYYY-MM-DD') || formatUTC7(task.doneTime, 'YYYY-MM-DD');
          if (!dateKey) return;

          initDate(dateKey);

          tempMetrics[dateKey].actual_tasks_count =
            (tempMetrics[dateKey].actual_tasks_count || 0) + 1;

          const typeRaw = (task.typeStorage || '').toUpperCase();
          let type = typeRaw.includes('FROZEN')
            ? 'frozen'
            : typeRaw.includes('DRY')
              ? 'dry'
              : 'unknown';

          const sDeliv = task.statusDelivery;
          const statusArr = Array.isArray(sDeliv) ? sDeliv : [sDeliv];

          if (statusArr.some((s) => s === 'PENDING')) {
            tempMetrics[dateKey][type].rt += 1;
            tempMetrics[dateKey][type].rt_tasks.push(task);
          } else if (!hasPendingGR && statusArr.some((s) => s === 'PENDING GR')) {
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
        const dateKey = getDeliveryDateFromRouting(res.createdTime);
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
      });

      try {
        if (resultIdsToFetch.length > 0) {
          const batchData = await fetchWithTracker(
            () => getResultHistories(resultIdsToFetch),
            'Batch Histories'
          );

          (batchData || []).forEach((item) => {
            const originalRes = resultMap.get(item.resultId);
            if (!originalRes || !item.history || !item.history[0]) return;
            const dateKey = getDeliveryDateFromRouting(originalRes.createdTime);
            if (!dateKey) return;

            const { manual } = item.history[0];
            let histDry = 0;
            let histFrozen = 0;
            let histMaDry = 0;
            let histMaFrozen = 0;

            (manual?.data || []).forEach((h) => {
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
                  histMaFrozen += 1;
                  if (tempMetrics[dateKey]) {
                    tempMetrics[dateKey].frozen.dt_tasks.push(taskDetail);
                    tempMetrics[dateKey].frozen.ma_tasks.push(taskDetail);
                  }
                } else {
                  histDry += 1;
                  histMaDry += 1;
                  if (tempMetrics[dateKey]) {
                    tempMetrics[dateKey].dry.dt_tasks.push(taskDetail);
                    tempMetrics[dateKey].dry.ma_tasks.push(taskDetail);
                  }
                }
              });
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
        toastError(t('common.toast.error', { err: err.message }));
      }

      const routingDateVehicles = {};
      doneResults.forEach((res) => {
        const dateKey = getDeliveryDateFromRouting(res.createdTime);
        if (!dateKey) return;
        if (!routingDateVehicles[dateKey]) routingDateVehicles[dateKey] = new Map();

        if (tempMetrics[dateKey] && res.name) {
          tempMetrics[dateKey].routingNames.add(res.name);
        }

        (res.result?.routing || []).forEach((route) => {
          const validTrips = (route.trips || []).filter((t) => !t.isHub);
          if (validTrips.length === 0) return;

          const rawEmail = (route.assignee || route.email || '').toLowerCase().trim();
          const rawPlate = route.vehicleName || route.vehicleId || route.licensePlate || '';

          const strictBasePlate = rawPlate.replace(/\s*\([^)]*\)/g, '').trim();
          const baseCanonical =
            strictBasePlate.replace(/\s+/g, '').toLowerCase() || `unknown-${Math.random()}`;

          const foundDriver =
            fetchedDrivers.find((d) => (d.email || '').toLowerCase() === rawEmail) ||
            fetchedDrivers.find((d) => {
              const driverClean = (d.plat || '')
                .replace(/\s*\([^)]*\)/g, '')
                .replace(/\s+/g, '')
                .toLowerCase();
              return driverClean === baseCanonical;
            }) ||
            fetchedDrivers.find((d) => cleanPlat(d.plat) === cleanPlat(rawPlate));

          const storage = foundDriver ? (foundDriver.storage || 'DRY').toUpperCase() : 'DRY';
          const driverName = foundDriver ? foundDriver.name : route.assignee || '-';

          const finalPlate = foundDriver
            ? (foundDriver.plat || '').replace(/\s*\([^)]*\)/g, '').trim()
            : strictBasePlate;
          const type = storage.includes('FROZEN') ? 'frozen' : 'dry';

          if (tempMetrics[dateKey] && tempMetrics[dateKey][type]) {
            validTrips.forEach((trip) => {
              const taskDetail = getTaskDetails(trip);
              tempMetrics[dateKey][type].dp_tasks.push(taskDetail);
            });
          }

          if (!routingDateVehicles[dateKey].has(baseCanonical)) {
            routingDateVehicles[dateKey].set(baseCanonical, {
              plate: finalPlate,
              driverName,
              storageType: type,
              visits: validTrips.length,
            });
          } else {
            routingDateVehicles[dateKey].get(baseCanonical).visits += validTrips.length;
          }
        });
      });

      Object.keys(tempMetrics).forEach((dateKey) => {
        const dailyVehicles = routingDateVehicles[dateKey];
        if (dailyVehicles) {
          tempMetrics[dateKey].dry.tv = 0;
          tempMetrics[dateKey].frozen.tv = 0;
          tempMetrics[dateKey].dry.dp = 0;
          tempMetrics[dateKey].frozen.dp = 0;
          dailyVehicles.forEach((vh) => {
            const type = vh.storageType.toLowerCase();
            tempMetrics[dateKey][type].tv += 1;
            tempMetrics[dateKey][type].dp += vh.visits;
            tempMetrics[dateKey][type].tv_details.push({
              plate: vh.plate,
              driverName: vh.driverName,
            });
          });

          tempMetrics[dateKey].dry.tv_details.sort((a, b) =>
            (a.driverName || '').localeCompare(b.driverName || '')
          );
          tempMetrics[dateKey].frozen.tv_details.sort((a, b) =>
            (a.driverName || '').localeCompare(b.driverName || '')
          );
        }

        const m = tempMetrics[dateKey];
        m.routingNames = Array.from(m.routingNames || []);

        const distributeTasks = (arrProp) => {
          if (m.unknown[arrProp] && m.unknown[arrProp].length > 0) {
            m.dry[arrProp].push(...m.unknown[arrProp]);
            m.unknown[arrProp] = [];
          }
        };
        ['dp_tasks', 'dt_tasks', 'ma_tasks', 'rt_tasks', 'co_tasks', 'pr_tasks'].forEach(
          distributeTasks
        );

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

        ['ma_hist', 'rt', 'co', 'pr', 'tv'].forEach(distribute);

        ['dry', 'frozen'].forEach((type) => {
          m[type].dt_total = m[type].dt_sum + m[type].dt_hist;
          m[type].ma_total = m[type].ma_hist;
          m[type].va = 0;
          m[type].tvu = m[type].tv + 0;
        });
      });

      const dateKeysSorted = Object.keys(tempMetrics).sort();
      const LOOKBACK_LIMIT = 3;

      dateKeysSorted.forEach((currDateKey) => {
        const currM = tempMetrics[currDateKey];

        const currHasExecutedTasks = (currM.actual_tasks_count || 0) > 0;
        const currHasRouting =
          currM.dry.tv > 0 ||
          currM.frozen.tv > 0 ||
          currM.routingNames.length > 0 ||
          currM.dry.dp > 0 ||
          currM.frozen.dp > 0;

        if (currHasExecutedTasks && !currHasRouting) {
          for (let back = 1; back <= LOOKBACK_LIMIT; back++) {
            const d = new Date(currDateKey);
            d.setUTCDate(d.getUTCDate() - back);
            const prevDateKey = d.toISOString().split('T')[0];

            const prevM = tempMetrics[prevDateKey];
            if (prevM) {
              const prevHasExecutedTasks = (prevM.actual_tasks_count || 0) > 0;
              const prevHasRouting =
                prevM.dry.tv > 0 ||
                prevM.frozen.tv > 0 ||
                prevM.routingNames.length > 0 ||
                prevM.dry.dp > 0 ||
                prevM.frozen.dp > 0;

              if (prevHasRouting && !prevHasExecutedTasks) {
                ['dry', 'frozen'].forEach((type) => {
                  currM[type].dp = prevM[type].dp;
                  currM[type].dp_tasks = [...prevM[type].dp_tasks];

                  currM[type].dt_total = prevM[type].dt_total;
                  currM[type].dt_sum = prevM[type].dt_sum;
                  currM[type].dt_hist = prevM[type].dt_hist;
                  currM[type].dt_tasks = [...prevM[type].dt_tasks];

                  currM[type].ma_total = prevM[type].ma_total;
                  currM[type].ma_hist = prevM[type].ma_hist;
                  currM[type].ma_tasks = [...prevM[type].ma_tasks];

                  currM[type].tv = prevM[type].tv;
                  currM[type].va = prevM[type].va;
                  currM[type].tvu = prevM[type].tvu;
                  currM[type].tv_details = [...prevM[type].tv_details];

                  prevM[type].dp = 0;
                  prevM[type].dp_tasks = [];

                  prevM[type].dt_total = 0;
                  prevM[type].dt_sum = 0;
                  prevM[type].dt_hist = 0;
                  prevM[type].dt_tasks = [];

                  prevM[type].ma_total = 0;
                  prevM[type].ma_hist = 0;
                  prevM[type].ma_tasks = [];

                  prevM[type].tv = 0;
                  prevM[type].va = 0;
                  prevM[type].tvu = 0;
                  prevM[type].tv_details = [];
                });

                prevM.routingNames.forEach((name) => {
                  if (!currM.routingNames.includes(name)) currM.routingNames.push(name);
                });
                prevM.routingNames = [];
                break;
              }
            }
          }
        }
      });

      Object.keys(tempMetrics).forEach((dateKey) => {
        tempMetrics[dateKey].routingNames = Array.from(tempMetrics[dateKey].routingNames || []);
      });

      setTaskSummaryMetrics(tempMetrics);
      setIsCalculatingMetrics(false);
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

      const pDrivers = fetchWithTracker(() => getDriverData(selectedLocation));

      const pTasks = fetchWithTracker(async () => {
        const rawResults = [];
        for (const range of taskRanges) {
          const res = await getTasks({
            hubId: selectedLocation,
            status: 'ONGOING,DONE',
            timeBy: 'startTime',

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
          const res = await getResultsSummary({
            hubId: selectedLocation,
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
            startFinish: 'true',
            timeBy: 'createdTime',
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

      try {
        const [vTypesObj, mapsDB, hubsDB] = await Promise.all([
          getVehicleTypes(),
          getVehicleMappings(),
          getHubs(),
        ]);
        const vTypes = vTypesObj.map((v) => v.name);
        const mapObj = mapsDB.reduce((acc, curr) => {
          acc[curr.plat] = curr.mappedType;
          return acc;
        }, {});

        const uniqueDriversForMT = [];
        const seenBasePlates = new Set();
        (driversRes || []).forEach((d) => {
          if (d.additionalData && d.additionalData.trim() !== '') return;

          const bp = getBasePlate(d.plat).toLowerCase();
          if (bp && !seenBasePlates.has(bp)) {
            seenBasePlates.add(bp);
            uniqueDriversForMT.push(d);
          }
        });

        const calculatedMaster = await calculateMasterTruckStorage(
          uniqueDriversForMT,
          mapObj,
          vTypes
        );
        setMasterTruckData(calculatedMaster);

        const activeHub = hubsDB?.find(
          (h) =>
            String(h._id) === String(selectedLocation) || String(h.id) === String(selectedLocation)
        );
        hasPendingGRValue = activeHub?.hasPendingGR || false;

        if (activeHub && activeHub.lat && (activeHub.lng || activeHub.lon)) {
          setActiveHubLocation({
            lat: parseFloat(activeHub.lat),
            lng: parseFloat(activeHub.lng || activeHub.lon),
            name: activeHub.name || selectedLocationName,
          });
        } else {
          setActiveHubLocation(null);
        }
      } catch (e) {
        toastError(t('common.toast.error', { err: e.message }));
        setMasterTruckData({ Dry: { Total: 0 }, Frozen: { Total: 0 } });
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
        selectedLocation,
        localeCode
      );
      setReportPreview(preview);

      await processTaskSummaryMetrics(
        newRawData.tasks,
        newRawData.results,
        driversRes || [],
        hasPendingGRValue
      );
    } catch (e) {
      toastError(e.message);
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
