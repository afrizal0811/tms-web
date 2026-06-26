'use client';

import Button from '@/components/Button';
import BodyCard from '@/components/card/BodyCard';
import HeaderCard from '@/components/card/HeaderCard';
import CustomDatePicker from '@/components/CustomDatePicker';
import ConfirmModal from '@/components/modal/ConfirmModal';
import { useLanguage } from '@/context/LanguageContext';
import { getHubs, getPendingDetails, getReasons } from '@/lib/api';
import useSummaryData from '@/lib/hooks/useSummaryData';
import { generateSummaryWorkbook } from '@/lib/reportGenerators';
import { toastError, toastSuccess } from '@/lib/toast';
import { formatDateUniversal, getUTC7DateString, isEmpty } from '@/lib/utils';
import { useCallback, useEffect, useState } from 'react';
import * as XLSX from 'xlsx-js-style';
import AverageDistanceTab from './tabs/AverageDistanceTab';
import PendingReasonsTab from './tabs/PendingReasonsTab';
import RoutingTimeTab from './tabs/RoutingTimeTab';
import TaskSummaryTab from './tabs/TaskSummaryTab';
import TimeDriverTab from './tabs/TimeDriverTab';
import TruckDetailTab from './tabs/TruckDetailTab';
import TruckUsageTab from './tabs/TruckUsageTab';

export default function SummaryPage() {
  const { t, localeCode, isIndonesian } = useLanguage();
  const {
    selectedLocation,
    selectedLocationName,
    dateRange,
    setDateRange,
    driverData,
    rawData,
    isLoading,
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
  } = useSummaryData();

  const [activeTab, setActiveTab] = useState('Routing Time');
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [pendingDateRange, setPendingDateRange] = useState([null, null]);
  const [tempDateRange, setTempDateRange] = useState(dateRange || [null, null]);
  const [hasPendingGR, setHasPendingGR] = useState(false);
  const [reasons, setReasons] = useState([]);
  const [pendingDetails, setPendingDetails] = useState([]);
  const [isDownload, setIsDownload] = useState(false);
  const [emptyMessage, setEmptyMessage] = useState('');

  const driverChecker = useCallback(
    (data) => {
      if (isEmpty(data)) {
        setEmptyMessage(t('common.no_driver'));
        return;
      }

      setEmptyMessage('');
    },
    [t]
  );

  useEffect(() => {
    driverChecker(driverData);
    getReasons()
      .then(setReasons)
      .catch(() => {});
  }, [driverData, driverChecker, t]);

  useEffect(() => {
    driverChecker(driverData);
    if (dateRange && dateRange[0] && dateRange[1]) {
      const start = formatDateUniversal(new Date(dateRange[0]), 'YYYY-MM-DD');
      const end = formatDateUniversal(new Date(dateRange[1]), 'YYYY-MM-DD');
      getPendingDetails(start, end)
        .then(setPendingDetails)
        .catch(() => {});
    }
  }, [dateRange, driverChecker, driverData, t]);

  const handleUpdatePendingDetail = (updatedDetail) => {
    setPendingDetails((prev) => {
      if (updatedDetail.deleted) {
        return prev.filter((p) => p.taskId !== updatedDetail.taskId);
      }
      const exists = prev.find((p) => p.taskId === updatedDetail.taskId);
      if (exists) {
        return prev.map((p) => (p.taskId === updatedDetail.taskId ? updatedDetail : p));
      }
      return [...prev, updatedDetail];
    });
  };

  useEffect(() => {
    const fetchHubSettings = async () => {
      if (!selectedLocation) return;
      driverChecker(driverData);
      try {
        const hubs = await getHubs();
        const activeHub = hubs.find(
          (h) =>
            String(h._id) === String(selectedLocation) || String(h.id) === String(selectedLocation)
        );
        if (activeHub) {
          setHasPendingGR(activeHub.hasPendingGR || false);
        }
      } catch (error) {}
    };
    fetchHubSettings();
  }, [selectedLocation, driverData, driverChecker, t]);

  const handleTempDateChange = (update) => {
    setTempDateRange(update);
  };

  const handleApplyDate = () => {
    const [start, end] = tempDateRange;
    if (start && end) {
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      if (diffDays > 14) {
        setPendingDateRange(tempDateRange);
        setShowWarningModal(true);
      } else {
        setDateRange(tempDateRange);
      }
    } else {
      setDateRange(tempDateRange);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDownloadExcel = async () => {
    try {
      if (!dateRange || !dateRange[0] || !dateRange[1]) return;
      driverChecker(driverData);
      setIsDownload(true);
      const startDate = new Date(dateRange[0]);
      const endDate = new Date(dateRange[1]);
      const { wb, excelFileName } = await generateSummaryWorkbook(
        driverData,
        rawData.tasks,
        rawData.results,
        rawData.locations,
        formatDateUniversal(startDate),
        formatDateUniversal(endDate),
        selectedLocationName,
        selectedLocation,
        taskSummaryMetrics,
        masterTruckData || { Dry: { Total: 0 }, Frozen: { Total: 0 } },
        t,
        localeCode,
        hasPendingGR,
        pendingDetails
      );
      XLSX.writeFile(wb, excelFileName);
      toastSuccess(t('common.toast.success'));
    } catch (err) {
      toastError(t('common.toast.error', { err: err.message }));
    } finally {
      setIsDownload(false);
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
    if (!isLoading) setDismissedDots((prev) => ({ ...prev, [tabId]: true }));
  };

  const isTabEmpty = () => {
    if (isLoading) return false;
    if (isEmpty(driverData)) return true;
    const parseDateRange = (dateRange) => {
      const [start, end] = dateRange || [];
      return {
        startStr: start ? formatDateUniversal(new Date(start), 'YYYY-MM-DD') : null,
        endStr: end ? formatDateUniversal(new Date(end), 'YYYY-MM-DD') : null,
      };
    };
    const isInDateRange = (dateKey, startStr, endStr) => dateKey >= startStr && dateKey <= endStr;

    switch (activeTab) {
      case 'Routing Time': {
        const { startStr, endStr } = parseDateRange(dateRange);
        return !rawData.tasks?.some((t) => {
          if (t.createdFrom !== 'API') return false;
          if (!startStr || !endStr) return true;
          const assignedDate = t.createdTime ? getUTC7DateString(t.createdTime) : null;
          return assignedDate && isInDateRange(assignedDate, startStr, endStr);
        });
      }
      case 'Task Summary': {
        const metricKeys = Object.keys(taskSummaryMetrics);
        if (isEmpty(metricKeys)) return true;
        const { startStr, endStr } = parseDateRange(dateRange);
        if (!startStr || !endStr) return false;
        return !metricKeys.some((dateKey) => isInDateRange(dateKey, startStr, endStr));
      }
      case 'Pending Reasons':
        return isEmpty(reportPreview?.pendingReasonsData || []);
      case 'Time Driver': {
        const { dataMatrix, driverEmails } = reportPreview?.timeDriverData || {};
        return !(
          dataMatrix &&
          Object.values(dataMatrix).some((d) => Object.keys(d).length > 0) &&
          driverEmails?.length > 0
        );
      }
      case 'Truck Detail': {
        const dataMatrix = reportPreview?.truckDetailData?.dataMatrix;
        if (!dataMatrix || isEmpty(Object.keys(dataMatrix))) return true;
        const { startStr, endStr } = parseDateRange(dateRange);
        if (!startStr || !endStr) return false;
        return !Object.entries(dataMatrix).some(
          ([dateKey, val]) =>
            isInDateRange(dateKey, startStr, endStr) && Object.keys(val).length > 0
        );
      }
      case 'Truck Usage': {
        const dateMap = reportPreview?.truckUsageData?.dateMap;
        return !(
          dateMap &&
          Object.values(dateMap).some(
            (d) => (d.DryTotal || 0) > 0 || (d.FrozenTotal || 0) > 0 || (d.OTV || 0) > 0
          )
        );
      }
      case 'Average KM': {
        const data = reportPreview?.averageDistanceData;
        return !data || isEmpty(data) || !data.some((row) => (row.totalKm || 0) > 0);
      }
      default:
        return false;
    }
  };
  const renderContent = () => {
    const renderTab = (Component, props) => (
      <div className="w-full h-full flex flex-col">
        <Component {...props} />
      </div>
    );

    const startStr = dateRange && dateRange[0] ? formatDateUniversal(new Date(dateRange[0])) : '';
    const endStr = dateRange && dateRange[1] ? formatDateUniversal(new Date(dateRange[1])) : '';

    switch (activeTab) {
      case 'Routing Time':
        return renderTab(RoutingTimeTab, {
          tasks: rawData.tasks,
          startDateStr: startStr,
          endDateStr: endStr,
          translate: t,
          localeCode: localeCode,
        });
      case 'Task Summary':
        return renderTab(TaskSummaryTab, {
          metrics: taskSummaryMetrics,
          isLoading: isCalculatingMetrics,
          progress: historyProgress,
          startDateStr: startStr,
          endDateStr: endStr,
          isHasData: Object.entries(taskSummaryMetrics).length > 0,
          translate: t,
          masterTruckData: masterTruckData,
        });
      case 'Pending Reasons':
        return renderTab(PendingReasonsTab, {
          data: reportPreview?.pendingReasonsData || [],
          pendingDetails: pendingDetails,
          reasons: reasons,
          onUpdatePendingDetail: handleUpdatePendingDetail,
          hasPendingGR: hasPendingGR,
          translate: t,
        });
      case 'Time Driver':
        return renderTab(TimeDriverTab, {
          data: reportPreview.timeDriverData,
          translate: t,
          localeCode: localeCode,
          activeHubLocation: activeHubLocation,
        });
      case 'Truck Detail':
        return renderTab(TruckDetailTab, {
          data: reportPreview.truckDetailData,
          translate: t,
          localeCode: localeCode,
          isIndonesian: isIndonesian,
        });
      case 'Truck Usage':
        return renderTab(TruckUsageTab, {
          data: reportPreview.truckUsageData,
          translate: t,
          hubId: selectedLocation,
          onRefresh: fetchData,
          driverData: driverData,
          localeCode: localeCode,
        });
      case 'Average KM':
        return renderTab(AverageDistanceTab, {
          data: reportPreview.averageDistanceData,
          monthTotals: reportPreview.monthTotals,
          translate: t,
          localeCode: localeCode,
        });
    }
  };

  const getMaxDate = () => {
    const today = new Date();
    const day = today.getDay();
    const max = new Date(today);

    if (day === 6) {
      max.setDate(max.getDate() + 2);
    } else {
      max.setDate(max.getDate() + 1);
    }
    return max;
  };

  const maxDateConfig = getMaxDate();

  const headerItems = [
    {
      label: t('summary.label'),
      component: (
        <CustomDatePicker
          selectsRange={true}
          startDate={tempDateRange ? tempDateRange[0] : null}
          endDate={tempDateRange ? tempDateRange[1] : null}
          onChange={handleTempDateChange}
          isLoading={isLoading}
          showApplyButton={true}
          onApply={handleApplyDate}
          applyText={t('common.apply')}
          maxDate={maxDateConfig}
          useCustomRangeFormat={true}
        />
      ),
      hideLabel: false,
    },
    {
      label: 'Action',
      component: (
        <Button
          disabled={isLoading || isDownload || isEmpty(rawData.tasks)}
          isLoading={isDownload}
          onClick={handleDownloadExcel}
          text={t('common.download')}
        />
      ),
      hideLabel: true,
    },
  ];

  const tabConfig = [
    { id: 'Routing Time', label: t('summary.tabs.routing_time.title') },
    { id: 'Task Summary', label: t('summary.tabs.task_summary.title') },
    { id: 'Pending Reasons', label: t('summary.tabs.pending_reasons.title') },
    { id: 'Time Driver', label: t('summary.tabs.time_driver.title') },
    { id: 'Truck Detail', label: t('summary.tabs.truck_detail.title') },
    { id: 'Truck Usage', label: t('summary.tabs.truck_usage.title') },
    { id: 'Average KM', label: t('summary.tabs.average_km.title') },
  ];
  const longLoading = pendingEndpoints.length > 0 && (
    <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-md text-sm animate-pulse shadow-sm">
      <p>{t('summary.long_message')}</p>
      <p className="font-semibold text-center">{pendingEndpoints.join(', ')}</p>
    </div>
  );

  return (
    <div className="w-full max-w-none px-4 sm:px-6 space-y-6 mb-2">
      <HeaderCard
        title={t('summary.title')}
        subtitle={
          <>
            {t('summary.subtitle_1')}{' '}
            <span className="font-semibold text-sky-600">{t('summary.subtitle_highlight')} </span>
          </>
        }
        items={headerItems}
      />
      <BodyCard
        activeTabId={activeTab}
        isEmpty={isTabEmpty()}
        emptyMessage={emptyMessage}
        isLoading={isLoading}
        onTabClick={handleTabClick}
        tabs={tabConfig.map((tab) => ({
          id: tab.id,
          label: tab.label,
          extraContent: getPingDot(tab.id),
        }))}
        longLoadingContent={longLoading}
        routingData={rawData.results}
      >
        {!isLoading && renderContent()}
      </BodyCard>
      <ConfirmModal
        isOpen={showWarningModal}
        title={t('common.modal.data_load_title')}
        message={t('common.modal.data_load_message', { days: 14 })}
        onConfirm={() => {
          setDateRange(pendingDateRange);
          setShowWarningModal(false);
        }}
        onCancel={() => {
          setShowWarningModal(false);
          setTempDateRange(dateRange);
        }}
      />
    </div>
  );
}
