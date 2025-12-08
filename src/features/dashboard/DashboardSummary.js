// File: src/features/dashboard/DashboardSummary.js
'use client';

import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

import Spinner from '@/components/Spinner';
import Tooltip from '@/components/Tooltip';
import { getTasks } from '@/lib/apiService';
import { toastError, toastSuccess, toastWarning } from '@/lib/toastHelper';

// --- IMPORT CHART (ABSOLUTE PATH) ---
import SequenceAccuracyChart from '@/features/dashboard/components/SequenceAccuracyChart';
import ServiceLevelChart from '@/features/dashboard/components/ServiceLevelChart';

// ========== HELPER FUNCTIONS ==========
const normalizeEmail = (email) => {
  if (!email) return null;
  return email.toLowerCase().trim();
};

const getWIBDateString = (utcTimestamp) => {
  if (!utcTimestamp) return null;
  try {
    const date = new Date(utcTimestamp);
    return date
      .toLocaleString('en-GB', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
      .replace(/\//g, '-');
  } catch (e) {
    return null;
  }
};

const formatToApiUtc = (date) => {
  return date.toISOString().slice(0, 19).replace('T', ' ');
};

function processOrderInfo(rawOrderId) {
  if (!rawOrderId || rawOrderId === 'N/A') {
    return {
      tooltip: 'Tidak ada nomor SO',
      copyValue: null,
    };
  }

  const firstOrderId = rawOrderId.split(',')[0].trim();
  let copyValueToUse = null;

  if (firstOrderId.startsWith('SO') && firstOrderId.includes('-')) {
    const processedCopy = firstOrderId.split('-')[1];
    copyValueToUse = processedCopy || firstOrderId;
  } else {
    copyValueToUse = firstOrderId;
  }

  return {
    tooltip: rawOrderId,
    copyValue: copyValueToUse,
  };
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ========== KOMONEN STAT CARD ==========
const StatCard = forwardRef(function StatCard(
  { title, value, isLoading, className = '', valueClassName = '', tooltipContent },
  ref
) {
  const cardElement = (
    <div ref={ref} className={`bg-white shadow-md rounded-lg p-6 ${className}`}>
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      {isLoading ? (
        <div className="mt-2 h-8 w-12 bg-gray-200 animate-pulse rounded" />
      ) : (
        <p className={`mt-1 text-3xl font-semibold text-gray-900 ${valueClassName}`}>{value}</p>
      )}
    </div>
  );

  if (tooltipContent) {
    return <Tooltip tooltipContent={tooltipContent}>{cardElement}</Tooltip>;
  }
  return cardElement;
});
StatCard.displayName = 'StatCard';

const ChartSkeleton = ({ title }) => (
  <div className="w-full bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-[450px] flex flex-col animate-pulse">
    <div className="mb-6">
      <h3 className="text-lg font-bold text-slate-300">{title}</h3>
      <div className="h-4 w-1/3 bg-slate-100 rounded mt-2" />
    </div>
    <div className="flex-1 bg-slate-50 rounded-lg flex items-center justify-center text-slate-300 text-sm">
      Menyiapkan Grafik...
    </div>
  </div>
);

// Wrapper ini yang ngatur skeleton & delay render chart
function DiagramTab({ yearlyTasks, hubId }) {
  const [renderStep, setRenderStep] = useState(0);

  useEffect(() => {
    // reset setiap data tahunannya berubah
    // eslint-disable-next-line
    setRenderStep(0);

    if (yearlyTasks && yearlyTasks.length > 0) {
      const t1 = setTimeout(() => setRenderStep(1), 200); // ServiceLevel dulu
      const t2 = setTimeout(() => setRenderStep(2), 600); // lalu SequenceAccuracy

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [yearlyTasks]);

  if (!yearlyTasks || yearlyTasks.length === 0) {
    return (
      <div className="h-[350px] lg:col-span-2 flex items-center justify-center bg-gray-50 border border-dashed border-gray-300 rounded-xl text-gray-400">
        Tidak ada data yang ditemukan.
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col gap-6 pb-4 overflow-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Service Level */}
        {renderStep >= 1 ? (
          <ServiceLevelChart allTasks={yearlyTasks} hubId={hubId} />
        ) : (
          <ChartSkeleton title="Service Level" />
        )}

        {/* Chart 2: Sequence Accuracy */}
        {renderStep >= 2 ? (
          <SequenceAccuracyChart allTasks={yearlyTasks} />
        ) : (
          <ChartSkeleton title="Sequence Accuracy" />
        )}
      </div>
    </div>
  );
}

// ========== MAIN COMPONENT ==========
export default function DashboardSummary({ driverData }) {
  // State Harian
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState(null);
  const [error, setError] = useState(null);

  // State Tahunan
  const [yearlyTasks, setYearlyTasks] = useState([]);
  const [isYearlyLoading, setIsYearlyLoading] = useState(false);
  const lastFetchedYear = useRef(null);
  const lastFetchedLocation = useRef(null);
  const inFlightYearFetchKey = useRef(null); // cacheKey kalau sedang fetch tahunan
  const yearlyCacheRef = useRef({}); // in-memory cache { `${hubId}:${year}`: tasks[] }

  // Tabs
  const [activeTab, setActiveTab] = useState('Diagram'); // 'Diagram' | 'Detail'
  const [dismissedDots, setDismissedDots] = useState({
    Diagram: false,
    Detail: false,
  });

  const DAILY_CACHE_PREFIX = 'dashboardDailyTasks';

  // ========== SMALL HANDLERS ==========
  const handleCopy = (task) => {
    if (!task.copyValue) {
      toastWarning('Tidak ada nomor SO untuk disalin');
      return;
    }
    navigator.clipboard.writeText(task.copyValue).then(
      () => {
        toastSuccess(`Salin: ${task.tooltip}`);
      },
      (err) => {
        toastError('Gagal menyalin ke clipboard');
        console.error('Gagal menyalin:', err);
      }
    );
  };

  const handleDateChange = (date) => {
    if (!date) return;
    if (date.getDay() === 0) {
      toastError('Tidak ada pengiriman saat Minggu. Silahkan pilih tanggal lain');
      return;
    }
    setSelectedDate(date);
  };

  // ========== PING DOT PER TAB ==========
  const getPingDot = (tabId) => {
    const isTabLoading = tabId === 'Diagram' ? isYearlyLoading : loading;
    const dismissed = dismissedDots[tabId];

    const timingConfig = {
      Diagram: {
        delay: '0s',
        duration: '1.2s',
      },
      Detail: {
        delay: '0.4s',
        duration: '1.6s',
      },
    };

    const currentTiming = timingConfig[tabId] || { delay: '0s', duration: '1.2s' };

    if (!isTabLoading && dismissed) return null;

    return (
      <span className="inline-flex items-center ml-2" aria-hidden>
        {isTabLoading ? (
          <span className="relative flex h-3 w-3">
            <span
              className="absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75 animate-ping"
              style={{
                animationDelay: currentTiming.delay,
                animationDuration: currentTiming.duration,
              }}
            />
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
    const isTabLoading = tabId === 'Diagram' ? isYearlyLoading : loading;

    if (!isTabLoading) {
      setDismissedDots((prev) => ({ ...prev, [tabId]: true }));
    }
  };

  useEffect(() => {
    if (loading) {
      setDismissedDots((prev) => ({ ...prev, Detail: false }));
    }
  }, [loading]);

  useEffect(() => {
    if (isYearlyLoading) {
      setDismissedDots((prev) => ({ ...prev, Diagram: false }));
    }
  }, [isYearlyLoading]);

  // ========== 1. FETCH HARIAN (Detail) + CACHE (sessionStorage) ==========
  useEffect(() => {
    async function fetchData() {
      if (selectedDate.getDay() === 0) {
        setLoading(false);
        setError(null);
        const emptySummary = {
          totalTasks: 0,
          unassigned: 0,
          manualAssignList: [],
          unassignedList: [],
          done: 0,
          ongoing: 0,
          assignedTasks: 0,
          flowDelivery: 0,
          flowReDelivery: 0,
          flowPendingGR: 0,
          crossDayTasks: [],
        };
        setSummaryData(emptySummary);
        return;
      }

      const driverMap = new Map();
      try {
        if (driverData) {
          driverData.forEach((driver) => {
            if (driver.email && driver.name) {
              driverMap.set(normalizeEmail(driver.email), driver.name);
            }
          });
        }
      } catch (e) {
        toastWarning('Gagal memproses cache nama driver.');
      }

      try {
        if (typeof window === 'undefined') return;

        const hubId = localStorage.getItem('userLocation');
        if (!hubId) throw new Error('Lokasi Hub tidak ditemukan. Harap login ulang.');

        const localStart = new Date(selectedDate);
        localStart.setHours(0, 0, 0, 0);
        const localEnd = new Date(localStart);
        localEnd.setHours(23, 59, 59, 999);

        const timeFrom = formatToApiUtc(localStart);
        const timeTo = formatToApiUtc(localEnd);

        const cacheKey = `${DAILY_CACHE_PREFIX}:${hubId}:${timeFrom}:${timeTo}`;

        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            setSummaryData(parsed);
            setLoading(false);
            setError(null);
            return;
          } catch (e) {
            sessionStorage.removeItem(cacheKey);
          }
        }

        setLoading(true);
        setError(null);
        setSummaryData(null);

        const tasksData = await getTasks({
          status: 'DONE,ONGOING,UNASSIGNED',
          hubId,
          timeFrom,
          timeTo,
          timeBy: 'startTime',
          limit: 1000,
        });

        if (!tasksData || tasksData.length === 0) {
          const emptySummary = {
            totalTasks: 0,
            unassigned: 0,
            manualAssignList: [],
            unassignedList: [],
            done: 0,
            ongoing: 0,
            assignedTasks: 0,
            flowDelivery: 0,
            flowReDelivery: 0,
            flowPendingGR: 0,
            crossDayTasks: [],
          };
          setSummaryData(emptySummary);
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify(emptySummary));
          } catch (e) {
            // ignore quota errors
          }
          return;
        }

        let manualAssignList = [];
        let crossDayTasks = [];
        let unassignedList = [];
        let done = 0;
        let ongoing = 0;
        let unassigned = 0;
        let flowDelivery = 0;
        let flowReDelivery = 0;
        let flowPendingGR = 0;

        for (const task of tasksData) {
          const flow = task.flow || 'N/A';
          const orderInfo = processOrderInfo(task.orderId);

          if (task.status === 'DONE') done++;
          else if (task.status === 'ONGOING') ongoing++;
          else if (task.status === 'UNASSIGNED') {
            unassigned++;
            unassignedList.push({
              customer: task.customerName || 'N/A',
              flow,
              copyValue: orderInfo.copyValue,
              tooltip: orderInfo.tooltip,
            });
          }

          const manualCategory = !task.routePlannedOrder || !task.eta || !task.etd;
          if (manualCategory && task.status !== 'UNASSIGNED') {
            const rawAssignee =
              task.assignee && task.assignee.length > 0 ? task.assignee[0] : 'N/A';
            const normalizedAssignee = normalizeEmail(rawAssignee);
            let finalAssignee = driverMap.get(normalizedAssignee) || rawAssignee;
            if (finalAssignee === 'N/A') finalAssignee = '-';

            manualAssignList.push({
              customer: task.customerName || 'N/A',
              driver: finalAssignee,
              flow,
              copyValue: orderInfo.copyValue,
              tooltip: orderInfo.tooltip,
            });
          }

          if (flow === 'Delivery') flowDelivery++;
          else if (flow.includes('Re Delivery')) flowReDelivery++;
          else if (flow.includes('Pending GR')) flowPendingGR++;

          if (task.status === 'DONE' && task.startTime && task.doneTime) {
            const startDateWIB = getWIBDateString(task.startTime);
            const doneDateWIB = getWIBDateString(task.doneTime);

            if (startDateWIB && doneDateWIB && startDateWIB !== doneDateWIB) {
              const startDate = new Date(task.startTime);
              const doneDate = new Date(task.doneTime);
              const diffInMs = doneDate.getTime() - startDate.getTime();
              const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

              const rawAssignee =
                task.assignee && task.assignee.length > 0 ? task.assignee[0] : 'N/A';
              const normalizedAssignee = normalizeEmail(rawAssignee);
              const driverName = driverMap.get(normalizedAssignee) || rawAssignee;

              crossDayTasks.push({
                customer: task.customerName || 'N/A',
                doneDateDisplay: `${doneDateWIB} (H+${diffInDays})`,
                driver: driverName,
                copyValue: orderInfo.copyValue,
                tooltip: orderInfo.tooltip,
              });
            }
          }
        }

        unassignedList.sort((a, b) => a.flow.localeCompare(b.flow));
        manualAssignList.sort((a, b) => a.driver.localeCompare(b.driver));
        crossDayTasks.sort((a, b) => a.driver.localeCompare(b.driver));

        const summary = {
          totalTasks: tasksData.length,
          unassigned,
          manualAssignList,
          unassignedList,
          done,
          ongoing,
          assignedTasks: done + ongoing,
          flowDelivery,
          flowReDelivery,
          flowPendingGR,
          crossDayTasks,
        };

        setSummaryData(summary);
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(summary));
        } catch (e) {
          // ignore quota errors
        }
      } catch (err) {
        console.error(err);
        setError(err.message || 'Gagal mengambil data harian.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [driverData, selectedDate]);

  // ========== FETCH WITH RETRY (untuk tahunan) ==========
  const fetchWithRetry = useCallback(async (fn, { retries = 3, baseMs = 700 } = {}) => {
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
        const delay = baseMs * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 100);
        await wait(delay);
      }
    }
  }, []);

  // ========== 2. FETCH TAHUNAN (Diagram) - CHUNK + RETRY + IN-MEMORY CACHE ==========
  const fetchYearlyData = useCallback(
    async (hubId, year, cacheKey) => {
      setIsYearlyLoading(true);

      const quarters = [
        { start: `${year}-01-01 00:00:00`, end: `${year}-03-31 23:59:59`, label: 'Q1' },
        { start: `${year}-04-01 00:00:00`, end: `${year}-06-30 23:59:59`, label: 'Q2' },
        { start: `${year}-07-01 00:00:00`, end: `${year}-09-30 23:59:59`, label: 'Q3' },
        { start: `${year}-10-01 00:00:00`, end: `${year}-12-31 23:59:59`, label: 'Q4' },
      ];

      let allTasks = [];

      try {
        for (const q of quarters) {
          try {
            const quarterData = await fetchWithRetry(() =>
              getTasks({
                hubId,
                status: 'DONE',
                timeFrom: q.start,
                timeTo: q.end,
                timeBy: 'doneTime',
                limit: 25000,
              })
            );

            if (Array.isArray(quarterData)) {
              allTasks = allTasks.concat(quarterData);
            } else if (quarterData?.data) {
              allTasks = allTasks.concat(quarterData.data);
            }
          } catch (err) {
            console.error(`Gagal ambil data tahunan ${q.label}:`, err?.message || err);
          }
        }

        yearlyCacheRef.current[cacheKey] = allTasks;
        setYearlyTasks(allTasks);
        lastFetchedYear.current = year;
        lastFetchedLocation.current = hubId;
      } finally {
        setIsYearlyLoading(false);
      }
    },
    [fetchWithRetry]
  );

  // Trigger fetch tahunan:
  // - hanya kalau TAB DIAGRAM aktif
  // - hanya 1x per (hubId, year) dalam lifecycle, pakai in-memory cache
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (activeTab !== 'Diagram') return;

    const hubId = localStorage.getItem('userLocation');
    if (!hubId) return;

    const year = selectedDate.getFullYear();
    const cacheKey = `${hubId}:${year}`;

    const cached = yearlyCacheRef.current[cacheKey];
    if (cached) {
      setYearlyTasks(cached);
      lastFetchedYear.current = year;
      lastFetchedLocation.current = hubId;
      return;
    }

    const alreadyFetched =
      lastFetchedYear.current === year && lastFetchedLocation.current === hubId;
    if (alreadyFetched) {
      return;
    }

    if (inFlightYearFetchKey.current === cacheKey) return;

    inFlightYearFetchKey.current = cacheKey;

    fetchYearlyData(hubId, year, cacheKey).finally(() => {
      inFlightYearFetchKey.current = null;
    });
  }, [selectedDate, activeTab, fetchYearlyData]);

  // ========== RENDER ==========
  const currentHubId = typeof window !== 'undefined' ? localStorage.getItem('userLocation') : null;

  return (
    <div className="w-full max-w-none px-4 sm:px-6 py-6">
      {/* HEADER & DATEPICKER */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Overview performa operasional{' '}
            <span className="font-semibold text-sky-600">Harian & Tahunan</span>
          </p>
        </div>

        <div className="flex flex-col items-start mt-4 md:mt-0">
          <label className="block text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wide">
            Pilih Tanggal Pengiriman
          </label>
          <DatePicker
            selected={selectedDate}
            onChange={handleDateChange}
            className="border border-gray-300 rounded-lg p-2.5 text-center font-medium text-slate-700 shadow-sm focus:ring-2 focus:ring-sky-500 outline-none w-48 cursor-pointer"
            dateFormat="dd MMMM yyyy"
            disabled={loading}
          />
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          <strong>Gagal memuat data:</strong> {error}
        </div>
      )}

      {/* TABS */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="flex overflow-x-auto border-b border-gray-200 px-4">
          {['Diagram', 'Detail'].map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabClick(tab)}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === tab
                  ? 'border-sky-600 text-sky-700 font-bold'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 opacity-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span>{tab}</span>
                {getPingDot(tab)}
              </div>
            </button>
          ))}
        </div>

        {/* CONTENT */}
        <div className="p-6">
          {/* TAB DETAIL */}
          {activeTab === 'Detail' && (
            <div className="space-y-10 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Total & Assigned */}
                <div className="lg:col-span-1 lg:order-2 flex flex-col gap-6">
                  <StatCard
                    title="Total Task"
                    value={summaryData?.totalTasks}
                    isLoading={loading}
                    className="flex flex-col items-center justify-center text-center h-full min-h-[150px]"
                    valueClassName="text-5xl"
                    tooltipContent="Total semua task (Selesai, Berjalan, & Belum Assign)."
                  />
                  <StatCard
                    title="Task Ter-assign"
                    value={summaryData?.assignedTasks}
                    isLoading={loading}
                    className="flex flex-col items-center justify-center text-center h-full min-h-[150px]"
                    valueClassName="text-5xl"
                    tooltipContent="Total task yang sudah di-assign ke driver."
                  />
                </div>

                {/* Grid kecil */}
                <div className="lg:col-span-2 lg:order-1 grid grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-min">
                  <StatCard
                    title="Belum Assign"
                    value={summaryData?.unassigned}
                    isLoading={loading}
                    tooltipContent="Jumlah task 'UNASSIGNED'."
                  />
                  <StatCard
                    title="Berjalan"
                    value={summaryData?.ongoing}
                    isLoading={loading}
                    tooltipContent="Jumlah task 'ONGOING'."
                  />
                  <StatCard
                    title="Selesai"
                    value={summaryData?.done}
                    isLoading={loading}
                    tooltipContent="Jumlah task 'DONE'."
                  />
                  <StatCard
                    title="Manual Assign"
                    value={summaryData?.manualAssignList?.length}
                    isLoading={loading}
                    tooltipContent="Task tanpa proses routing."
                  />
                  <StatCard
                    title="Beda Hari"
                    value={summaryData?.crossDayTasks?.length}
                    isLoading={loading}
                    tooltipContent="Task selesai di hari berbeda."
                  />
                  <StatCard
                    title="Delivery"
                    value={summaryData?.flowDelivery}
                    isLoading={loading}
                    tooltipContent="Flow 'Delivery'."
                  />
                  <StatCard
                    title="Re-Delivery"
                    value={summaryData?.flowReDelivery}
                    isLoading={loading}
                    tooltipContent="Flow 'Re Delivery'."
                  />
                  <StatCard
                    title="Pending GR"
                    value={summaryData?.flowPendingGR}
                    isLoading={loading}
                    tooltipContent="Flow 'Pending GR'."
                  />
                </div>

                {/* List Data */}
                <div className="lg:col-span-2 lg:order-3 flex flex-col gap-6">
                  {/* Unassigned */}
                  <div className="bg-white shadow border border-gray-100 rounded-lg overflow-hidden flex flex-col h-64">
                    <h3 className="text-sm font-bold text-gray-700 bg-gray-50 p-3 border-b">
                      Daftar Belum Assign
                    </h3>
                    {loading ? (
                      <div className="flex justify-center items-center grow">
                        <Spinner />
                      </div>
                    ) : summaryData?.unassignedList?.length > 0 ? (
                      <div className="overflow-y-auto grow">
                        <table className="min-w-full">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">
                                Flow
                              </th>
                              <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">
                                Customer Name
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {summaryData.unassignedList.map((t, i) => (
                              <tr
                                key={i}
                                className="hover:bg-gray-50 cursor-copy"
                                onClick={() => handleCopy(t)}
                              >
                                <td className="p-3 text-xs">{t.flow}</td>
                                <td className="p-3 text-xs">{t.customer}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-4 text-center text-xs text-gray-400 grow flex items-center justify-center">
                        Kosong
                      </div>
                    )}
                  </div>

                  {/* Manual Assign */}
                  <div className="bg-white shadow border border-gray-100 rounded-lg overflow-hidden flex flex-col h-64">
                    <h3 className="text-sm font-bold text-gray-700 bg-gray-50 p-3 border-b">
                      Daftar Manual Assign
                    </h3>
                    {loading ? (
                      <div className="flex justify-center items-center grow">
                        <Spinner />
                      </div>
                    ) : summaryData?.manualAssignList?.length > 0 ? (
                      <div className="overflow-y-auto grow">
                        <table className="min-w-full">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">
                                Flow
                              </th>
                              <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">
                                Customer Name
                              </th>
                              <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">
                                Driver
                              </th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-gray-100">
                            {summaryData.manualAssignList.map((t, i) => (
                              <tr
                                key={i}
                                className="hover:bg-gray-50 cursor-copy"
                                onClick={() => handleCopy(t)}
                              >
                                <td className="p-3 text-xs">{t.flow}</td>
                                <td className="p-3 text-xs">{t.customer}</td>
                                <td className="p-3 text-xs font-semibold">{t.driver}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-4 text-center text-xs text-gray-400 grow flex items-center justify-center">
                        Kosong
                      </div>
                    )}
                  </div>

                  {/* Cross Day */}
                  <div className="bg-white shadow border border-gray-100 rounded-lg overflow-hidden flex flex-col h-64">
                    <h3 className="text-sm font-bold text-gray-700 bg-gray-50 p-3 border-b">
                      Daftar Beda Hari
                    </h3>
                    {loading ? (
                      <div className="flex justify-center items-center grow">
                        <Spinner />
                      </div>
                    ) : summaryData?.crossDayTasks?.length > 0 ? (
                      <div className="overflow-y-auto grow">
                        <table className="min-w-full">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">
                                Customer Name
                              </th>
                              <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">
                                Tgl. Selesai
                              </th>
                              <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">
                                Driver
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {summaryData.crossDayTasks.map((t, i) => (
                              <tr
                                key={i}
                                className="hover:bg-gray-50 cursor-copy"
                                onClick={() => handleCopy(t)}
                              >
                                <td className="p-3 text-xs">{t.customer}</td>
                                <td className="p-3 text-xs text-red-500">{t.doneDateDisplay}</td>
                                <td className="p-3 text-xs">{t.driver}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-4 text-center text-xs text-gray-400 grow flex items-center justify-center">
                        Kosong
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB DIAGRAM */}
          {activeTab === 'Diagram' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-bold text-slate-700">
                  Performa Tahun {selectedDate.getFullYear()}
                </h2>
              </div>

              {isYearlyLoading ? (
                // Masih ambil data tahunan dari API
                <div className="h-[400px] flex flex-col items-center justify-center bg-gray-50 border border-dashed border-gray-300 rounded-xl text-gray-500">
                  <div className="flex flex-col items-center gap-3">
                    <Spinner />
                    <p className="text-sm font-medium">Sedang memuat data tahunan...</p>
                  </div>
                </div>
              ) : (
                // Data tahunan sudah ada -> serahkan ke DiagramTab (skeleton + delay render chart)
                <DiagramTab yearlyTasks={yearlyTasks} hubId={currentHubId} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
