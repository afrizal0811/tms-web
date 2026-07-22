'use client';

import Button from '@/components/Button';
import CustomDatePicker from '@/components/CustomDatePicker';
import ConfirmModal from '@/components/modal/ConfirmModal';
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
import { useEffect, useRef, useState } from 'react';
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const { t, isIndonesian } = useLanguage();
  const settingsRef = useRef(null);

  const isRangeInvalid =
    isBulkMode &&
    (!startDate || !endDate || startDate > endDate || startDate.getTime() === endDate.getTime());

  useEffect(() => {
    function handleClickOutside(event) {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setIsSettingsOpen(false);
      }
    }
    if (isSettingsOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSettingsOpen]);

  const handleRadioToggle = (mode) => {
    if (isLoading) return;
    if (mode === 'bulk') setIsBulkMode(!isBulkMode);
  };

  const executeProcess = async () => {
    setIsLoading(true);
    setShowWarningModal(false);
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

  const executeWithCheck = (actionFn) => {
    if (isBulkMode) {
      const validEndDate = endDate || startDate;
      const diffTime = Math.abs(validEndDate - startDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 14) {
        setPendingAction(() => actionFn);
        setShowWarningModal(true);
        return;
      }
    }
    actionFn();
  };

  const handleConfirmProcess = () => {
    setShowWarningModal(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  const handleCancelProcess = () => {
    setShowWarningModal(false);
    setPendingAction(null);
  };

  const bulkText = isBulkMode ? t('common.bulk') : '';
  const titleMenu = isIndonesian
    ? `${t('report.bread_report')} ${bulkText}`.trim()
    : `${bulkText} ${t('report.bread_report')}`.trim();

  return (
    <div className="flex flex-col items-center w-full max-w-6xl p-4">
      <h1 className="text-3xl sm:text-4xl font-bold mb-8 text-center text-slate-900 dark:text-slate-100">
        {titleMenu}
      </h1>

      <div className="flex flex-col sm:flex-row justify-center items-center sm:items-start gap-6 sm:gap-12 w-full">
        <div className="flex flex-col items-center w-full max-w-xs">
          <label className="text-lg mb-2 text-gray-500 dark:text-slate-400 font-medium text-center select-none flex items-center gap-1">
            {isBulkMode ? t('common.range_delivery') : t('common.delivery_date')}
          </label>
          {isBulkMode ? (
            <CustomDatePicker
              selectsRange={true}
              startDate={startDate}
              endDate={endDate}
              onChange={(dates) => {
                const [start, end] = dates;
                setStartDate(start);
                setEndDate(end);
              }}
              disabled={isLoading}
              className="w-full sm:w-[320px] block cursor-pointer"
              wrapperClassName="w-full block"
              maxDate={tomorrowDate(true)}
            />
          ) : (
            <CustomDatePicker
              selected={singleDate}
              onChange={setSingleDate}
              disabled={isLoading}
              className="w-full sm:w-[320px] block cursor-pointer"
              wrapperClassName="w-full block"
              maxDate={tomorrowDate(true)}
            />
          )}
        </div>
      </div>

      <div className="relative mt-2 mb-4" ref={settingsRef}>
        <button
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          className="text-sm text-sky-600 dark:text-sky-400 font-medium hover:underline focus:outline-none cursor-pointer"
        >
          {t('setting.title')}
        </button>
        {isSettingsOpen && (
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-64 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md shadow-lg z-50 p-4 flex flex-col gap-4">
            <div
              onClick={() => handleRadioToggle('bulk')}
              className={`flex items-center gap-2 ${
                isLoading
                  ? 'cursor-not-allowed text-slate-400 dark:text-slate-500'
                  : 'cursor-pointer text-gray-600 dark:text-slate-300'
              }`}
            >
              <input
                type="radio"
                name="breadMode"
                checked={isBulkMode}
                readOnly
                disabled={isLoading}
                className="w-4 h-4 text-sky-600 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-sky-500 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed pointer-events-none"
              />
              <span className="text-sm select-none w-full">{t('common.bulk')}</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 w-full justify-center">
        <Button
          onClick={() => executeWithCheck(executeProcess)}
          disabled={isLoading || isRangeInvalid}
          isLoading={isLoading}
          text={t('common.download')}
          width="w-full sm:w-auto min-w-[200px]"
        />
      </div>

      <ConfirmModal
        isOpen={showWarningModal}
        title={t('common.modal.data_load_title')}
        message={t('common.modal.data_load_message', { days: 14 })}
        onConfirm={handleConfirmProcess}
        onCancel={handleCancelProcess}
      />
    </div>
  );
}
