// File: src/features/rangkuman/RangkumanSummary.js
'use client';

import BodyCard from '@/components/card/BodyCard';
import HeaderCard from '@/components/card/HeaderCard';
import CustomDatePicker from '@/components/CustomDatePicker';
import DownloadButton from '@/components/DownloadButton';
import { getLocationHistories, getResultsSummary, getTasks } from '@/lib/apiService';
import { getOrFetchDriverData } from '@/lib/driverDataHelper';
import {
  generateRangkumanDataPreview,
  generateRangkumanWorkbook,
} from '@/lib/reportGenerators/rangkumanReport';
import { toastError, toastSuccess } from '@/lib/toastHelper';
import { calculateTargetDates, formatDateUniversal, formatToApiUtc } from '@/lib/utils';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx-js-style';

// --- IMPORT TABS ---
import AverageKmTab from './tabs/AverageKmTab';
import PendingReasonsTab from './tabs/PendingReasonsTab';
import PlaceholderTab from './tabs/PlaceholderTab';
import TaskSummaryTab from './tabs/TaskSummaryTab';
import TimeDriverTab from './tabs/TimeDriverTab';
import TruckDetailTab from './tabs/TruckDetailTab';
import TruckUsageTab from './tabs/TruckUsageTab';
// Tab Baru
import TimeROTab from './tabs/TimeROTab';

const getInitialDate = () => {
  const now = new Date();
  if (now.getDate() > 1) {
    return now;
  }
  const targetDate = new Date(now);
  targetDate.setDate(targetDate.getDate() - 1);
  if (targetDate.getDay() === 0) {
    targetDate.setDate(targetDate.getDate() - 1);
  }
  return targetDate;
};

export default function RangkumanSummary() {
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedLocationName, setSelectedLocationName] = useState('');
  const [selectedDate, setSelectedDate] = useState(getInitialDate());
  const [masterTruckData, setMasterTruckData] = useState(null);
  const [driverData, setDriverData] = useState([]);
  const [rawData, setRawData] = useState({
    tasks: [],
    results: [],
    locations: [],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const fetchStartTimeRef = useRef(null);
  const [reportPreview, setReportPreview] = useState(null);

  const [activeTab, setActiveTab] = useState('Task Summary');
  const [pendingEndpoints, setPendingEndpoints] = useState([]);
  const [dismissedDots, setDismissedDots] = useState({});

  const [taskSummaryMetrics, setTaskSummaryMetrics] = useState({});
  const [isCalculatingMetrics, setIsCalculatingMetrics] = useState(false);
  const [historyProgress, setHistoryProgress] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedLocation = localStorage.getItem('userLocation');
      const storedLocationName = localStorage.getItem('userLocationName');
      if (storedLocation) setSelectedLocation(storedLocation);
      if (storedLocationName) setSelectedLocationName(storedLocationName);

      try {
        const storedMaster = localStorage.getItem('masterTruck');
        if (storedMaster) setMasterTruckData(JSON.parse(storedMaster));
      } catch (e) {
        toastError(e);
      }
    }
  }, []);

  useEffect(() => {
    const initial = {};
    [
      'Task Summary',
      'Pending Reasons',
      'Time Driver',
      'Truck Detail',
      'Truck Usage',
      'Average KM',
      'Time RO',
    ].forEach((t) => (initial[t] = false));
    setDismissedDots(initial);
  }, []);

  useEffect(() => {
    if (isLoading) {
      setDismissedDots((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => {
          next[k] = false;
        });
        return next;
      });
    }
  }, [isLoading]);

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
          throw err;
        }
        const backoff = baseMs * Math.pow(2, attempt - 1);
        const jitter = Math.floor(Math.random() * 100);
        await wait(backoff + jitter);
      }
    }
  }, []);

  const fetchWithTracker = useCallback(async (promiseOrFn, label) => {
    setPendingEndpoints((prev) => [...prev, label]);
    try {
      const result = typeof promiseOrFn === 'function' ? await promiseOrFn() : await promiseOrFn;
      return result;
    } finally {
      setPendingEndpoints((prev) => prev.filter((item) => item !== label));
    }
  }, []);

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

  const processTaskSummaryMetrics = async (allTasks, allResults) => {
    setIsCalculatingMetrics(true);
    setHistoryProgress(0);
    const tempMetrics = {};

    const initDate = (dateKey) => {
      if (!tempMetrics[dateKey]) {
        tempMetrics[dateKey] = {
          dry: { dp: 0, dt_hist: 0, dt_sum: 0, ma_base: 0, rt: 0, co: 0, pr: 0, tv: 0 },
          frozen: { dp: 0, dt_hist: 0, dt_sum: 0, ma_base: 0, rt: 0, co: 0, pr: 0, tv: 0 },
          unknown: { dp: 0, dt_hist: 0, dt_sum: 0, ma_base: 0, rt: 0, co: 0, pr: 0, tv: 0 },
        };
      }
    };

    const getTypeFromTags = (tags) => {
      if (!tags) return 'unknown';
      const tagStr = Array.isArray(tags)
        ? tags.join(' ').toUpperCase()
        : String(tags).toUpperCase();
      if (tagStr.includes('FROZEN')) return 'frozen';
      if (tagStr.includes('DRY')) return 'dry';
      return 'unknown';
    };

    const visitTypeMap = new Map();
    if (allResults && Array.isArray(allResults)) {
      allResults.forEach((res) => {
        const routing = res.result?.routing || [];
        const dropped = res.result?.dropped || [];
        routing.forEach((vehicle) => {
          const vTags = vehicle.vehicleTags || [];
          vehicle.trips?.forEach((trip) => {
            if (trip.isHub) return;
            let type = getTypeFromTags(trip.tags);
            if (type === 'unknown') type = getTypeFromTags(vTags);
            if (trip.visitId) visitTypeMap.set(trip.visitId, type);
          });
        });
        dropped.forEach((trip) => {
          if (trip.visitId) visitTypeMap.set(trip.visitId, getTypeFromTags(trip.tags));
        });
      });
    }

    if (allTasks && Array.isArray(allTasks)) {
      allTasks.forEach((task) => {
        if (!task.doneTime) return;
        const deliveryDateStr = task.doneTime.substring(0, 10);
        const dateKey = getRoutingDateKeyFromDateStr(deliveryDateStr);
        if (!dateKey) return;

        initDate(dateKey);
        const typeRaw = (task.typeStorage || '').toUpperCase();
        let type = 'unknown';
        if (typeRaw.includes('FROZEN')) type = 'frozen';
        else if (typeRaw.includes('DRY')) type = 'dry';

        tempMetrics[dateKey][type].dp += 1;
        if (!task.eta || !task.etd || !task.routePlannedOrder)
          tempMetrics[dateKey][type].ma_base += 1;

        const labels = Array.isArray(task.label) ? task.label : [];
        if (labels.some((l) => l === 'PENDING')) tempMetrics[dateKey][type].rt += 1;
        if (labels.some((l) => l === 'BATAL')) tempMetrics[dateKey][type].co += 1;
        if (labels.some((l) => l === 'TERIMA SEBAGIAN')) tempMetrics[dateKey][type].pr += 1;
      });
    }

    const doneResults = (allResults || []).filter(
      (item) => item.dispatchStatus && item.dispatchStatus.toLowerCase() === 'done'
    );

    const resultIdsToFetch = [];
    const resultMap = new Map();

    doneResults.forEach((res) => {
      const dateKey = res.createdTime ? res.createdTime.substring(0, 10) : null;
      if (!dateKey || !res._id) return;
      initDate(dateKey);
      resultIdsToFetch.push(res._id);
      resultMap.set(res._id, res);

      const routing = res.result?.routing || [];
      routing.forEach((v) => {
        tempMetrics[dateKey][getTypeFromTags(v.vehicleTags)].tv += 1;
      });

      const droppedArr = res.result?.dropped || [];
      const droppedCountVal = res.summary?.droppedVisits || 0;
      if (droppedArr.length > 0) {
        droppedArr.forEach((t) => (tempMetrics[dateKey][getTypeFromTags(t.tags)].dt_sum += 1));
      } else if (droppedCountVal > 0) {
        tempMetrics[dateKey].unknown.dt_sum += droppedCountVal;
      }
    });

    try {
      if (resultIdsToFetch.length > 0) {
        const response = await fetch('/api/get-batch-histories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resultIds: resultIdsToFetch }),
        });

        if (response.ok) {
          const json = await response.json();
          const batchData = json.data || [];
          batchData.forEach((item) => {
            const originalRes = resultMap.get(item.resultId);
            if (!originalRes) return;
            const dateKey = originalRes.createdTime.substring(0, 10);
            const historyList = item.history || [];
            historyList.forEach((h) => {
              if (h.vehicleFrom && h.vehicleFrom.toLowerCase() === 'dropped') {
                const visits = h.visits || [];
                visits.forEach((v) => {
                  let type = visitTypeMap.get(v.visitId) || 'unknown';
                  tempMetrics[dateKey][type].dt_hist += 1;
                });
              }
            });
          });
        }
      }
    } catch (err) {
      toastError('Gagal mengambil data history (Batch).');
    }

    Object.keys(tempMetrics).forEach((dateKey) => {
      const m = tempMetrics[dateKey];
      const distribute = (prop) => {
        if (m.unknown[prop] > 0) {
          const totalKnown = m.dry.dp + m.frozen.dp;
          if (totalKnown > 0) {
            const dryRatio = m.dry.dp / totalKnown;
            const addDry = Math.round(m.unknown[prop] * dryRatio);
            const addFrozen = m.unknown[prop] - addDry;
            m.dry[prop] += addDry;
            m.frozen[prop] += addFrozen;
          } else {
            m.dry[prop] += m.unknown[prop];
          }
          m.unknown[prop] = 0;
        }
      };
      ['dp', 'dt_sum', 'dt_hist', 'ma_base', 'rt', 'co', 'pr', 'tv'].forEach((p) => distribute(p));
      ['dry', 'frozen'].forEach((type) => {
        m[type].dt_total = m[type].dt_hist + m[type].dt_sum;
        const maFromDT = Math.max(0, m[type].dt_hist - m[type].dt_sum);
        m[type].ma_total = m[type].ma_base + maFromDT;
        m[type].va = 0;
        m[type].tvu = m[type].tv + 0;
      });
    });

    setTaskSummaryMetrics(tempMetrics);
    setIsCalculatingMetrics(false);
  };

  const fetchData = useCallback(async () => {
    if (!selectedLocation || !selectedDate) return;

    setIsLoading(true);
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
      const endPlusOneStr = formatDateUniversal(endDatePlusOne);

      const { dateFrom: routingStartStr } = calculateTargetDates(startStr);
      const { dateTo: routingEndStr } = calculateTargetDates(endStr);

      const locStartDate = new Date(startDate);
      locStartDate.setDate(locStartDate.getDate() - 1);

      // 1. Buffer Date (H-2)
      const bufferDate = new Date(startDate);
      bufferDate.setDate(bufferDate.getDate() - 2);
      // const bufferStr = formatDateUniversal(bufferDate); // Tidak dipakai stringnya lagi

      // locTimeFrom (Jam 22:00 H-2)
      const locStartObj = new Date(bufferDate);
      locStartObj.setHours(22, 0, 0, 0);
      const locTimeFrom = formatToApiUtc(locStartObj);

      // tasksTimeFrom (Jam 00:00 H-2)
      const taskStartObj = new Date(bufferDate);
      taskStartObj.setHours(0, 0, 0, 0);
      const tasksTimeFrom = formatToApiUtc(taskStartObj);

      // finalTimeTo (Jam 23:59 End Date + 1)
      const finalEndObj = new Date(endDatePlusOne);
      finalEndObj.setHours(23, 59, 59, 999);
      const finalTimeTo = formatToApiUtc(finalEndObj);

      // --- Split Logic ---
      const midDateObj = new Date(year, month, 15);
      const midNextObj = new Date(year, month, 16);

      // splitTimeEnd (Tgl 15 Jam 23:59 UTC) -> Pengganti midDateStr
      midDateObj.setHours(23, 59, 59, 999);
      const splitTimeEnd = formatToApiUtc(midDateObj);

      // splitTimeStart (Tgl 16 Jam 00:00 UTC) -> Pengganti midNextStr
      midNextObj.setHours(0, 0, 0, 0);
      const splitTimeStart = formatToApiUtc(midNextObj);

      // --- PERSIAPAN TIME ROUTING (UTC) ---
      // Kita perlu konversi routingStartStr (YYYY-MM-DD) ke UTC Full Timestamp
      const routingStartObj = new Date(routingStartStr);
      routingStartObj.setHours(0, 0, 0, 0);
      const routingStartUtc = formatToApiUtc(routingStartObj);

      const routingEndObj = new Date(routingEndStr);
      routingEndObj.setHours(23, 59, 59, 999);
      const routingEndUtc = formatToApiUtc(routingEndObj);

      const mergeResults = (resArray) => {
        let merged = [];
        resArray.forEach((res) => {
          if (Array.isArray(res)) merged = [...merged, ...res];
          else if (res?.data) merged = [...merged, ...res.data];
        });
        return merged;
      };

      const pDrivers = fetchWithTracker(() => getOrFetchDriverData(selectedLocation), 'Drivers');

      const pTasks = fetchWithTracker(async () => {
        const [part1, part2] = await Promise.all([
          fetchWithRetry(() =>
            getTasks({
              hubId: selectedLocation,
              status: 'DONE',
              timeBy: 'startTime',
              limit: 10000,
              timeFrom: tasksTimeFrom,
              timeTo: splitTimeEnd,
            })
          ),
          fetchWithRetry(() =>
            getTasks({
              hubId: selectedLocation,
              status: 'DONE',
              timeBy: 'startTime',
              limit: 10000,
              timeFrom: splitTimeStart,
              timeTo: finalTimeTo,
            })
          ),
        ]);
        return mergeResults([part1, part2]);
      }, 'Monthly Tasks (Split)');

      // 3. ROUTING / RESULTS (Split 2 Request)
      // UPDATE: Gunakan variable UTC yang baru (routingStartUtc, splitTimeEnd, dll)
      const pRouting = fetchWithTracker(async () => {
        const [part1, part2] = await Promise.all([
          fetchWithRetry(() =>
            getResultsSummary({
              hubId: selectedLocation,
              limit: 10000,
              dateFrom: routingStartUtc, // Ganti routingStartStr
              dateTo: splitTimeEnd, // Ganti midDateStr
            })
          ),
          fetchWithRetry(() =>
            getResultsSummary({
              hubId: selectedLocation,
              limit: 10000,
              dateFrom: splitTimeStart, // Ganti midNextStr
              dateTo: routingEndUtc, // Ganti routingEndStr
            })
          ),
        ]);
        const combined = mergeResults([part1, part2]);
        return combined.filter((item) => item.dispatchStatus?.toLowerCase() === 'done');
      }, 'Routing (Split)');

      // 4. HISTORY (Split 2 Request)
      const pHistory = fetchWithTracker(async () => {
        const params = {
          limit: 10000,
          startFinish: 'true',
          fields: 'finish,startTime,email,trackedTime,totalDistance',
          timeBy: 'createdTime',
        };
        const [part1, part2] = await Promise.all([
          fetchWithRetry(() =>
            getLocationHistories({
              ...params,
              timeFrom: locTimeFrom,
              timeTo: splitTimeEnd,
            })
          ),
          fetchWithRetry(() =>
            getLocationHistories({
              ...params,
              timeFrom: splitTimeStart,
              timeTo: finalTimeTo,
            })
          ),
        ]);
        return mergeResults([part1, part2]);
      }, 'History (Split)');

      // --- EXECUTE ALL ---
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
        selectedLocation
      );
      setReportPreview(preview);

      processTaskSummaryMetrics(newRawData.tasks, newRawData.results);
    } catch (e) {
      toastError(e.message);
      setReportPreview(null);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line
  }, [selectedLocation, selectedDate, fetchWithRetry, fetchWithTracker]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDateChange = (date) => {
    if (date) setSelectedDate(date);
  };

  const handleDownloadExcel = () => {
    if (!selectedDate) return;
    if (driverData.length === 0) {
      toastError('Data Driver belum siap/kosong.');
      return;
    }
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    try {
      const { wb, excelFileName } = generateRangkumanWorkbook(
        driverData,
        rawData.tasks,
        rawData.results,
        rawData.locations,
        formatDateUniversal(startDate),
        formatDateUniversal(endDate),
        selectedLocationName,
        selectedLocation,
        taskSummaryMetrics,
        masterTruckData || { Dry: { Total: 0 }, Frozen: { Total: 0 } }
      );

      XLSX.writeFile(wb, excelFileName);
      toastSuccess('Rangkuman berhasil di-download!');
    } catch (err) {
      toastError('Gagal membuat Excel: ' + err.message);
    }
  };

  const getPingDot = (tabId) => {
    const dismissed = dismissedDots[tabId];
    if (!isLoading && dismissed) return null;
    return (
      <span className="inline-flex items-center ml-2" aria-hidden>
        {isLoading ? (
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400" />
          </span>
        ) : (
          <span className="inline-flex rounded-full h-2.5 w-2.5 bg-sky-500" />
        )}
      </span>
    );
  };

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    if (!isLoading) {
      setDismissedDots((prev) => ({ ...prev, [tabId]: true }));
    }
  };

  const isTabEmpty = () => {
    if (isLoading) return false;

    // Default check untuk tab yang butuh reportPreview
    if (activeTab !== 'Task Summary' && activeTab !== 'Time RO' && !reportPreview) return true;

    switch (activeTab) {
      case 'Task Summary':
        return Object.keys(taskSummaryMetrics).length === 0;

      case 'Truck Usage': {
        const { dateMap } = reportPreview?.truckUsageData || {};
        return !(
          dateMap &&
          Object.values(dateMap).some(
            (d) => (d.DryTotal || 0) > 0 || (d.FrozenTotal || 0) > 0 || (d.OTV || 0) > 0
          )
        );
      }

      case 'Average KM': {
        const data = reportPreview?.averageKmData;
        const hasRouting = data && data.some((row) => (row.totalKm || 0) > 0);
        return !data || data.length === 0 || !hasRouting;
      }

      case 'Truck Detail': {
        const { dataMatrix, driverEmails } = reportPreview?.truckDetailData || {};
        const hasMatrix =
          dataMatrix && Object.values(dataMatrix).some((d) => d && Object.keys(d).length > 0);
        return !(hasMatrix && driverEmails && driverEmails.length > 0);
      }

      case 'Time Driver': {
        const { dataMatrix, driverEmails } = reportPreview?.timeDriverData || {};
        const hasMatrix =
          dataMatrix && Object.values(dataMatrix).some((d) => d && Object.keys(d).length > 0);
        return !(hasMatrix && driverEmails && driverEmails.length > 0);
      }

      case 'Pending Reasons': {
        // Filter logic duplikasi dari renderContent agar konsisten
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        const startStr = formatDateUniversal(new Date(year, month, 1));
        const filtered = (reportPreview?.pendingReasonsData || []).filter(
          (item) => formatDateUniversal(item.date || item.doneTime || item.createdTime) >= startStr
        );
        return filtered.length === 0;
      }

      case 'Time RO':
        // Cek apakah ada task dari API
        return !(rawData.tasks && rawData.tasks.some((t) => t.createdFrom === 'API'));

      default:
        return false;
    }
  };

  const renderContent = () => {
    const renderTabContent = (Component, props) => (
      <div className="w-full h-[calc(100vh-240px)] flex flex-col">
        <Component {...props} />
      </div>
    );

    // Hitung tanggal untuk props tab (menggunakan format YYYY-MM-DD)
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    // Gunakan formatDateUniversal agar format konsisten 'YYYY-MM-DD'
    const startStr = formatDateUniversal(new Date(year, month, 1));
    const endStr = formatDateUniversal(new Date(year, month + 1, 0));

    switch (activeTab) {
      case 'Task Summary':
        return renderTabContent(TaskSummaryTab, {
          metrics: taskSummaryMetrics,
          isLoading: isCalculatingMetrics,
          progress: historyProgress,
          startDateStr: startStr,
          endDateStr: endStr,
          isHasData: Object.entries(taskSummaryMetrics).length > 0,
        });
      case 'Truck Usage':
        return renderTabContent(TruckUsageTab, { data: reportPreview.truckUsageData });
      case 'Average KM':
        return renderTabContent(AverageKmTab, {
          data: reportPreview.averageKmData,
          monthTotals: reportPreview.monthTotals,
        });
      case 'Truck Detail':
        return renderTabContent(TruckDetailTab, { data: reportPreview.truckDetailData });
      case 'Time Driver':
        return renderTabContent(TimeDriverTab, { data: reportPreview.timeDriverData });
      case 'Pending Reasons':
        const filteredPendingData = (reportPreview?.pendingReasonsData || []).filter(
          (item) => formatDateUniversal(item.date || item.doneTime || item.createdTime) >= startStr
        );
        return renderTabContent(PendingReasonsTab, {
          data: filteredPendingData,
          locationName: selectedLocationName,
        });
      case 'Time RO':
        return renderTabContent(TimeROTab, {
          tasks: rawData.tasks,
          startDateStr: startStr,
          endDateStr: endStr,
        });
      default:
        return <PlaceholderTab tabName={activeTab} />;
    }
  };

  const datePicker = (
    <CustomDatePicker
      selected={selectedDate}
      onChange={handleDateChange}
      isLoading={isLoading}
      dateFormat="MMMM yyyy"
      showMonthYearPicker
      className="md:w-48"
      wrapperClassName="w-full"
    />
  );

  const downloadButton = (
    <DownloadButton
      width="w-full md:w-auto"
      onClick={handleDownloadExcel}
      disabled={isLoading || rawData.tasks.length === 0}
      isLoading={isLoading}
    />
  );

  const headerItems = [
    {
      label: 'Bulan Performa',
      component: datePicker,
      hideLabel: false,
    },
    {
      label: 'Action',
      component: downloadButton,
      hideLabel: true,
    },
  ];

  const tabConfig = [
    { id: 'Time RO', label: 'Time RO' },
    { id: 'Task Summary', label: 'Task Summary' },
    { id: 'Pending Reasons', label: 'Pending Reasons' },
    { id: 'Time Driver', label: 'Time Driver' },
    { id: 'Truck Detail', label: 'Truck Detail' },
    { id: 'Truck Usage', label: 'Truck Usage' },
    { id: 'Average KM', label: 'Average KM of Routing' },
  ];

  const cardTabs = tabConfig.map((t) => ({
    id: t.id,
    label: t.label,
    extraContent: getPingDot(t.id),
  }));

  const subtitle = (
    <>
      Rekapitulasi <span className="font-semibold text-sky-600">performa tugas</span> tiap bulan
    </>
  );

  const warningContent =
    pendingEndpoints.length > 0 ? (
      <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-md text-sm animate-pulse shadow-sm">
        <p>Memproses banyak data di {pendingEndpoints.join(', ')}.</p>
      </div>
    ) : null;

  return (
    <div className="w-full max-w-none px-4 sm:px-6 space-y-6 mb-2">
      <HeaderCard title="Rangkuman" subtitle={subtitle} items={headerItems} />

      <BodyCard
        tabs={cardTabs}
        activeTabId={activeTab}
        onTabClick={handleTabClick}
        isLoading={isLoading}
        longLoadingContent={warningContent}
        isEmpty={isTabEmpty()}
      >
        {isLoading && elapsedTime > 120 && pendingEndpoints.length > 0 && (
          <div className="absolute top-20 left-0 right-0 z-50 flex justify-center pointer-events-none">
            <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-md text-sm animate-pulse">
              <p>Memproses banyak data di {pendingEndpoints.join(', ')}.</p>
            </div>
          </div>
        )}
        {!isLoading && renderContent()}
      </BodyCard>
    </div>
  );
}
