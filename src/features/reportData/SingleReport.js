'use client';

import CustomDatePicker from '@/components/CustomDatePicker';
import Spinner from '@/components/Spinner';
import Tooltip from '@/components/Tooltip';
import { useLanguage } from '@/context/LanguageContext';
import { getLocationHistories, getResultsSummary, getTasks, getVehicleMappings } from '@/lib/api';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { generateDeliveryWorkbook } from '@/lib/reportGenerators/deliveryReport';
import { generateRoutingWorkbook } from '@/lib/reportGenerators/routingReport';
import { generateTimeSummaryWorkbook } from '@/lib/reportGenerators/timeReport';
import { toastError, toastSuccess } from '@/lib/toastHelper';
import {
  calculateStartFinishDates,
  formatDateUniversal,
  formatTimer,
  isDateSunday,
  isEmpty,
  tomorrowDate,
} from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx-js-style';

const parseDate = (dateStr) => new Date(dateStr.replace(/-/g, '/'));

export default function SingleReport({
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

  const [isCustomRouting, setIsCustomRouting] = useState(false);
  const [routingDate, setRoutingDate] = useState(() => {
    const d = new Date(initialDate);
    d.setDate(d.getDate() - 1);
    if (d.getDay() === 0) d.setDate(d.getDate() - 1);
    return d;
  });

  useEffect(() => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    if (d.getDay() === 0) d.setDate(d.getDate() - 1);
    setRoutingDate(d);
  }, [selectedDate]);

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

  const handleRouting = async () => {
    try {
      setElapsedTime(0);
      if (setIsAnyLoading) setIsAnyLoading(true);
      setCurrentRunning('routing');
      if (setIsMapping) setIsMapping(false);

      let targetRoutingDateObj;
      if (isCustomRouting) {
        if (!routingDate) throw new Error(t('common.invalid_date'));
        targetRoutingDateObj = new Date(routingDate);
      } else {
        if (!selectedDate) throw new Error(t('common.invalid_date'));
        targetRoutingDateObj = new Date(selectedDate);
        targetRoutingDateObj.setDate(targetRoutingDateObj.getDate() - 1);
        if (targetRoutingDateObj.getDay() === 0)
          targetRoutingDateObj.setDate(targetRoutingDateObj.getDate() - 1);
      }

      const targetRoutingStr = formatDateUniversal(targetRoutingDateObj);
      const apiDateFrom = `${targetRoutingStr} 00:00:00`;
      const apiDateTo = `${targetRoutingStr} 23:59:59`;

      const { storedLocationAcronym } = getLocalStorage();

      const [resultsData] = await Promise.all([
        getResultsSummary({
          dateFrom: apiDateFrom,
          dateTo: apiDateTo,
          limit: 1000,
          hubId: selectedLocation,
        }),
      ]);

      const filteredResults = (resultsData || []).filter((item) => item.dispatchStatus === 'done');
      if (isEmpty(filteredResults)) {
        throw new Error(t('report.toast.no_routing'));
      }

      const mappingsDB = await getVehicleMappings();
      const mappingsObj = mappingsDB.reduce((acc, curr) => {
        acc[curr.plat] = curr.mappedType;
        return acc;
      }, {});

      const hubLabel = storedLocationAcronym || selectedLocationName;

      const { wb, excelFileName } = await generateRoutingWorkbook(
        driverData,
        filteredResults,
        mappingsObj,
        targetRoutingStr,
        hubLabel,
        t
      );

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

      if (!selectedDateString) throw new Error(t('common.invalid_date'));

      const timeFrom = `${selectedDateString} 00:00:00`;
      const timeTo = `${selectedDateString} 23:59:59`;

      let targetRoutingDateObj;
      if (isCustomRouting) {
        if (!routingDate) throw new Error(t('common.invalid_date'));
        targetRoutingDateObj = new Date(routingDate);
      } else {
        targetRoutingDateObj = new Date(selectedDate);
        targetRoutingDateObj.setDate(targetRoutingDateObj.getDate() - 1);
        if (targetRoutingDateObj.getDay() === 0)
          targetRoutingDateObj.setDate(targetRoutingDateObj.getDate() - 1);
      }

      const targetRoutingStr = formatDateUniversal(targetRoutingDateObj);
      const routingDateFrom = `${targetRoutingStr} 00:00:00`;
      const routingDateTo = `${targetRoutingStr} 23:59:59`;

      const { storedLocationAcronym } = getLocalStorage();

      const [allTasks, resultsData] = await Promise.all([
        getTasks({
          hubId: selectedLocation,
          status: 'DONE,ONGOING',
          timeFrom,
          timeTo,
          timeBy: 'startTime',
          limit: 5000,
        }),
        getResultsSummary({
          dateFrom: routingDateFrom,
          dateTo: routingDateTo,
          limit: 1000,
          hubId: selectedLocation,
        }),
      ]);

      if (!Array.isArray(allTasks) || isEmpty(allTasks)) {
        throw new Error(t('report.toast.no_delivery'));
      }

      const hubLabel = storedLocationAcronym || selectedLocationName;

      const { wb, excelFileName } = generateDeliveryWorkbook(
        driverData,
        allTasks,
        resultsData || [],
        selectedDateString,
        targetRoutingStr,
        selectedLocation,
        hubLabel,
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

      if (!selectedDateString) throw new Error(t('common.invalid_date'));

      const { timeFrom, timeTo } = calculateStartFinishDates(selectedDateString);
      const { storedLocationAcronym } = getLocalStorage();

      const [response] = await Promise.all([
        getLocationHistories({
          timeFrom,
          timeTo,
          limit: 5000,
          startFinish: 'true',
          fields: 'finish,startTime,email,trackedTime,totalDistance',
          timeBy: 'createdTime',
        }),
      ]);

      const allApiData = response?.tasks?.data || [];

      if (!Array.isArray(allApiData) || isEmpty(allApiData)) {
        throw new Error(t('report.toast.no_time'));
      }

      const hubLabel = storedLocationAcronym || selectedLocationName;

      const { wb, excelFileName, error } = generateTimeSummaryWorkbook(
        driverData,
        allApiData,
        selectedDateString,
        hubLabel,
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

  const informationComp = (tooltipContent) => (
    <Tooltip tooltipContent={tooltipContent}>
      <span className="flex items-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      </span>
    </Tooltip>
  );

  return (
    <div className="flex flex-col items-center w-full max-w-6xl p-4">
      <h1 className="text-3xl sm:text-4xl font-bold mb-8 text-center">{t('report.daily_title')}</h1>

      <div className="flex flex-col sm:flex-row justify-center items-center sm:items-start gap-6 sm:gap-12 mb-10 w-full">
        <div className="flex flex-col items-center w-full max-w-xs">
          <label
            htmlFor="shippingDate"
            className="text-lg mb-2 text-gray-500 font-medium text-center select-none flex items-center gap-1"
          >
            {t('common.delivery_date')} {informationComp(t('report.tooltip.info_delivery'))}
          </label>
          <CustomDatePicker
            className="max-w-xs cursor-pointer"
            disabled={disabledCommon}
            id="shippingDate"
            maxDate={tomorrowDate()}
            onChange={handleDateChange}
            selected={selectedDate}
          />

          <div className="mt-4 flex items-center gap-2">
            <input
              type="checkbox"
              id="customRouting"
              disabled={disabledCommon}
              checked={isCustomRouting}
              onChange={(e) => setIsCustomRouting(e.target.checked)}
              className="w-4 h-4 text-sky-600 rounded border-gray-300 focus:ring-sky-500 cursor-pointer"
            />
            <label
              htmlFor="customRouting"
              className="text-sm text-gray-600 cursor-pointer select-none flex items-center gap-1"
            >
              {t('report.change_date')} {informationComp(t('report.tooltip.info_change_time'))}
            </label>
          </div>
        </div>

        {isCustomRouting && (
          <div className="flex flex-col items-center w-full max-w-xs transition-opacity duration-300">
            <label
              htmlFor="routingDate"
              className="block text-lg mb-2 text-gray-500 font-medium text-center"
            >
              {t('report.routing_date')}
            </label>
            <CustomDatePicker
              className="max-w-xs cursor-pointer"
              disabled={disabledCommon}
              id="routingDate"
              maxDate={selectedDate}
              onChange={(date) => {
                if (date) setRoutingDate(date);
              }}
              selected={routingDate}
            />
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 w-full justify-center">
        <button
          onClick={handleRouting}
          disabled={disabledCommon || isDateInvalid}
          className={`px-6 py-3 rounded w-full sm:w-64 text-center text-white font-bold text-lg cursor-pointer transition-colors
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
          className={`px-6 py-3 rounded w-full sm:w-64 text-center text-white font-bold text-lg cursor-pointer transition-colors
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
          className={`px-6 py-3 rounded w-full sm:w-64 text-center text-white font-bold text-lg cursor-pointer transition-colors
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
