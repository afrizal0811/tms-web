'use client';

import BodyCard from '@/components/card/BodyCard';
import HeaderCard from '@/components/card/HeaderCard';
import CustomDatePicker from '@/components/CustomDatePicker';
import StorageTypeFilter from '@/components/StorageTypeFilter';
import { useLanguage } from '@/context/LanguageContext';
import DetailTab from '@/features/dashboard/tab/DetailTab';
import RoutingVsActualTab from '@/features/dashboard/tab/RoutingVsActualTab';
import { getHubs, getResultsSummary, getTasks } from '@/lib/api';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError, toastWarning } from '@/lib/toastHelper';
import { formatToApiUtc, isEmpty, normalizeEmail, tomorrowDate } from '@/lib/utils';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { calculateDashboardSummary } from './help';
import DiagramTab from './tab/DiagramTab';

export default function DashboardSummary({ driverData }) {
  const { t, lang } = useLanguage();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [storageFilter, setStorageFilter] = useState(['DRY', 'FROZEN']);
  const [isFiltering, setIsFiltering] = useState(false);
  const [rawData, setRawData] = useState({ tasks: [], results: [] });
  const [yearlyTasks, setYearlyTasks] = useState([]);
  const [isYearlyLoading, setIsYearlyLoading] = useState(false);

  const lastFetchedYear = useRef(null);
  const lastFetchedLocation = useRef(null);
  const inFlightYearFetchKey = useRef(null);
  const yearlyCacheRef = useRef({});
  const fetchStartTimeRef = useRef(null);

  const [activeTab, setActiveTab] = useState('Detail');
  const [dismissedDots, setDismissedDots] = useState({
    Diagram: false,
    Detail: false,
    RoutingVsActual: false,
  });

  const { storedLocation: hubId } = getLocalStorage();
  const [hasPendingGR, setHasPendingGR] = useState(false);

  useEffect(() => {
    const fetchHubSettings = async () => {
      if (!hubId || isEmpty(driverData)) return;
      try {
        const hubs = await getHubs();
        const activeHub = hubs.find(
          (h) => String(h._id) === String(hubId) || String(h.id) === String(hubId)
        );
        if (activeHub) {
          setHasPendingGR(activeHub.hasPendingGR || false);
        }
      } catch (error) {}
    };
    fetchHubSettings();
  }, [hubId, driverData]);

  const handleApplyFilter = (newSelectedTypes) => {
    fetchStartTimeRef.current = Date.now();
    setIsFiltering(true);

    setTimeout(() => {
      setStorageFilter(newSelectedTypes);
      setIsFiltering(false);
    }, 200);
  };

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
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (isEmpty(driverData)) {
      setLoading(false);
      setRawData({ tasks: [], results: [] });
      return;
    }

    if (selectedDate.getDay() === 0) {
      setLoading(false);
      setRawData({ tasks: [], results: [] });
      return;
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

      const tasksArray = Array.isArray(tasksData) ? tasksData : tasksData?.data || [];
      const resultsArray = Array.isArray(resultsData) ? resultsData : resultsData?.data || [];

      setRawData({ tasks: tasksArray, results: resultsArray });
    } catch (err) {
      toastError(err.message || t('dashboard.toast.daily_fetch_error'));
    } finally {
      setLoading(false);
    }
  }, [selectedDate, fetchWithRetry, hubId, t, driverData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
            toastWarning('dashboard.toast.partial_warning', { err: res.reason });
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
    if (!hubId || isEmpty(driverData)) return;

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
  }, [selectedDate, activeTab, fetchYearlyData, hubId, driverData]);

  const driverMap = useMemo(() => {
    const map = new Map();
    if (driverData) {
      driverData.forEach((driver) => {
        if (driver.email && driver.name) {
          map.set(normalizeEmail(driver.email), driver.name);
        }
      });
    }
    return map;
  }, [driverData]);

  const filteredDailyTasks = useMemo(() => {
    if (isEmpty(rawData.tasks)) return [];
    if (storageFilter.length === 0) return [];
    if (storageFilter.length === 2) return rawData.tasks;

    return rawData.tasks.filter((t) => {
      const type = (t.typeStorage || '').toUpperCase();
      return storageFilter.includes(type);
    });
  }, [rawData.tasks, storageFilter]);

  const filteredYearlyTasks = useMemo(() => {
    if (isEmpty(yearlyTasks)) return [];
    if (storageFilter.length === 0) return [];
    if (storageFilter.length === 2) return yearlyTasks;

    return yearlyTasks.filter((t) => {
      const type = (t.typeStorage || '').toUpperCase();
      return storageFilter.includes(type);
    });
  }, [yearlyTasks, storageFilter]);

  const summaryData = useMemo(() => {
    return calculateDashboardSummary(filteredDailyTasks, driverMap, lang, hasPendingGR);
  }, [filteredDailyTasks, driverMap, lang, hasPendingGR]);

  const isDiagramTab = activeTab === 'Diagram';

  const isLoadingSelected = (isDiagramTab ? isYearlyLoading : loading) || isFiltering;

  const currentHubId = typeof window !== 'undefined' ? hubId : null;

  let isCardEmpty = false;
  let emptyMessage = t('common.no_data');

  if (isEmpty(driverData)) {
    isCardEmpty = true;
    emptyMessage = t('common.no_driver');
  } else if (activeTab === 'Diagram') {
    isCardEmpty = !isYearlyLoading && (!filteredYearlyTasks || isEmpty(filteredYearlyTasks));
  } else if (activeTab === 'Detail') {
    isCardEmpty =
      !loading &&
      (!summaryData ||
        isEmpty(summaryData.totalTasks) ||
        (isEmpty(summaryData.done) && isEmpty(summaryData.ongoing)));
  } else if (activeTab === 'RoutingVsActual') {
    const noOngoingAndDone = !filteredDailyTasks?.some(
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
      maxDate={isDiagramTab ? new Date() : tomorrowDate()}
      disableSunday={!isDiagramTab}
    />
  );

  const storageFilterComponent = (
    <StorageTypeFilter selectedTypes={storageFilter} onApply={handleApplyFilter} />
  );

  const headerItems = [
    {
      label: t('common.storage_type'),
      component: storageFilterComponent,
      hideLabel: false,
    },
    {
      label: isDiagramTab ? t('dashboard.year_performance') : t('common.delivery_date'),
      component: datePicker,
      hideLabel: false,
    },
  ];

  const cardTabs = [
    { id: 'Detail', label: t('dashboard.tabs.detail'), extraContent: getPingDot('Detail') },
    { id: 'Diagram', label: t('dashboard.tabs.diagram'), extraContent: getPingDot('Diagram') },
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
        timerStartTime={fetchStartTimeRef.current}
        isEmpty={isCardEmpty}
        emptyMessage={emptyMessage}
      >
        <div className="flex-1 flex flex-col p-3 overflow-hidden dark:bg-slate-800">
          {activeTab === 'Detail' && (
            <DetailTab loading={loading} summaryData={summaryData} hasPendingGR={hasPendingGR} />
          )}

          {activeTab === 'RoutingVsActual' && (
            <RoutingVsActualTab
              loading={loading}
              tasks={filteredDailyTasks}
              results={rawData.results}
              drivers={driverData}
              selectedDate={selectedDate}
              hasPendingGR={hasPendingGR}
            />
          )}

          {activeTab === 'Diagram' && !isYearlyLoading && (
            <DiagramTab
              yearlyTasks={filteredYearlyTasks}
              hubId={currentHubId}
              driverData={driverData}
              selectedDate={selectedDate}
              hasPendingGR={hasPendingGR}
            />
          )}
        </div>
      </BodyCard>
    </div>
  );
}
