// File: features/reportData/RangkumanSummary.js
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
import {
  formatDate,
  formatTimer,
  calculateTargetDates, // 1. IMPORT FUNGSI LOGIKA TANGGAL
} from '@/lib/utils';
import { useCallback, useEffect, useRef, useState } from 'react';
import DatePicker from 'react-datepicker';
import * as XLSX from 'xlsx-js-style';

// --- IMPORT TABS ---
import AverageKmTab from './tabs/AverageKmTab';
import PendingReasonsTab from './tabs/PendingReasonsTab';
import PlaceholderTab from './tabs/PlaceholderTab';
import TaskSummaryTab from './tabs/TaskSummaryTab';
import TimeDriverTab from './tabs/TimeDriverTab';
import TruckDetailTab from './tabs/TruckDetailTab';
import TruckUsageTab from './tabs/TruckUsageTab';

// 2. HELPER UNTUK MENENTUKAN TANGGAL AWAL (REQ: Handle Tanggal 1)
const getInitialDate = () => {
  const now = new Date();

  // Jika bukan tanggal 1, gunakan tanggal hari ini (Bulan Berjalan)
  if (now.getDate() > 1) {
    return now;
  }

  // Jika TANGGAL 1
  const targetDate = new Date(now);
  targetDate.setDate(targetDate.getDate() - 1); // Mundur ke akhir bulan lalu (H-1)

  // Cek apakah hasilnya Hari Minggu?
  // (Jika tanggal 1 adalah Senin, maka H-1 adalah Minggu) -> Mundur ke Sabtu
  if (targetDate.getDay() === 0) {
    targetDate.setDate(targetDate.getDate() - 1);
  }

  return targetDate;
};

export default function RangkumanSummary() {
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedLocationName, setSelectedLocationName] = useState('');

  // 3. GUNAKAN INITIAL DATE HELPER DI SINI
  const [selectedDate, setSelectedDate] = useState(getInitialDate());

  const [masterTruckData, setMasterTruckData] = useState(null);

  const [driverData, setDriverData] = useState([]);
  const [rawData, setRawData] = useState({
    tasks: [],
    results: [],
    locations: [],
  });

  // Loading States
  const [isLoading, setIsLoading] = useState(false);

  // Timers
  const [elapsedTime, setElapsedTime] = useState(0);
  const fetchStartTimeRef = useRef(null);

  const [reportPreview, setReportPreview] = useState(null);

  // Default Tab: Task Summary
  const [activeTab, setActiveTab] = useState('Task Summary');
  const [pendingEndpoints, setPendingEndpoints] = useState([]);
  const [dismissedDots, setDismissedDots] = useState({});

  // --- STATE TASK SUMMARY ---
  const [taskSummaryMetrics, setTaskSummaryMetrics] = useState({});
  const [isCalculatingMetrics, setIsCalculatingMetrics] = useState(false);
  const [historyProgress, setHistoryProgress] = useState(0);

  // 1. Load Lokasi & Master Truck
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
        console.error(e);
      }
    }
  }, []);

  // 2. Init Dismissed Dots
  useEffect(() => {
    const initial = {};
    [
      'Task Summary',
      'Pending Reasons',
      'Time Driver',
      'Truck Detail',
      'Truck Usage',
      'Average KM',
    ].forEach((t) => (initial[t] = false));
    setDismissedDots(initial);
  }, []);

  // 3. Reset Dismissed Dots saat Loading
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

  // 4. Timer Logic
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

  // ========== UTILS ==========
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

  // (Helper ini tetap ada karena digunakan oleh logic Metrics internal, tidak perlu diubah)
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

  // --- TASK SUMMARY METRICS ---
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
      console.error('Error batch fetch:', err);
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

  // ==== MAIN: FETCH DATA BULANAN ====
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
      // 1. Tanggal Start & End Bulan Ini (Normal untuk Tasks)
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      const startStr = formatDate(startDate);
      const endStr = formatDate(endDate);
      const timeFrom = `${startStr} 00:00:00`;
      const timeTo = `${endStr} 23:59:59`;

      // 2. Tanggal History (Mulai H-1 jam 22:00)
      const locStartDate = new Date(startDate);
      locStartDate.setDate(locStartDate.getDate() - 1);
      const locStartStr = formatDate(locStartDate);
      const locTimeFrom = `${locStartStr} 22:00:00`;

      // 3. UPDATE LOGIC: Menggunakan calculateTargetDates (Sama seperti SingleReportDownloader)
      // Logic ini otomatis handle H-1 dan Skip Sunday jika boundary-nya kena hari Minggu
      const { dateFrom: routingStartStr } = calculateTargetDates(startStr);
      const { dateTo: routingEndStr } = calculateTargetDates(endStr);

      const monthlyPromises = [
        fetchWithTracker(() => getOrFetchDriverData(selectedLocation), 'Drivers'),
        fetchWithTracker(
          () =>
            fetchWithRetry(
              () =>
                getTasks({
                  hubId: selectedLocation,
                  status: 'DONE',
                  timeFrom,
                  timeTo,
                  timeBy: 'doneTime',
                  limit: 10000,
                }),
              { retries: 2, baseMs: 500 }
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
              { retries: 2, baseMs: 500 }
            ),
          'Routing'
        ),
        fetchWithTracker(
          () =>
            fetchWithRetry(
              () =>
                getLocationHistories({
                  timeFrom: locTimeFrom,
                  timeTo,
                  limit: 10000,
                  startFinish: 'true',
                  fields: 'finish,startTime,email,trackedTime,totalDistance',
                  timeBy: 'createdTime',
                }),
              { retries: 2, baseMs: 500 }
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

      // Trigger Calculation
      processTaskSummaryMetrics(newRawData.tasks, newRawData.results);
    } catch (e) {
      console.error(e);
      toastError('Gagal ambil data: ' + e.message);
      setReportPreview(null);
    } finally {
      setIsLoading(false);
    }
    //eslint-disable-next-line
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
        formatDate(startDate),
        formatDate(endDate),
        selectedLocationName,
        selectedLocation,
        taskSummaryMetrics,
        masterTruckData || { Dry: { Total: 0 }, Frozen: { Total: 0 } }
      );

      XLSX.writeFile(wb, excelFileName);
      toastSuccess('Rangkuman berhasil di-download!');
    } catch (err) {
      console.error(err);
      toastError('Gagal membuat Excel: ' + err.message);
    }
  };

  // --- TABS & CONTENT ---
  const tabs = [
    { id: 'Task Summary', label: 'Task Summary' },
    { id: 'Pending Reasons', label: 'Pending Reasons' },
    { id: 'Time Driver', label: 'Time Driver' },
    { id: 'Truck Detail', label: 'Truck Detail' },
    { id: 'Truck Usage', label: 'Truck Usage' },
    { id: 'Average KM', label: 'Average KM of Routing' },
  ];

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

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-gray-500 py-12 space-y-4">
          <Spinner />
          <div className="text-center space-y-1">
            <p className="text-lg font-medium text-slate-700">Sedang memuat data...</p>
            <p className="text-2xl font-mono font-bold text-sky-600">{formatTimer(elapsedTime)}</p>
          </div>
          {elapsedTime > 120 && pendingEndpoints.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-md max-w-md text-center text-sm animate-pulse">
              <p className="font-semibold">
                Memproses banyak data di {pendingEndpoints.join(', ')}.
              </p>
              <p>Mohon tunggu.</p>
            </div>
          )}
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
    <div className="w-full max-w-none px-4 sm:px-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center md:items-end bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6 gap-0 sm:gap-4">
        <div className="w-full md:w-auto relative z-50">
          <label className="block text-xs text-gray-400 mb-1 ml-1 font-medium">Pilih Bulan</label>
          <DatePicker
            selected={selectedDate}
            onChange={handleDateChange}
            dateFormat="MMMM yyyy"
            showMonthYearPicker
            wrapperClassName="w-full"
            disabled={isLoading}
            className={`w-full md:w-48 px-4 py-2.5 h-[42px] rounded-lg border border-gray-300 text-center font-medium shadow-sm transition-colors ${
              isLoading
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                : 'bg-white text-slate-700 cursor-pointer hover:bg-gray-50'
            }`}
          />
        </div>

        {/* 2. Komponen Kanan (Button) */}
        <div className="w-full md:w-auto relative z-50">
          <label className="block text-xs text-transparent mb-1 ml-1 font-medium select-none">
            Action
          </label>
          <DownloadButton
            width="w-full md:w-auto"
            onClick={handleDownloadExcel}
            disabled={isLoading || rawData.tasks.length === 0}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* ... Sisa kode tab dan content di bawah ... */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[400px] flex flex-col">
        <div className="flex overflow-x-auto border-b border-gray-200 px-2 scrollbar-hide relative">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`
                      px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                      ${
                        activeTab === tab.id
                          ? 'border-sky-600 text-sky-700'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 opacity-50 cursor-pointer'
                      }
                  `}
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
