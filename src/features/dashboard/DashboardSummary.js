// File: src/features/dashboard/DashboardSummary.js
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import DatePicker from 'react-datepicker';

import BodyCard from '@/components/card/BodyCard';
import HeaderCard from '@/components/card/HeaderCard';
import DashboardDetailTab from '@/features/dashboard/components/DashboardDetailTab';
import SequenceAccuracyChart from '@/features/dashboard/components/SequenceAccuracyChart';
import ServiceLevelChart from '@/features/dashboard/components/ServiceLevelChart';
import { getTasks } from '@/lib/apiService';
import { toastError, toastWarning } from '@/lib/toastHelper';
import { normalizeEmail } from '@/lib/utils';

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

const formatToApiUtc = (date) => date.toISOString().slice(0, 19).replace('T', ' ');

function processOrderInfo(rawOrderId) {
  if (!rawOrderId || rawOrderId === 'N/A') {
    return { tooltip: 'Tidak ada nomor SO', copyValue: null };
  }
  const firstOrderId = rawOrderId.split(',')[0].trim();
  let copyValueToUse = null;

  if (firstOrderId.startsWith('SO') && firstOrderId.includes('-')) {
    const processedCopy = firstOrderId.split('-')[1];
    copyValueToUse = processedCopy || firstOrderId;
  } else {
    copyValueToUse = firstOrderId;
  }
  return { tooltip: rawOrderId, copyValue: copyValueToUse };
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ========== SKELETON DIAGRAM ==========
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

function DiagramTab({ yearlyTasks, hubId }) {
  const [renderStep, setRenderStep] = useState(0);

  useEffect(() => {
    //eslint-disable-next-line
    setRenderStep(0);
    if (yearlyTasks && yearlyTasks.length > 0) {
      const t1 = setTimeout(() => setRenderStep(1), 200);
      const t2 = setTimeout(() => setRenderStep(2), 600);
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
        {renderStep >= 1 ? (
          <ServiceLevelChart allTasks={yearlyTasks} hubId={hubId} />
        ) : (
          <ChartSkeleton title="Service Level" />
        )}
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
  // State Harian (Selected Date juga dipakai untuk Tahunan)
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState(null);
  const [error, setError] = useState(null);

  // State Tahunan
  const [yearlyTasks, setYearlyTasks] = useState([]);
  const [isYearlyLoading, setIsYearlyLoading] = useState(false);

  // REFS
  const lastFetchedYear = useRef(null);
  const lastFetchedLocation = useRef(null);
  const inFlightYearFetchKey = useRef(null);
  const yearlyCacheRef = useRef({});
  const fetchStartTimeRef = useRef(null);

  // Tabs
  const [activeTab, setActiveTab] = useState('Diagram');
  const [dismissedDots, setDismissedDots] = useState({
    Diagram: false,
    Detail: false,
  });

  const DAILY_CACHE_PREFIX = 'dashboardDailyTasks';

  const handleDateChange = (date) => {
    if (!date) return;
    if (activeTab === 'Detail' && date.getDay() === 0) {
      toastError('Tidak ada pengiriman saat Minggu. Silahkan pilih tanggal lain');
      return;
    }
    if (activeTab === 'Diagram') {
      const newYear = date.getFullYear();
      const updatedDate = new Date(selectedDate);
      updatedDate.setFullYear(newYear);
      setSelectedDate(updatedDate);
    } else {
      setSelectedDate(date);
    }
  };

  // Helper Ping Dot
  const getPingDot = (tabId) => {
    const isTabLoading = tabId === 'Diagram' ? isYearlyLoading : loading;
    const dismissed = dismissedDots[tabId];
    if (!isTabLoading && dismissed) return null;
    return (
      <span className="inline-flex items-center ml-2" aria-hidden>
        {isTabLoading ? (
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
    const isTabLoading = tabId === 'Diagram' ? isYearlyLoading : loading;
    if (!isTabLoading) {
      setDismissedDots((prev) => ({ ...prev, [tabId]: true }));
    }
  };

  useEffect(() => {
    if (loading) setDismissedDots((prev) => ({ ...prev, Detail: false }));
  }, [loading]);

  useEffect(() => {
    if (isYearlyLoading) setDismissedDots((prev) => ({ ...prev, Diagram: false }));
  }, [isYearlyLoading]);

  // ========== FETCH HARIAN (Detail) ==========
  const fetchData = useCallback(async () => {
    if (selectedDate.getDay() === 0) {
      setLoading(false);
      setSummaryData({
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
        totalDry: 0,
        totalFrozen: 0,
        assignedDry: 0,
        assignedFrozen: 0,
      });
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
        timeBy: 'doneTime',
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
          totalDry: 0,
          totalFrozen: 0,
          assignedDry: 0,
          assignedFrozen: 0,
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
      let totalDry = 0;
      let totalFrozen = 0;
      let assignedDry = 0;
      let assignedFrozen = 0;

      for (const task of tasksData) {
        const flow = task.flow || 'N/A';
        const orderInfo = processOrderInfo(task.orderId);

        const typeStorage = (task.typeStorage || '').toUpperCase();
        const isDry = typeStorage === 'DRY';
        const isFrozen = typeStorage === 'FROZEN';

        if (isDry) totalDry++;
        if (isFrozen) totalFrozen++;

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

        const isAssigned = task.status !== 'UNASSIGNED';

        if (isAssigned) {
          if (isDry) assignedDry++;
          if (isFrozen) assignedFrozen++;
        }

        const manualCategory = !task.routePlannedOrder || !task.eta || !task.etd;
        if (manualCategory && isAssigned) {
          const rawAssignee = task.assignee && task.assignee.length > 0 ? task.assignee[0] : 'N/A';
          let finalAssignee = driverMap.get(normalizeEmail(rawAssignee)) || rawAssignee;
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
            const driverName = driverMap.get(normalizeEmail(rawAssignee)) || rawAssignee;

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
        totalDry,
        totalFrozen,
        assignedDry,
        assignedFrozen,
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
  }, [driverData, selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ========== FETCH TAHUNAN ==========
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
            if (Array.isArray(quarterData)) allTasks = allTasks.concat(quarterData);
            else if (quarterData?.data) allTasks = allTasks.concat(quarterData.data);
          } catch (err) {
            console.error(`Gagal ambil data tahunan ${q.label}:`, err);
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

  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    let interval = null;
    if (isYearlyLoading) {
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
  }, [isYearlyLoading]);

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

  const subtitle = (
    <>
      Overview performa <span className="font-semibold text-sky-600">harian & tahunan</span>
    </>
  );

  const isDiagramTab = activeTab === 'Diagram';

  const datePicker = (
    <DatePicker
      calendarClassName={isDiagramTab ? 'custom-year-picker' : ''}
      className="border border-gray-300 rounded-lg p-2.5 text-center font-medium text-slate-700 shadow-sm outline-none w-full md:w-48 cursor-pointer hover:bg-gray-50 transition-colors"
      dateFormat={isDiagramTab ? 'yyyy' : 'dd MMMM yyyy'}
      disabled={loading || (isDiagramTab && isYearlyLoading)}
      dropdownMode="select"
      key={activeTab}
      maxDate={new Date()}
      onChange={handleDateChange}
      selected={selectedDate}
      showMonthDropdown={!isDiagramTab}
      showYearDropdown={!isDiagramTab}
      showYearPicker={isDiagramTab}
      wrapperClassName="w-full md:w-auto"
    />
  );

  const headerItems = [
    {
      label: isDiagramTab ? 'Tahun Performa' : 'Tanggal Pengiriman', // Label juga dinamis biar lebih UX friendly
      component: datePicker,
      hideLabel: false,
    },
  ];

  const cardTabs = [
    { id: 'Diagram', label: 'Diagram', extraContent: getPingDot('Diagram') },
    { id: 'Detail', label: 'Detail', extraContent: getPingDot('Detail') },
  ];

  const isCardLoading = activeTab === 'Diagram' ? isYearlyLoading : false;

  return (
    <div className="w-full max-w-none px-4 sm:px-6 pb-2">
      <HeaderCard title="Dashboard" subtitle={subtitle} items={headerItems} />

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          <strong>Gagal memuat data:</strong> {error}
        </div>
      )}

      <BodyCard
        tabs={cardTabs}
        activeTabId={activeTab}
        onTabClick={handleTabClick}
        isLoading={isCardLoading}
        loadingText="Memuat Data Tahunan..."
        timerStartTime={fetchStartTimeRef.current}
      >
        <div className="p-6 h-full overflow-y-auto">
          {activeTab === 'Detail' && (
            <DashboardDetailTab loading={loading} summaryData={summaryData} />
          )}

          {activeTab === 'Diagram' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-bold text-slate-700">
                  Performa Tahun {selectedDate.getFullYear()}
                </h2>
              </div>

              {!isYearlyLoading && <DiagramTab yearlyTasks={yearlyTasks} hubId={currentHubId} />}
            </div>
          )}
        </div>
      </BodyCard>
    </div>
  );
}
