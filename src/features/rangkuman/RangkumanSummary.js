'use client';

import BodyCard from '@/components/card/BodyCard';
import HeaderCard from '@/components/card/HeaderCard';
import CustomDatePicker from '@/components/CustomDatePicker';
import DownloadButton from '@/components/DownloadButton';
import { useLanguage } from '@/context/LanguageContext';
import useRangkumanData from '@/lib/hooks/useRangkumanData';
import { generateRangkumanWorkbook } from '@/lib/reportGenerators/rangkumanReport';
import { toastError, toastSuccess } from '@/lib/toastHelper';
import { formatDateUniversal, isEmpty } from '@/lib/utils';
import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx-js-style';
import AverageKmTab from './tabs/AverageKmTab';
import PendingReasonsTab from './tabs/PendingReasonsTab';
import PlaceholderTab from './tabs/PlaceholderTab';
import TaskSummaryTab from './tabs/TaskSummaryTab';
import TimeDriverTab from './tabs/TimeDriverTab';
import TimeROTab from './tabs/TimeROTab';
import TruckDetailTab from './tabs/TruckDetailTab';
import TruckUsageTab from './tabs/TruckUsageTab';

export default function RangkumanSummary() {
  const { t, lang } = useLanguage();
  const [activeTab, setActiveTab] = useState('Time RO');

  const {
    selectedLocation,
    selectedLocationName,
    selectedDate,
    setSelectedDate,
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
  } = useRangkumanData();

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDownloadExcel = async () => {
    if (!selectedDate) return;
    if (isEmpty(driverData)) {
      toastError(t('summary.toast.no_driver_data'));
      return;
    }
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    try {
      const { wb, excelFileName } = await generateRangkumanWorkbook(
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
        lang
      );
      XLSX.writeFile(wb, excelFileName);
      toastSuccess(t('summary.toast.success'));
    } catch (err) {
      toastError(t('summary.toast.error', { err: err.message }));
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
    if (activeTab !== 'Task Summary' && activeTab !== 'Time RO' && !reportPreview) return true;

    switch (activeTab) {
      case 'Task Summary':
        return isEmpty(Object.keys(taskSummaryMetrics));
      case 'Truck Usage':
        return !(
          reportPreview?.truckUsageData?.dateMap &&
          Object.values(reportPreview.truckUsageData.dateMap).some(
            (d) => (d.DryTotal || 0) > 0 || (d.FrozenTotal || 0) > 0 || (d.OTV || 0) > 0
          )
        );
      case 'Average KM':
        return (
          !reportPreview?.averageKmData ||
          isEmpty(reportPreview.averageKmData) ||
          !reportPreview.averageKmData.some((row) => (row.totalKm || 0) > 0)
        );
      case 'Truck Detail':
        return !(
          reportPreview?.truckDetailData?.dataMatrix &&
          Object.values(reportPreview.truckDetailData.dataMatrix).some(
            (d) => Object.keys(d).length > 0
          ) &&
          reportPreview.truckDetailData.driverEmails?.length > 0
        );
      case 'Time Driver':
        return !(
          reportPreview?.timeDriverData?.dataMatrix &&
          Object.values(reportPreview.timeDriverData.dataMatrix).some(
            (d) => Object.keys(d).length > 0
          ) &&
          reportPreview.timeDriverData.driverEmails?.length > 0
        );
      case 'Pending Reasons':
        return isEmpty(reportPreview?.pendingReasonsData || []);
      case 'Time RO':
        return !(rawData.tasks && rawData.tasks.some((task) => task.createdFrom === 'API'));
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
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const startStr = formatDateUniversal(new Date(year, month, 1));
    const endStr = formatDateUniversal(new Date(year, month + 1, 0));

    switch (activeTab) {
      case 'Time RO':
        return renderTab(TimeROTab, {
          tasks: rawData.tasks,
          startDateStr: startStr,
          endDateStr: endStr,
          translate: t,
          language: lang,
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
          locationName: selectedLocationName,
          translate: t,
        });
      case 'Time Driver':
        return renderTab(TimeDriverTab, {
          data: reportPreview.timeDriverData,
          translate: t,
          language: lang,
        });
      case 'Truck Detail':
        return renderTab(TruckDetailTab, {
          data: reportPreview.truckDetailData,
          translate: t,
          language: lang,
        });
      case 'Truck Usage':
        return renderTab(TruckUsageTab, {
          data: reportPreview.truckUsageData,
          translate: t,
          hubId: selectedLocation,
          onRefresh: fetchData,
          driverData: driverData,
        });
      case 'Average KM':
        return renderTab(AverageKmTab, {
          data: reportPreview.averageKmData,
          monthTotals: reportPreview.monthTotals,
          translate: t,
          language: lang,
        });
      default:
        return <PlaceholderTab tabName={activeTab} />;
    }
  };

  const headerItems = [
    {
      label: t('summary.label'),
      component: (
        <CustomDatePicker
          dateFormat="MMMM yyyy"
          disableSunday={false}
          isLoading={isLoading}
          onChange={setSelectedDate}
          selected={selectedDate}
          showMonthYearPicker
        />
      ),
      hideLabel: false,
    },
    {
      label: 'Action',
      component: (
        <DownloadButton
          disabled={isLoading || isEmpty(rawData.tasks)}
          isLoading={isLoading}
          onClick={handleDownloadExcel}
          text={`${t('common.download')} Excel`}
        />
      ),
      hideLabel: true,
    },
  ];

  const tabConfig = [
    { id: 'Time RO', label: t('summary.tabs.time_ro.title') },
    { id: 'Task Summary', label: t('summary.tabs.task_summary.title') },
    { id: 'Pending Reasons', label: t('summary.tabs.pending_reasons.title') },
    { id: 'Time Driver', label: t('summary.tabs.time_driver.title') },
    { id: 'Truck Detail', label: t('summary.tabs.truck_detail.title') },
    { id: 'Truck Usage', label: t('summary.tabs.truck_usage.title') },
    { id: 'Average KM', label: t('summary.tabs.average_km.title') },
  ];

  return (
    <div className="w-full max-w-none px-4 sm:px-6 space-y-6 mb-2">
      <HeaderCard
        title={t('summary.title')}
        subtitle={
          <>
            {t('summary.subtitle_1')}{' '}
            <span className="font-semibold text-sky-600">{t('summary.subtitle_highlight')} </span>{' '}
            {t('summary.subtitle_2')}
          </>
        }
        items={headerItems}
      />
      <BodyCard
        activeTabId={activeTab}
        isEmpty={isTabEmpty()}
        isLoading={isLoading}
        onTabClick={handleTabClick}
        tabs={tabConfig.map((tab) => ({
          id: tab.id,
          label: tab.label,
          extraContent: getPingDot(tab.id),
        }))}
        longLoadingContent={
          pendingEndpoints.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-md text-sm animate-pulse shadow-sm">
              <p>
                {t('summary.long_message')}
                {pendingEndpoints.join(', ')}.
              </p>
            </div>
          )
        }
      >
        {isLoading && elapsedTime > 120 && pendingEndpoints.length > 0 && (
          <div className="absolute top-20 left-0 right-0 z-50 flex justify-center pointer-events-none">
            <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-md text-sm animate-pulse">
              <p>
                {t('summary.long_message')} {pendingEndpoints.join(', ')}.
              </p>
            </div>
          </div>
        )}
        {!isLoading && renderContent()}
      </BodyCard>
    </div>
  );
}
