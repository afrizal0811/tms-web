'use client';

import CustomDatePicker from '@/components/CustomDatePicker';
import Spinner from '@/components/Spinner';
import { useLanguage } from '@/context/LanguageContext';
import { getLocationHistories, getResultsSummary, getTasks } from '@/lib/api';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { generateDeliveryWorkbook } from '@/lib/reportGenerators/deliveryReport';
import { generateRoutingWorkbook } from '@/lib/reportGenerators/routingReport';
import { generateTimeSummaryWorkbook } from '@/lib/reportGenerators/timeReport';
import { toastError, toastSuccess, toastWarning } from '@/lib/toastHelper';
import {
  calculateStartFinishDates,
  calculateTargetDates,
  formatDateUniversal,
  formatTimer,
  formatToApiUtc,
  isDateSunday,
  isEmpty,
} from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx-js-style';

const parseDate = (dateStr) => new Date(dateStr.replace(/-/g, '/'));

export default function TmsSummary({
  driverData,
  isAnyLoading,
  isMapping,
  selectedLocation,
  selectedLocationName,
  setIsAnyLoading,
  setIsMapping,
}) {
  const { t } = useLanguage();

  const initialDate = parseDate(formatDateUniversal(new Date()));
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [currentRunning, setCurrentRunning] = useState(null);

  const [elapsedTime, setElapsedTime] = useState(0);
  const startTimeRef = useRef(null);

  useEffect(() => {
    let interval = null;
    if (currentRunning) {
      startTimeRef.current = Date.now();
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } else {
      startTimeRef.current = null;
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentRunning]);

  const selectedDateString = formatDateUniversal(selectedDate);
  const isDateInvalid = isDateSunday(selectedDateString);

  const disabledCommon = isAnyLoading || isMapping;

  const safeEnsureDriverData = () => {
    if (!Array.isArray(driverData) || isEmpty(driverData)) {
      throw new Error('Data driver belum dimuat. Mohon muat data driver terlebih dahulu.');
    }
    if (!selectedLocation) {
      throw new Error('Lokasi belum dipilih.');
    }
  };

  const handleRouting = async () => {
    try {
      setElapsedTime(0);
      if (setIsAnyLoading) setIsAnyLoading(true);
      setCurrentRunning('routing');
      if (setIsMapping) setIsMapping(false);

      safeEnsureDriverData();

      if (!selectedDateString) throw new Error('Tanggal tidak valid.');

      const { dateFrom, dateTo } = calculateTargetDates(selectedDateString);
      const apiDateFrom = `${dateFrom} 00:00:00`;
      const apiDateTo = `${dateTo} 23:59:59`;

      const resultsData = await getResultsSummary({
        dateFrom: apiDateFrom,
        dateTo: apiDateTo,
        limit: 1000,
        hubId: selectedLocation,
      });

      const filteredResults = (resultsData || []).filter((item) => item.dispatchStatus === 'done');
      if (isEmpty(filteredResults)) {
        throw new Error(t('report.toast.no_routing'));
      }

      const { storedVehicleTag } = getLocalStorage();
      const fullTagMap = JSON.parse(storedVehicleTag || '{}');
      const hubTagMap = fullTagMap[selectedLocation] || {};

      const { wb, excelFileName, missingTimesFound } = await generateRoutingWorkbook(
        driverData,
        filteredResults,
        hubTagMap,
        selectedDateString,
        selectedLocationName,
        t
      );

      if (missingTimesFound) {
        toastWarning(t('report.toast.missing_time'));
      }

      XLSX.writeFile(wb, excelFileName);
      toastSuccess(t('report.toast.success'));
    } catch (err) {
      toastError(err.message || String(err));
    } finally {
      setCurrentRunning(null);
      if (setIsAnyLoading) setIsAnyLoading(false);
      if (setIsMapping) setIsMapping(false);
    }
  };

  const handleDelivery = async () => {
    try {
      setElapsedTime(0);
      if (setIsAnyLoading) setIsAnyLoading(true);
      setCurrentRunning('delivery');

      safeEnsureDriverData();

      if (!selectedDateString) throw new Error('Tanggal tidak valid.');

      const { dateFrom: apiDate } = calculateTargetDates(selectedDateString);

      const startObj = new Date(selectedDate);
      startObj.setHours(0, 0, 0, 0);

      const endObj = new Date(selectedDate);
      endObj.setHours(23, 59, 59, 999);

      const timeFrom = formatToApiUtc(startObj);
      const timeTo = formatToApiUtc(endObj);

      const tasksPromise = getTasks({
        hubId: selectedLocation,
        status: 'DONE',
        timeFrom,
        timeTo,
        timeBy: 'startTime',
        limit: 5000,
      });

      const resultsPromise = getResultsSummary({
        dateFrom: timeFrom,
        dateTo: timeTo,
        limit: 1000,
        hubId: selectedLocation,
      });

      const [allTasks, resultsData] = await Promise.all([tasksPromise, resultsPromise]);

      if (!Array.isArray(allTasks) || isEmpty(allTasks)) {
        throw new Error(t('report.toast.no_delivery'));
      }

      const { wb, excelFileName } = generateDeliveryWorkbook(
        driverData,
        allTasks,
        resultsData || [],
        selectedDateString,
        apiDate,
        selectedLocation,
        selectedLocationName,
        t
      );

      XLSX.writeFile(wb, excelFileName);
      toastSuccess(t('report.toast.success'));
    } catch (err) {
      toastError(err.message || String(err));
    } finally {
      setCurrentRunning(null);
      if (setIsAnyLoading) setIsAnyLoading(false);
    }
  };

  const handleTime = async () => {
    try {
      setElapsedTime(0);
      if (setIsAnyLoading) setIsAnyLoading(true);
      setCurrentRunning('time');

      safeEnsureDriverData();

      if (!selectedDateString) throw new Error('Tanggal tidak valid.');

      const { timeFrom, timeTo } = calculateStartFinishDates(selectedDateString);

      const response = await getLocationHistories({
        timeFrom,
        timeTo,
        limit: 5000,
        startFinish: 'true',
        fields: 'finish,startTime,email,trackedTime,totalDistance',
        timeBy: 'createdTime',
      });

      const allApiData = response?.tasks?.data || [];

      if (!Array.isArray(allApiData) || isEmpty(allApiData)) {
        throw new Error(t('report.toast.no_time'));
      }

      const { wb, excelFileName, error } = generateTimeSummaryWorkbook(
        driverData,
        allApiData,
        selectedDateString,
        selectedLocationName,
        t
      );

      if (error) {
        throw new Error(error);
      }

      XLSX.writeFile(wb, excelFileName);
      toastSuccess(t('report.toast.success'));
    } catch (err) {
      toastError(err.message || String(err));
    } finally {
      setCurrentRunning(null);
      if (setIsAnyLoading) setIsAnyLoading(false);
    }
  };

  const handleDateChange = (date) => {
    if (!date) {
      toastError(t('report.toast.select_date'));
      return;
    }
    setSelectedDate(date);
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return (
    <div className="flex flex-col items-center w-full max-w-6xl p-4">
      <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-center">{t('report.daily_title')}</h1>

      <div className="mb-8 text-center w-full max-w-xs cursor-pointer">
        <label htmlFor="shippingDate" className="block text-lg mb-2 text-gray-500">
          {t('common.delivery_date')}
        </label>
        <CustomDatePicker
          className="max-w-xs"
          disabled={disabledCommon}
          id="shippingDate"
          maxDate={tomorrow}
          onChange={handleDateChange}
          selected={selectedDate}
        />
      </div>

      <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 w-full justify-center">
        <button
          onClick={handleRouting}
          disabled={disabledCommon || isDateInvalid}
          className={`px-6 py-3 rounded w-full sm:w-64 text-center text-white font-bold text-lg cursor-pointer
            ${disabledCommon || isDateInvalid ? 'bg-gray-400 cursor-not-allowed' : currentRunning === 'routing' ? 'bg-sky-600' : 'bg-sky-600 hover:bg-sky-700'}
          `}
        >
          {currentRunning === 'routing' ? (
            <div className="flex justify-center items-center gap-2">
              <Spinner size="w-6 h-6" border="border-4 border-amber-400 border-t-white" />
              <span>{formatTimer(elapsedTime)}</span>
            </div>
          ) : (
            t('report.routing_summary')
          )}
        </button>

        <button
          onClick={handleDelivery}
          disabled={disabledCommon || isDateInvalid}
          className={`px-6 py-3 rounded w-full sm:w-64 text-center text-white font-bold text-lg cursor-pointer
            ${disabledCommon || isDateInvalid ? 'bg-gray-400 cursor-not-allowed' : currentRunning === 'delivery' ? 'bg-sky-600' : 'bg-sky-600 hover:bg-sky-700'}
          `}
        >
          {currentRunning === 'delivery' ? (
            <div className="flex justify-center items-center gap-2">
              <Spinner size="w-6 h-6" border="border-4 border-amber-400 border-t-white" />
              <span>{formatTimer(elapsedTime)}</span>
            </div>
          ) : (
            t('report.delivery_summary')
          )}
        </button>

        <button
          onClick={handleTime}
          disabled={disabledCommon || isDateInvalid}
          className={`px-6 py-3 rounded w-full sm:w-64 text-center text-white font-bold text-lg cursor-pointer
            ${disabledCommon || isDateInvalid ? 'bg-gray-400 cursor-not-allowed' : currentRunning === 'time' ? 'bg-sky-600' : 'bg-sky-600 hover:bg-sky-700'}
          `}
        >
          {currentRunning === 'time' ? (
            <div className="flex justify-center items-center gap-2">
              <Spinner size="w-6 h-6" border="border-4 border-amber-400 border-t-white" />
              <span>{formatTimer(elapsedTime)}</span>
            </div>
          ) : (
            t('report.time_summary')
          )}
        </button>
      </div>
    </div>
  );
}
