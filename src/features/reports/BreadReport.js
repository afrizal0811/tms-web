'use client';

// File: src/features/reports/BreadReport.js

import Button from '@/components/Button';
import CustomDatePicker from '@/components/CustomDatePicker';
import ConfirmModal from '@/components/modal/ConfirmModal';
import { useLanguage } from '@/context/LanguageContext';
import { getTasks } from '@/lib/api';
import { getOrFetchDriverData } from '@/lib/driverDataHelper';
import { getLocalStorage } from '@/lib/localStorageHandler';
import {
  buildDriverMap,
  extractBreadRows,
  generateBreadWorkbook,
} from '@/lib/reportGenerators/bread/breadReport';
import { toastError, toastSuccess } from '@/lib/toast';
import { formatDateUniversal, formatToApiUtc, isEmpty, tomorrowDate } from '@/lib/utils';
import { useState } from 'react';
import * as XLSX from 'xlsx-js-style';
import { getDatesInRange } from './helper/help';

const getDateParams = (date) => {
  const localStart = new Date(date);
  localStart.setHours(0, 0, 0, 0);
  const localEnd = new Date(date);
  localEnd.setHours(23, 59, 59, 999);
  return {
    timeFrom: formatToApiUtc(localStart),
    timeTo: formatToApiUtc(localEnd),
  };
};

export default function BreadReport() {
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const { t } = useLanguage();

  const executeProcess = async () => {
    setIsLoading(true);
    setShowWarningModal(false);
    try {
      const { storedLocation, storedLocationName, storedLocationAcronym } = getLocalStorage();
      const driverData = await getOrFetchDriverData(storedLocation);
      const driverMap = buildDriverMap(driverData);

      const datesToProcess = getDatesInRange(startDate, endDate || startDate);
      const allRows = [];

      for (const date of datesToProcess) {
        const { timeFrom, timeTo } = getDateParams(date);

        const tasks = await getTasks({
          hubId: storedLocation,
          status: 'DONE,ONGOING',
          timeFrom,
          timeTo,
          timeBy: 'startTime',
          limit: 10000,
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
      const startStr = formatDateUniversal(startDate, 'DD.MM.YYYY');
      const endStr = endDate ? formatDateUniversal(endDate, 'DD.MM.YYYY') : startStr;
      const dateLabel = startStr === endStr ? startStr : `${startStr} - ${endStr}`;
      const locationName = storedLocationAcronym || storedLocationName;
      const fileName = `${t('report.bread_summary')} - ${dateLabel} - ${locationName}.xlsx`;

      XLSX.writeFile(wb, fileName);
      toastSuccess(t('common.toast.success'));
    } catch (error) {
      toastError(t('common.toast.error', { err: error.message }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcess = () => {
    if (!startDate) {
      toastError(t('report.toast.select_date'));
      return;
    }

    const validEnd = endDate || startDate;
    const diffDays = Math.ceil(Math.abs(validEnd - startDate) / (1000 * 60 * 60 * 24));

    if (diffDays > 14) {
      setShowWarningModal(true);
    } else {
      executeProcess();
    }
  };

  const handleDateChange = (dates) => {
    const [start, end] = dates;
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-6xl p-4">
      <h1 className="text-3xl sm:text-4xl font-bold mb-8 text-center text-slate-900 dark:text-slate-100">
        {t('report.bread_summary')}
      </h1>

      <div className="flex flex-col sm:flex-row justify-center items-center sm:items-start gap-6 sm:gap-12 mb-10 w-full">
        <div className="flex flex-col items-center w-full max-w-xs">
          <label
            htmlFor="breadDate"
            className="text-lg mb-2 text-gray-500 dark:text-slate-400 font-medium text-center select-none"
          >
            {t('common.delivery_date')}
          </label>
          <CustomDatePicker
            className="max-w-xs cursor-pointer"
            disabled={isLoading}
            id="breadDate"
            selectsRange
            startDate={startDate}
            endDate={endDate}
            onChange={handleDateChange}
            maxDate={tomorrowDate(true)}
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 w-full justify-center">
        <Button
          onClick={handleProcess}
          disabled={isLoading}
          isLoading={isLoading}
          text={t('common.download')}
          width="w-full sm:w-64"
        />
      </div>

      <ConfirmModal
        isOpen={showWarningModal}
        title={t('common.modal.data_load_title')}
        message={t('common.modal.data_load_message', { days: 14 })}
        onConfirm={executeProcess}
        onCancel={() => setShowWarningModal(false)}
      />
    </div>
  );
}
