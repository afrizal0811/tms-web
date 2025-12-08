// File: features/rangkuman/RangkumanSummary.js
'use client';

import DownloadButton from '@/components/DownloadButton';
import Spinner from '@/components/Spinner';
import { getLocationHistories, getResultsSummary, getTasks } from '@/lib/apiService';
import { getOrFetchDriverData } from '@/lib/driverDataHelper';
import {
  generateRangkumanDataPreview,
  generateRangkumanWorkbook,
} from '@/lib/reportGenerators/rangkumanReport';
import { toastError, toastSuccess } from '@/lib/toastHelper';
import { formatDate } from '@/lib/utils';
import { useCallback, useEffect, useRef, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import * as XLSX from 'xlsx-js-style';

// --- IMPORT TABS ---
import AverageKmTab from './tabs/AverageKmTab';
import DashboardTab from './tabs/DashboardTab';
import PendingReasonsTab from './tabs/PendingReasonsTab';
import PlaceholderTab from './tabs/PlaceholderTab';
import TaskSummaryTab from './tabs/TaskSummaryTab';
import TimeDriverTab from './tabs/TimeDriverTab';
import TruckDetailTab from './tabs/TruckDetailTab';
import TruckUsageTab from './tabs/TruckUsageTab';

export default function RangkumanSummary() {
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedLocationName, setSelectedLocationName] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [masterTruckData, setMasterTruckData] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [driverData, setDriverData] = useState([]);
  const [rawData, setRawData] = useState({
    tasks: [],
    results: [],
    locations: [],
  });

  const [yearlyTasks, setYearlyTasks] = useState([]);
  const lastFetchedYearRef = useRef(null);
  const lastFetchedLocationRef = useRef(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);

  const [elapsedTime, setElapsedTime] = useState(0);
  const fetchStartTimeRef = useRef(null);
  const [dashboardElapsedTime, setDashboardElapsedTime] = useState(0);
  const dashboardFetchStartRef = useRef(null);

  const [reportPreview, setReportPreview] = useState(null);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [pendingEndpoints, setPendingEndpoints] = useState([]);

  const isDashboard = activeTab === 'Dashboard';
  const [dismissedDots, setDismissedDots] = useState({});

  // --- STATE TASK SUMMARY ---
  const [taskSummaryMetrics, setTaskSummaryMetrics] = useState({});
  const [isCalculatingMetrics, setIsCalculatingMetrics] = useState(false);
  const [historyProgress, setHistoryProgress] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedLocation = localStorage.getItem('userLocation');
      const storedLocationName = localStorage.getItem('userLocationName');
      if (storedLocation) setSelectedLocation(storedLocation);
      if (storedLocationName) setSelectedLocationName(storedLocationName);
    }
  }, []);

  useEffect(() => {
    const initial = {};
    [
      'Dashboard',
      'Task Summary',
      'Pending Reasons',
      'Time Driver',
      'Truck Detail',
      'Truck Usage',
      'Average KM',
    ].forEach((t) => (initial[t] = false));
    setDismissedDots(initial);
  }, []);

  useEffect(() => {
    if (isLoading) {
      setDismissedDots((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => {
          if (k !== 'Dashboard') next[k] = false;
        });
        return next;
      });
    }
  }, [isLoading]);

  useEffect(() => {
    if (isDashboardLoading) {
      setDismissedDots((prev) => ({ ...prev, Dashboard: false }));
    }
  }, [isDashboardLoading]);

  useEffect(() => {
    let interval = null;
    if (isLoading) {
      if (!fetchStartTimeRef.current) fetchStartTimeRef.current = Date.now();
      interval = setInterval(() => {
        const now = Date.now();
        setElapsedTime(Math.floor((now - fetchStartTimeRef.current) / 1000));
      }, 1000);
    } else {
      setElapsedTime(0);
      fetchStartTimeRef.current = null;
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading]);

  useEffect(() => {
    let interval = null;
    if (isDashboardLoading) {
      if (!dashboardFetchStartRef.current) dashboardFetchStartRef.current = Date.now();
      interval = setInterval(() => {
        const now = Date.now();
        setDashboardElapsedTime(Math.floor((now - dashboardFetchStartRef.current) / 1000));
      }, 1000);
    } else {
      setDashboardElapsedTime(0);
      dashboardFetchStartRef.current = null;
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isDashboardLoading]);

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

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
        await wait(baseMs * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 100));
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

  const fetchWithConcurrency = async (items, asyncFn, concurrency) => {
    let index = 0;
    const results = [];
    const executing = [];

    const enqueue = () => {
      if (index === items.length) return Promise.resolve();
      const currIndex = index++;
      const item = items[currIndex];
      const progressPct = Math.round((currIndex / items.length) * 100);
      setHistoryProgress(progressPct);

      const p = Promise.resolve().then(() => asyncFn(item));
      results.push(p);

      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);

      let r = Promise.resolve();
      if (executing.length >= concurrency) {
        r = Promise.race(executing);
      }
      return r.then(() => enqueue());
    };
    return enqueue().then(() => Promise.all(results));
  };

  const fetchYearlyDataSplit = useCallback(
    async (hubId, year) => {
      const quarters = [
        { start: `${year}-01-01 00:00:00`, end: `${year}-03-31 23:59:59`, label: 'Q1' },
        { start: `${year}-04-01 00:00:00`, end: `${year}-06-30 23:59:59`, label: 'Q2' },
        { start: `${year}-07-01 00:00:00`, end: `${year}-09-30 23:59:59`, label: 'Q3' },
        { start: `${year}-10-01 00:00:00`, end: `${year}-12-31 23:59:59`, label: 'Q4' },
      ];
      const all = [];
      for (const q of quarters) {
        const label = `Yearly-${q.label}`;
        try {
          const quarterData = await fetchWithTracker(
            () =>
              fetchWithRetry(
                () =>
                  getTasks({
                    hubId,
                    status: 'DONE',
                    timeFrom: q.start,
                    timeTo: q.end,
                    timeBy: 'doneTime',
                    limit: 25000,
                  }),
                { retries: 3, baseMs: 700 }
              ),
            label
          );
          if (Array.isArray(quarterData) && quarterData.length) {
            all.push(...quarterData);
          }
        } catch (err) {
          console.error(`Failed to fetch ${label}:`, err?.message || err);
        }
      }
      return all;
    },
    [fetchWithRetry, fetchWithTracker]
  );

  const getAdjustedPreviousDate = (baseDate) => {
    const d = new Date(baseDate);
    let offset = 1;
    if (d.getDay() === 1) offset = 2;
    const candidate = new Date(d);
    candidate.setDate(d.getDate() - offset);
    if (candidate.getDay() === 0) candidate.setDate(candidate.getDate() - 1);
    return candidate;
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

  // --- LOGIC BARU: PROCESS TASK SUMMARY METRICS ---
  const processTaskSummaryMetrics = async (allTasks, allResults) => {
    setIsCalculatingMetrics(true);

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

    // 1. MAPPING VISIT ID (Untuk History DT)
    const visitTypeMap = new Map();
    // (Logic mapping sama seperti sebelumnya)
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

    // 2. PROCESS TASKS (DP, RT, CO, PR, MA_Base)
    // (Logic sama seperti sebelumnya)
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
        const labelStr = labels.join(' ').toUpperCase(); // Helper check string inside array

        if (labels.some((l) => l === 'PENDING')) tempMetrics[dateKey][type].rt += 1;
        if (labels.some((l) => l === 'BATAL')) tempMetrics[dateKey][type].co += 1;
        if (labels.some((l) => l === 'TERIMA SEBAGIAN')) tempMetrics[dateKey][type].pr += 1;
      });
    }

    // 3. PROCESS RESULTS (DT & TV) - OPTIMIZED BATCH FETCH
    const doneResults = (allResults || []).filter(
      (item) => item.dispatchStatus && item.dispatchStatus.toLowerCase() === 'done'
    );

    // 3a. Prepare Result IDs & Map for quick lookup
    const resultIdsToFetch = [];
    const resultMap = new Map(); // ID -> ResultObject

    doneResults.forEach((res) => {
      const dateKey = res.createdTime ? res.createdTime.substring(0, 10) : null;
      if (!dateKey || !res._id) return;

      initDate(dateKey);

      // Push ID untuk di-fetch history-nya
      resultIdsToFetch.push(res._id);
      resultMap.set(res._id, res); // Simpan ref objek asli untuk lookup dateKey nanti

      // Hitung TV & DT Summary (Logic Client-Side)
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

    // 3b. BATCH FETCH HISTORY (1x Request Only!)
    try {
      if (resultIdsToFetch.length > 0) {
        // Panggil API Route Internal baru
        const response = await fetch('/api/get-batch-histories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resultIds: resultIdsToFetch }),
        });

        if (response.ok) {
          const json = await response.json();
          const batchData = json.data || []; // Array of { resultId, history: [] }

          // Proses hasil batch
          batchData.forEach((item) => {
            const originalRes = resultMap.get(item.resultId);
            if (!originalRes) return;

            const dateKey = originalRes.createdTime.substring(0, 10);
            const historyList = item.history || [];

            // Hitung DT History
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
        } else {
          console.error('Batch history fetch failed');
        }
      }
    } catch (err) {
      console.error('Error batch fetch:', err);
      toastError('Gagal mengambil data history (Batch).');
    }

    // 4. DISTRIBUSI & FINAL CALC (Sama)
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

  // ==== MAIN FETCH ====
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

    const needFetchYearly =
      lastFetchedYearRef.current !== year || lastFetchedLocationRef.current !== selectedLocation;

    if (needFetchYearly) {
      setIsDashboardLoading(true);
      (async () => {
        try {
          dashboardFetchStartRef.current = Date.now();
          const yearly = await fetchWithTracker(
            () => fetchYearlyDataSplit(selectedLocation, year),
            'Yearly Dashboard'
          );
          setYearlyTasks(yearly);
          lastFetchedYearRef.current = year;
          lastFetchedLocationRef.current = selectedLocation;
        } catch (err) {
          console.error('Dashboard fetch error:', err);
        } finally {
          setIsDashboardLoading(false);
        }
      })();
    }

    try {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      const startStr = formatDate(startDate);
      const endStr = formatDate(endDate);
      const routingStartDate = getAdjustedPreviousDate(startDate);
      const routingEndDate = getAdjustedPreviousDate(endDate);
      const routingStartStr = formatDate(routingStartDate);
      const routingEndStr = formatDate(routingEndDate);

      // Fetch Bulanan
      const monthlyPromises = [
        fetchWithTracker(() => getOrFetchDriverData(selectedLocation), 'Drivers'),
        fetchWithTracker(
          () =>
            fetchWithRetry(
              () =>
                getTasks({
                  hubId: selectedLocation,
                  status: 'DONE',
                  timeFrom: `${startStr} 00:00:00`,
                  timeTo: `${endStr} 23:59:59`,
                  timeBy: 'doneTime',
                  limit: 10000,
                }),
              { retries: 2 }
            ),
          'Monthly Tasks'
        ),
        fetchWithTracker(
          () =>
            fetchWithRetry(
              () =>
                getResultsSummary({
                  hubId: selectedLocation,
                  dateFrom: `${routingStartStr} 00:00:00`,
                  dateTo: `${routingEndStr} 23:59:59`,
                  limit: 10000,
                }),
              { retries: 2 }
            ),
          'Routing'
        ),
        fetchWithTracker(
          () =>
            fetchWithRetry(
              () =>
                getLocationHistories({
                  timeFrom: `${startStr} 23:00:00`,
                  timeTo: `${endStr} 23:59:59`,
                  limit: 10000,
                  startFinish: 'true',
                }),
              { retries: 2 }
            ),
          'History'
        ),
      ];

      const [driversRes, tasksRes, resultsRes, locRes] = await Promise.all(monthlyPromises);
      setDriverData(driversRes || []);

      const filteredResults = (resultsRes || []).filter(
        (item) => item.dispatchStatus?.toLowerCase() === 'done'
      );
      const newRawData = {
        tasks: tasksRes || [],
        results: filteredResults,
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

      // --- HERE IS THE TRIGGER ---
      processTaskSummaryMetrics(newRawData.tasks, newRawData.results);
    } catch (e) {
      console.error(e);
      toastError('Gagal ambil data.');
    } finally {
      setIsLoading(false);
    }
    //eslint-disable-next-line
  }, [selectedLocation, selectedDate, fetchWithRetry, fetchWithTracker, fetchYearlyDataSplit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDateChange = (date) => {
    if (!date) return;
    if (isDashboard) {
      const newDate = new Date(selectedDate);
      newDate.setFullYear(date.getFullYear());
      setSelectedDate(newDate);
    } else {
      setSelectedDate(date);
    }
  };

  const handleDownloadExcel = () => {
    setIsDownloading(true);
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
        formatDate(startDate),
        formatDate(endDate),
        selectedLocationName,
        selectedLocation,
        taskSummaryMetrics, // <--- Kirim Metrics
        masterTruckData || { Dry: { Total: 0 }, Frozen: { Total: 0 } } // <--- Kirim Master Truck
      );

      XLSX.writeFile(wb, excelFileName);
      toastSuccess('Rangkuman berhasil diunduh!');
      setIsDownloading(false);
    } catch (err) {
      console.error(err);
      toastError('Gagal membuat Excel: ' + err.message);
      setIsDownloading(false);
    }
  };

  const tabs = [
    { id: 'Dashboard', label: 'Dashboard' },
    { id: 'Task Summary', label: 'Task Summary' },
    { id: 'Pending Reasons', label: 'Pending Reasons' },
    { id: 'Time Driver', label: 'Time Driver' },
    { id: 'Truck Detail', label: 'Truck Detail' },
    { id: 'Truck Usage', label: 'Truck Usage' },
    { id: 'Average KM', label: 'Average KM of Routing' },
  ];

  const CentralLoading = ({ seconds }) => (
    <div className="h-full flex flex-col items-center justify-center text-gray-500 py-12 space-y-4">
      <Spinner />
      <div className="text-center space-y-1">
        <p className="text-lg font-medium text-slate-700">Sedang memuat data...</p>
        <p className="text-2xl font-mono font-bold text-sky-600">{formatTimer(seconds)}</p>
      </div>
      {seconds > 120 && pendingEndpoints.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-md max-w-md text-center text-sm animate-pulse">
          <p className="font-semibold">Memproses banyak data di {pendingEndpoints.join(', ')}.</p>
          <p>Mohon tunggu.</p>
        </div>
      )}
    </div>
  );

  const getPingDot = (tabId) => {
    const isLoadingTarget = tabId === 'Dashboard' ? isDashboardLoading : isLoading;
    const dismissed = dismissedDots[tabId];
    if (!isLoadingTarget && dismissed) return null;
    return (
      <span className="inline-flex items-center ml-2" aria-hidden>
        {isLoadingTarget ? (
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
    const isLoadingTarget = tabId === 'Dashboard' ? isDashboardLoading : isLoading;
    if (!isLoadingTarget) {
      setDismissedDots((prev) => ({ ...prev, [tabId]: true }));
    }
  };

  const renderContent = () => {
    if (activeTab === 'Dashboard' && isDashboardLoading) {
      return <CentralLoading seconds={dashboardElapsedTime} />;
    }
    if (isLoading && !isDashboard) {
      return <CentralLoading seconds={elapsedTime} />;
    }

    if (activeTab === 'Dashboard') {
      return (
        <div className="w-full h-[calc(100vh-240px)] flex flex-col">
          <DashboardTab
            yearlyTasks={yearlyTasks}
            selectedYear={selectedDate}
            selectedLocation={selectedLocation}
            isLoading={isDashboardLoading}
          />
        </div>
      );
    }

    if (!reportPreview && activeTab !== 'Task Summary') {
      return (
        <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
          <p>Tidak ada data / Belum dimuat.</p>
        </div>
      );
    }

    const renderTabContent = (Component, props) => (
      <div className="w-full h-[calc(100vh-240px)] flex flex-col">
        <Component {...props} />
      </div>
    );

    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const startStr = formatDate(new Date(year, month, 1));
    const endStr = formatDate(new Date(year, month + 1, 0));

    switch (activeTab) {
      case 'Task Summary':
        return renderTabContent(TaskSummaryTab, {
          metrics: taskSummaryMetrics,
          isLoading: isCalculatingMetrics,
          progress: historyProgress,
          startDateStr: startStr,
          endDateStr: endStr,
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
        return renderTabContent(PendingReasonsTab, {
          data: reportPreview.pendingReasonsData,
          locationName: selectedLocationName,
        });
      default:
        return <PlaceholderTab tabName={activeTab} />;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Rangkuman Laporan</h1>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto items-center">
          <div className="w-full sm:w-auto relative z-50">
            <label className="block text-xs text-gray-400 mb-1 ml-1 font-medium">
              {isDashboard ? 'Pilih Tahun' : 'Pilih Bulan'}
            </label>
            <DatePicker
              selected={selectedDate}
              onChange={handleDateChange}
              dateFormat={isDashboard ? 'yyyy' : 'MMMM yyyy'}
              showYearPicker={isDashboard}
              showMonthYearPicker={!isDashboard}
              wrapperClassName="w-full"
              disabled={isLoading}
              calendarClassName={isDashboard ? 'custom-year-picker' : ''}
              className={`w-full sm:w-48 px-4 py-2.5 h-[42px] rounded-lg border border-gray-300 text-center font-medium shadow-sm transition-colors ${isLoading ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : 'bg-white text-slate-700 cursor-pointer'}`}
            />
          </div>
          {!isDashboard && (
            <div className="w-full sm:w-auto relative z-0">
              <label className="block text-xs text-transparent mb-1 ml-1 font-medium select-none">
                Action
              </label>
              <DownloadButton
                onClick={handleDownloadExcel}
                disabled={isDownloading || isLoading}
                isLoading={isLoading || isDownloading}
              />
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[400px] flex flex-col">
        <div className="flex overflow-x-auto border-b border-gray-200 px-2 scrollbar-hide relative">
          <button
            onClick={() => handleTabClick('Dashboard')}
            className={`relative px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === 'Dashboard' ? 'border-sky-600 text-sky-700' : 'border-transparent text-gray-500 hover:text-gray-700 opacity-60 cursor-pointer'} ${isDashboardLoading ? 'animate-pulse text-sky-600 font-semibold' : ''}`}
          >
            <div className="flex items-center gap-2">
              <span>Dashboard</span>
              {getPingDot('Dashboard')}
            </div>
          </button>
          {tabs.slice(1).map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id ? 'border-sky-600 text-sky-700' : 'border-transparent text-gray-500 hover:text-gray-700 opacity-60 cursor-pointer'}`}
            >
              <div className="flex items-center gap-2">
                <span>{tab.label}</span>
                {getPingDot(tab.id)}
              </div>
            </button>
          ))}
        </div>
        <div className="flex-1 p-0 sm:p-6 overflow-hidden">{renderContent()}</div>
      </div>
    </div>
  );
}
