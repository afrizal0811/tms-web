'use client';

import BodyCard from '@/components/card/BodyCard';
import HeaderCard from '@/components/card/HeaderCard';
import CustomDatePicker from '@/components/CustomDatePicker';
import StorageTypeFilter from '@/components/dropdown/StorageTypeFilter';
import VehicleTypeFilter from '@/components/dropdown/VehicleTypeFilter';
import { useLanguage } from '@/context/LanguageContext';
import DetailTab from '@/features/dashboard/tab/DetailTab';
import RoutingVsActualTab from '@/features/dashboard/tab/RoutingVsActualTab';
import { getResultsSummary, getTasks } from '@/lib/api';
import { getCachedHubs, getLocalStorage } from '@/lib/localStorageHandler';
import { toastError, toastWarning } from '@/lib/toast';
import {
  getBaseVehicleType,
  isEmpty,
  normalizeEmail,
  toApiDateString,
  tomorrowDate,
} from '@/lib/utils';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { calculateDashboard } from './help';
import DiagramTab from './tab/DiagramTab';

export default function Dashboard({ driverData }) {
  const { t, isIndonesian } = useLanguage();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [storageFilter, setStorageFilter] = useState(['DRY', 'FROZEN']);
  const [typeFilter, setTypeFilter] = useState('');
  const [masterVehicleTypes, setMasterVehicleTypes] = useState([]);
  const [rawData, setRawData] = useState({ tasks: [], results: [] });
  const [yearlyTasks, setYearlyTasks] = useState([]);
  const [isYearlyLoading, setIsYearlyLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('Detail');
  const [hasPendingGR, setHasPendingGR] = useState(false);
  const [dismissedDots, setDismissedDots] = useState({
    Diagram: false,
    Detail: false,
    RoutingVsActual: false,
  });

  const lastFetchedYear = useRef(null);
  const lastFetchedLocation = useRef(null);
  const inFlightYearFetchKey = useRef(null);
  const yearlyCacheRef = useRef({});
  const fetchStartTimeRef = useRef(null);

  const { storedLocation: hubId } = getLocalStorage();

  useEffect(() => {
    const fetchHubSettings = async () => {
      if (!hubId || isEmpty(driverData)) return;
      try {
        const hubs = getCachedHubs();
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

  const handleDateChange = (date) => {
    if (!date) return;
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

      const localStart = new Date(selectedDate);
      localStart.setHours(0, 0, 0, 0);
      const localEnd = new Date(localStart);
      localEnd.setHours(23, 59, 59, 999);

      const timeFrom = toApiDateString(localStart);
      const timeTo = toApiDateString(localEnd);

      setLoading(true);
      fetchStartTimeRef.current = Date.now();

      const routingStart = new Date(localStart);
      if (routingStart.getDay() === 1) {
        routingStart.setDate(routingStart.getDate() - 2);
      } else {
        routingStart.setDate(routingStart.getDate() - 1);
      }

      const [tasksData, resultsData] = await Promise.all([
        getTasks({
          status: 'DONE,ONGOING,UNASSIGNED',
          hubId,
          timeFrom,
          timeTo,
          timeBy: 'startTime',
        }),
        getResultsSummary({
          routingDateObj: routingStart,
          deliveryDateObj: localStart,
          hubId: hubId,
        }),
      ]);

      const tasksArray = Array.isArray(tasksData) ? tasksData : tasksData?.data || [];
      const resultsArray = Array.isArray(resultsData) ? resultsData : resultsData?.data || [];

      setRawData({ tasks: tasksArray, results: resultsArray });
    } catch (err) {
      toastError(t('common.toast.error', { err: err.message }));
    } finally {
      setLoading(false);
    }
  }, [selectedDate, hubId, t, driverData]);

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
          start: toApiDateString(localStart),
          end: toApiDateString(localEnd),
        });
      }

      let allTasks = [];
      try {
        const promises = monthlyRanges.map((range) =>
          getTasks({
            hubId,
            status: 'DONE',
            timeFrom: range.start,
            timeTo: range.end,
            timeBy: 'startTime',
          })
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
        toastError(t('common.toast.error'), { err: err.message });
      } finally {
        setIsYearlyLoading(false);
      }
    },
    [t]
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

  const applyFilters = useCallback(
    (tasks) => {
      if (isEmpty(tasks)) return [];
      let filtered = tasks;
      if (storageFilter.length === 0) return [];
      if (storageFilter.length === 1) {
        filtered = filtered.filter((t) =>
          storageFilter.includes((t.typeStorage || '').toUpperCase())
        );
      }
      if (typeFilter && typeFilter !== 'all') {
        filtered = filtered.filter((t) => {
          let email = Array.isArray(t.assignee)
            ? t.assignee[0]
            : t.assignee || t.assignedTo?.email || t.doneBy;
          email = normalizeEmail(email);
          const plat =
            t.assignedVehicle?.name || t.assignedVehicle?.plat || t.vehicleName || t.plat;
          const platNorm = (plat || '').replace(/\s+/g, '').toLowerCase();
          const d = driverData?.find(
            (dr) =>
              normalizeEmail(dr.email) === email ||
              (dr.plat && dr.plat.replace(/\s+/g, '').toLowerCase() === platNorm)
          );
          if (!d) return false;
          return getBaseVehicleType(d.type, masterVehicleTypes) === typeFilter;
        });
      }
      return filtered;
    },
    [storageFilter, typeFilter, driverData, masterVehicleTypes]
  );

  const filteredDailyTasks = useMemo(
    () => applyFilters(rawData.tasks),
    [applyFilters, rawData.tasks]
  );
  const filteredYearlyTasks = useMemo(() => applyFilters(yearlyTasks), [applyFilters, yearlyTasks]);

  const summaryData = useMemo(() => {
    return calculateDashboard(filteredDailyTasks, driverMap, isIndonesian, hasPendingGR);
  }, [filteredDailyTasks, driverMap, isIndonesian, hasPendingGR]);

  const isDiagramTab = activeTab === 'Diagram';

  const isLoadingSelected = isDiagramTab ? isYearlyLoading : loading;

  const currentHubId = typeof window !== 'undefined' ? hubId : null;

  let isCardEmpty = false;
  let emptyMessage = t('common.no_data');

  if (isEmpty(driverData) && !loading) {
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

  const headerItems = [
    {
      label: t('common.storage_type'),
      component: (
        <StorageTypeFilter
          disabled={isLoadingSelected}
          onApply={setStorageFilter}
          selectedTypes={storageFilter}
        />
      ),
      hideLabel: false,
    },
    {
      label: t('common.vehicle_type'),
      hideLabel: false,
      component: (
        <VehicleTypeFilter
          data={driverData}
          disabled={isLoadingSelected}
          onApply={setTypeFilter}
          onMasterTypesLoad={setMasterVehicleTypes}
          selectedType={typeFilter}
        />
      ),
    },
    {
      label: isDiagramTab ? t('dashboard.year_performance') : t('common.delivery_date'),
      component: (
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
      ),
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
      <HeaderCard
        title="Dashboard"
        subtitle={
          <>
            {t('dashboard.subtitle')}{' '}
            <span className="font-semibold text-sky-600">{t('dashboard.subtitle_highlight')}</span>
          </>
        }
        items={headerItems}
      />
      <BodyCard
        tabs={cardTabs}
        activeTabId={activeTab}
        onTabClick={handleTabClick}
        isLoading={isLoadingSelected}
        timerStartTime={fetchStartTimeRef.current}
        isEmpty={isCardEmpty}
        emptyMessage={emptyMessage}
        routingData={rawData.results}
        footer={
          activeTab === 'RoutingVsActual' && {
            text: t('common.click_for_detail'),
          }
        }
      >
        <div className="flex-1 flex flex-col p-3 overflow-hidden dark:bg-slate-800">
          {activeTab === 'Detail' && (
            <DetailTab loading={loading} summaryData={summaryData} driverData={driverData} />
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
