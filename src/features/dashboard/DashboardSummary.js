'use client';

import BodyCard from '@/components/card/BodyCard';
import HeaderCard from '@/components/card/HeaderCard';
import CustomDatePicker from '@/components/CustomDatePicker';
import { useLanguage } from '@/context/LanguageContext';
import DetailTab from '@/features/dashboard/tab/DetailTab';
import RoutingVsActualTab from '@/features/dashboard/tab/RoutingVsActualTab';
import { getResultsSummary, getTasks } from '@/lib/apiService';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError, toastWarning } from '@/lib/toastHelper';
import { formatDateWIB, formatToApiUtc, isEmpty, normalizeEmail } from '@/lib/utils';
import { useCallback, useEffect, useRef, useState } from 'react';
import DiagramTab from './tab/DiagramTab';

function processOrderInfo(rawOrderId, t) {
  if (!rawOrderId || rawOrderId === 'N/A') {
    return { tooltip: t('dashboard.no_so'), copyValue: null };
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

export default function DashboardSummary({ driverData }) {
  const { t, lang } = useLanguage();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState(null);
  const [rawData, setRawData] = useState({ tasks: [], results: [] });
  const [yearlyTasks, setYearlyTasks] = useState([]);
  const [isYearlyLoading, setIsYearlyLoading] = useState(false);

  const lastFetchedYear = useRef(null);
  const lastFetchedLocation = useRef(null);
  const inFlightYearFetchKey = useRef(null);
  const yearlyCacheRef = useRef({});
  const fetchStartTimeRef = useRef(null);

  const [activeTab, setActiveTab] = useState('Diagram');
  const [dismissedDots, setDismissedDots] = useState({
    Diagram: false,
    Detail: false,
    RoutingVsActual: false,
  });

  const { storedLocation: hubId } = getLocalStorage();
  const handleDateChange = (date) => {
    if (!date) return;

    if (activeTab !== 'Diagram' && date.getDay() === 0) {
      toastError(t('dashboard.toast.sunday_error'));
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
    if (loading) {
      setDismissedDots((prev) => ({ ...prev, Detail: false, RoutingVsActual: false }));
    }
  }, [loading]);

  useEffect(() => {
    if (isYearlyLoading) setDismissedDots((prev) => ({ ...prev, Diagram: false }));
  }, [isYearlyLoading]);

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
      setRawData({ tasks: [], results: [] });
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
      toastWarning(t('dashboard.toast.driver_cache_warning'));
    }

    try {
      if (typeof window === 'undefined') return;

      if (!hubId) throw new Error('Lokasi Hub tidak ditemukan. Harap login ulang.');

      const localStart = new Date(selectedDate);
      localStart.setHours(0, 0, 0, 0);
      const localEnd = new Date(localStart);
      localEnd.setHours(23, 59, 59, 999);

      const timeFrom = formatToApiUtc(localStart);
      const timeTo = formatToApiUtc(localEnd);

      setLoading(true);
      setSummaryData(null);
      fetchStartTimeRef.current = Date.now();

      const routingStart = new Date(localStart);
      if (routingStart.getDay() === 1) {
        routingStart.setDate(routingStart.getDate() - 2);
      } else {
        routingStart.setDate(routingStart.getDate() - 1);
      }
      const routingTimeFrom = formatToApiUtc(routingStart);

      const [tasksData, resultsData] = await Promise.all([
        fetchWithRetry(() =>
          getTasks({
            status: 'DONE,ONGOING,UNASSIGNED',
            hubId,
            timeFrom,
            timeTo,
            timeBy: 'startTime',
            limit: 1000,
          })
        ),
        fetchWithRetry(() =>
          getResultsSummary({
            dateFrom: routingTimeFrom,
            dateTo: timeTo,
            limit: 500,
            hubId: hubId,
          })
        ),
      ]);

      // Pastikan data tersimpan sebagai array
      const tasksArray = Array.isArray(tasksData) ? tasksData : tasksData?.data || [];
      const resultsArray = Array.isArray(resultsData) ? resultsData : resultsData?.data || [];

      setRawData({ tasks: tasksArray, results: resultsArray });

      if (isEmpty(tasksArray)) {
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

      for (const task of tasksArray) {
        const flow = task.flow || 'N/A';
        const orderInfo = processOrderInfo(task.orderId, t);

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
          const startDateWIB = formatDateWIB(task.startTime, 'DD-MM-YYYY');
          const doneDateWIB = formatDateWIB(task.doneTime, 'DD-MM-YYYY');

          if (startDateWIB && doneDateWIB && startDateWIB !== doneDateWIB) {
            const startDate = new Date(task.startTime);
            const doneDate = new Date(task.doneTime);
            const diffInMs = doneDate.getTime() - startDate.getTime();
            const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
            const datePlusText = lang === 'id' ? 'H+' : 'D+';
            const rawAssignee =
              task.assignee && task.assignee.length > 0 ? task.assignee[0] : 'N/A';
            const driverName = driverMap.get(normalizeEmail(rawAssignee)) || rawAssignee;
            crossDayTasks.push({
              customer: task.customerName || 'N/A',
              doneDateDisplay: `${doneDateWIB} (${datePlusText}${diffInDays})`,
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
        totalTasks: tasksArray.length,
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
    } catch (err) {
      toastError(err.message || t('dashboard.toast.daily_fetch_error'));
    } finally {
      setLoading(false);
    }
  }, [driverData, selectedDate, fetchWithRetry, hubId, t, lang]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- FETCH YEARLY DATA (ROBUST VERSION) ---
  const fetchYearlyData = useCallback(
    async (hubId, year) => {
      setIsYearlyLoading(true);
      setYearlyTasks([]);

      const monthlyRanges = [];
      for (let i = 0; i < 12; i++) {
        const lastDayOfThisMonth = new Date(year, i + 1, 0).getDate();
        const localStart = new Date(year, i, 1, 0, 0, 0);
        const localEnd = new Date(year, i, lastDayOfThisMonth, 23, 59, 59);

        monthlyRanges.push({
          start: formatToApiUtc(localStart),
          end: formatToApiUtc(localEnd),
        });
      }

      let allTasks = [];
      try {
        const promises = monthlyRanges.map((range) =>
          fetchWithRetry(() =>
            getTasks({
              hubId,
              status: 'DONE',
              timeFrom: range.start,
              timeTo: range.end,
              timeBy: 'startTime',
              limit: 10000,
            })
          )
        );

        // Menggunakan allSettled agar robust terhadap kegagalan parsial
        const results = await Promise.allSettled(promises);

        let failureCount = 0;
        results.forEach((res) => {
          if (res.status === 'fulfilled') {
            const data = res.value;
            if (Array.isArray(data)) {
              allTasks = [...allTasks, ...data];
            } else if (data?.data) {
              allTasks = [...allTasks, ...data.data];
            }
          } else {
            console.warn('Partial yearly fetch failed:', res.reason);
            failureCount++;
          }
        });

        if (failureCount === 12) {
          throw new Error('Gagal mengambil seluruh data tahunan.');
        }

        setYearlyTasks(allTasks);
        lastFetchedYear.current = year;
        lastFetchedLocation.current = hubId;

        const cacheKey = `${hubId}:${year}`;
        yearlyCacheRef.current[cacheKey] = allTasks;
      } catch (err) {
        toastError(t('dashboard.toast.yearly_fetch_error'), err);
      } finally {
        setIsYearlyLoading(false);
      }
    },
    [fetchWithRetry, t]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (activeTab !== 'Diagram') return;

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
  }, [selectedDate, activeTab, fetchYearlyData, hubId]);

  const isDiagramTab = activeTab === 'Diagram';
  const isLoadingSelected = isDiagramTab ? isYearlyLoading : loading;
  const currentHubId = typeof window !== 'undefined' ? hubId : null;

  let isCardEmpty = false;

  if (activeTab === 'Diagram') {
    isCardEmpty = !isYearlyLoading && (!yearlyTasks || isEmpty(yearlyTasks));
  } else if (activeTab === 'Detail') {
    isCardEmpty =
      !loading &&
      (!summaryData ||
        isEmpty(summaryData.totalTasks) ||
        (isEmpty(summaryData.done) && isEmpty(summaryData.ongoing)));
  } else if (activeTab === 'RoutingVsActual') {
    const noOngoingAndDone = !rawData.tasks?.some(
      (t) => t?.status === 'ONGOING' || t?.status === 'DONE'
    );
    isCardEmpty = !loading && noOngoingAndDone;
  }

  const subtitle = (
    <>
      {t('dashboard.subtitle')}{' '}
      <span className="font-semibold text-sky-600">{t('dashboard.subtitle_highlight')}</span>
    </>
  );

  const datePicker = (
    <CustomDatePicker
      selected={selectedDate}
      onChange={handleDateChange}
      isLoading={isDiagramTab ? isYearlyLoading : loading}
      dateFormat={isDiagramTab ? 'yyyy' : 'dd MMMM yyyy'}
      showYearPicker={isDiagramTab}
      className="custom-year-picker"
    />
  );

  const headerItems = [
    {
      label: isDiagramTab ? t('dashboard.year_performance') : t('common.delivery_date'),
      component: datePicker,
      hideLabel: false,
    },
  ];

  const cardTabs = [
    { id: 'Diagram', label: t('dashboard.tabs.diagram'), extraContent: getPingDot('Diagram') },
    { id: 'Detail', label: t('dashboard.tabs.detail'), extraContent: getPingDot('Detail') },
    {
      id: 'RoutingVsActual',
      label: t('dashboard.tabs.routing_vs_actual'),
      extraContent: getPingDot('RoutingVsActual'),
    },
  ];

  return (
    <div className="w-full max-w-none px-4 sm:px-6 pb-2">
      <HeaderCard title="Dashboard" subtitle={subtitle} items={headerItems} />
      <BodyCard
        tabs={cardTabs}
        activeTabId={activeTab}
        onTabClick={handleTabClick}
        isLoading={isLoadingSelected}
        loadingText={t('common.loading')}
        timerStartTime={fetchStartTimeRef.current}
        isEmpty={isCardEmpty}
      >
        <div className="flex-1 flex flex-col p-3 overflow-hidden">
          {activeTab === 'Detail' && <DetailTab loading={loading} summaryData={summaryData} />}

          {activeTab === 'RoutingVsActual' && (
            <RoutingVsActualTab
              loading={loading}
              tasks={rawData.tasks}
              results={rawData.results}
              drivers={driverData}
            />
          )}

          {activeTab === 'Diagram' && !isYearlyLoading && (
            <DiagramTab
              yearlyTasks={yearlyTasks}
              hubId={currentHubId}
              driverData={driverData}
              selectedDate={selectedDate}
            />
          )}
        </div>
      </BodyCard>
    </div>
  );
}
