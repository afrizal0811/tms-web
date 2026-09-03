'use client';

import Report from '@/components/page/Report';
import { useLanguage } from '@/context/LanguageContext';
import { getTasks } from '@/lib/api';
import { getDriverData } from '@/lib/driverData';
import { getLocalStorage } from '@/lib/localStorageHandler';
import {
  buildDriverMap,
  extractBreadRows,
  generateBreadWorkbook,
} from '@/lib/reportGenerators/reports';
import { toastError, toastSuccess } from '@/lib/toast';
import { formatDateUniversal, isEmpty, toApiDateString, tomorrowDate } from '@/lib/utils';
import { useState } from 'react';
import * as XLSX from 'xlsx-js-style';
import { getDatesInRange } from './helper/help';

const getDateParams = (date) => {
  const localStart = new Date(date);
  localStart.setHours(0, 0, 0, 0);
  const localEnd = new Date(date);
  localEnd.setHours(23, 59, 59, 999);
  return {
    timeFrom: toApiDateString(localStart),
    timeTo: toApiDateString(localEnd),
  };
};

export default function BreadReport() {
  const [singleDate, setSingleDate] = useState(new Date());
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { t, isIndonesian } = useLanguage();

  const handleRadioToggle = (mode) => {
    if (isLoading) return;
    if (mode === 'bulk') setIsBulkMode(!isBulkMode);
  };

  const executeProcess = async () => {
    setIsLoading(true);
    try {
      const { storedLocation, storedLocationName, storedLocationAcronym } = getLocalStorage();
      const driverData = await getDriverData(storedLocation);
      const driverMap = buildDriverMap(driverData);

      const datesToProcess = isBulkMode
        ? getDatesInRange(startDate, endDate || startDate)
        : [singleDate];
      const allRows = [];

      for (const date of datesToProcess) {
        const { timeFrom, timeTo } = getDateParams(date);

        const tasks = await getTasks({
          hubId: storedLocation,
          status: 'DONE,ONGOING',
          timeFrom,
          timeTo,
          timeBy: 'startTime',
        });

        const tasksData = !isEmpty(tasks) && Array.isArray(tasks) ? tasks : tasks?.data || [];
        if (isEmpty(tasksData)) continue;

        const dateStr = formatDateUniversal(date, 'DD-MM-YYYY');
        const rows = extractBreadRows(tasksData, driverMap, dateStr);
        allRows.push(...rows);
      }

      if (allRows.length === 0) {
        throw new Error(t('common.no_data'));
      }

      const wb = generateBreadWorkbook(allRows, t);
      let dateLabel = '';
      if (isBulkMode) {
        const startStr = formatDateUniversal(startDate, 'DD.MM.YYYY');
        const endStr = endDate ? formatDateUniversal(endDate, 'DD.MM.YYYY') : startStr;
        dateLabel = startStr === endStr ? startStr : `${startStr} - ${endStr}`;
      } else {
        dateLabel = formatDateUniversal(singleDate, 'DD.MM.YYYY');
      }

      const locationName = storedLocationAcronym || storedLocationName;
      const fileName = `${t('report.bread_report')} - ${dateLabel} - ${locationName}.xlsx`;

      XLSX.writeFile(wb, fileName);
      toastSuccess(t('common.toast.success'));
    } catch (error) {
      toastError(t('common.toast.error', { err: error.message }));
    } finally {
      setIsLoading(false);
    }
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
    <Report
      title={titleMenu}
      isBulkMode={isBulkMode}
      onToggleMode={handleRadioToggle}
      availableModes={['bulk']}
      singleDate={singleDate}
      onSingleDateChange={setSingleDate}
      startDate={startDate}
      endDate={endDate}
      onDateRangeChange={handleDateRangeChange}
      maxDate={tomorrowDate(true)}
      isLoading={isLoading}
      onAction={executeProcess}
      actionText={t('common.download')}
    />
  );
}
