'use client';

import ReportTemplate from '@/components/page/ReportTemplate';
import { useState } from 'react';
import { handleBreadDownload } from './helper/breadHelper';

export default function BreadReport({
  driverData,
  hubAcronym,
  hubId,
  hubName,
  isIndonesian,
  isLoading,
  setIsLoading,
  t,
}) {
  const [singleDate, setSingleDate] = useState(new Date());
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [selectedMode, setSelectedMode] = useState({
    bulk: false,
    manual: false,
    custom: false,
  });
  const { bulk: isBulkMode } = selectedMode;

  const handleRadioToggle = (mode) => {
    if (isLoading) return;
    setSelectedMode((prev) => ({
      bulk: false,
      manual: false,
      custom: false,
      [mode]: !prev[mode],
    }));
  };

  const executeProcess = () => {
    handleBreadDownload({
      isBulkMode,
      startDate,
      endDate,
      singleDate,
      driverData,
      hubId,
      hubAcronym,
      hubName,
      t,
      setIsLoading,
    });
  };

  const handleDateRangeChange = (dates) => {
    const [start, end] = dates;
    setStartDate(start);
    setEndDate(end);
  };

  const bulkText = isBulkMode ? t('common.bulk') : '';
  const titleMenu = isIndonesian
    ? `${t('report.bread_report')} ${bulkText}`.trim()
    : `${bulkText} ${t('report.bread_report')}`.trim();

  return (
    <ReportTemplate
      title={titleMenu}
      selectedMode={selectedMode}
      onToggleMode={handleRadioToggle}
      availableModes={['bulk']}
      singleDate={singleDate}
      onSingleDateChange={setSingleDate}
      startDate={startDate}
      endDate={endDate}
      onDateRangeChange={handleDateRangeChange}
      isLoading={isLoading}
      onAction={executeProcess}
      actionText={t('common.download')}
    />
  );
}
