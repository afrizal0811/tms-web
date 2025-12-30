// File: features/reports/BulkReportDownloader.js
'use client';

import CustomDatePicker from '@/components/CustomDatePicker';
import Spinner from '@/components/Spinner';
import { useLanguage } from '@/context/LanguageContext';
import { getLocationHistories, getResultsSummary, getTasks } from '@/lib/apiService';
import { TAG_MAP_KEY } from '@/lib/constants';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { generateDeliveryWorkbook } from '@/lib/reportGenerators/deliveryReport';
import { generateRoutingWorkbook } from '@/lib/reportGenerators/routingReport';
import { generateTimeSummaryWorkbook } from '@/lib/reportGenerators/timeReport';
import {
  calculateStartFinishDates,
  calculateTargetDates,
  formatDateUniversal,
  formatTimer,
  formatToApiUtc,
} from '@/lib/utils';
import { useEffect, useRef, useState } from 'react'; // 2. Import useRef & useEffect
import { bulkDownloader } from './help';

const parseDate = (dateStr) => {
  return new Date(dateStr.replace(/-/g, '/'));
};

export default function BulkReportDownloader({ driverData }) {
  const { t } = useLanguage();

  const today = parseDate(formatDateUniversal(new Date()));
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const [isLoading, setIsLoading] = useState(false);
  const [currentReport, setCurrentReport] = useState(null);

  // 3. State & Ref untuk Timer
  const [elapsedTime, setElapsedTime] = useState(0);
  const startTimeRef = useRef(null);

  // 4. Logic Timer
  useEffect(() => {
    let interval = null;
    if (isLoading) {
      startTimeRef.current = Date.now();
      //eslint-disable-next-line
      setElapsedTime(0);
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } else {
      setElapsedTime(0);
      startTimeRef.current = null;
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading]);

  const handleDateChange = (dates) => {
    const [start, end] = dates;
    setStartDate(start);
    setEndDate(end);
  };

  const handleBulkRoutingSummary = (t) => {
    const fullTagMap = JSON.parse(localStorage.getItem(TAG_MAP_KEY) || '{}');
    const { storedLocation: hubIdLocal } = getLocalStorage();
    const hubTagMap = fullTagMap[hubIdLocal] || {};

    bulkDownloader({
      startDate,
      endDate,
      driverData,
      reportType: 'routing',
      zipPrefix: `Bulk ${t('excel.routing.filename')}`,
      setIsLoading,
      setCurrentReport,
      processDateCallback: async ({ dateForFile, hubId, hubName }) => {
        const { dateFrom: apiDate, dateTo: apiDateTo } = calculateTargetDates(dateForFile);

        const resultsData = await getResultsSummary({
          dateFrom: `${apiDate} 00:00:00`,
          dateTo: `${apiDateTo} 23:59:59`,
          limit: 500,
          hubId,
        });

        const filteredResults = resultsData.filter((item) => item.dispatchStatus === 'done');

        if (filteredResults.length > 0) {
          return generateRoutingWorkbook(
            driverData,
            filteredResults,
            hubTagMap,
            dateForFile,
            hubName,
            t
          );
        }
        return null;
      },
      t,
    });
  };

  const handleBulkDeliverySummary = (t) => {
    bulkDownloader({
      startDate,
      endDate,
      driverData,
      reportType: 'delivery',
      zipPrefix: `Bulk ${t('excel.delivery.filename')}`,
      setIsLoading,
      setCurrentReport,
      processDateCallback: async ({ dateForFile, hubId, hubName }) => {
        const { dateFrom: apiDate, dateTo: apiDateTo } = calculateTargetDates(dateForFile);

        // Convert string YYYY-MM-DD kembali ke Date Object untuk set jam
        const startD = new Date(apiDate);
        startD.setHours(0, 0, 0, 0);
        const endD = new Date(apiDateTo);
        endD.setHours(23, 59, 59, 999);

        const timeFrom = formatToApiUtc(startD);
        const timeTo = formatToApiUtc(endD);

        const [allTasks, resultsData] = await Promise.all([
          getTasks({
            hubId: hubId,
            status: 'DONE',
            timeFrom: timeFrom,
            timeTo: timeTo,
            timeBy: 'startTime',
            limit: 1000,
          }),
          getResultsSummary({
            dateFrom: timeFrom,
            dateTo: timeTo,
            limit: 500,
            hubId: hubId,
          }),
        ]);

        if (allTasks.length > 0) {
          return generateDeliveryWorkbook(
            driverData,
            allTasks,
            resultsData || [],
            dateForFile,
            apiDate,
            hubId,
            hubName,
            t
          );
        }
        return null;
      },
      t,
    });
  };

  const handleBulkTimeSummary = (t) => {
    bulkDownloader({
      startDate,
      endDate,
      driverData,
      reportType: 'time',
      zipPrefix: `Bulk ${t('excel.time.filename')}`,
      setIsLoading,
      setCurrentReport,
      processDateCallback: async ({ dateForFile, hubName }) => {
        const { timeFrom, timeTo } = calculateStartFinishDates(dateForFile);

        const allApiData = await getLocationHistories({
          timeFrom: timeFrom,
          timeTo: timeTo,
          limit: 1000,
          startFinish: 'true',
          fields: 'finish,startTime,email,trackedTime,totalDistance',
          timeBy: 'createdTime',
        });

        if (allApiData.length > 0) {
          return generateTimeSummaryWorkbook(driverData, allApiData, dateForFile, hubName, t);
        }
        return null;
      },
      t,
    });
  };

  const isRangeInvalid =
    !startDate || !endDate || startDate > endDate || startDate.getTime() === endDate.getTime();

  return (
    <div className="w-full max-w-6xl p-4">
      <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-center">
        {t('report.period_title')}
      </h1>
      <div className="flex flex-col sm:flex-row justify-center items-center mb-8 gap-4">
        <div className="text-center w-full max-w-xs">
          <label htmlFor="shippingDate" className="block text-lg mb-2 text-gray-500">
            {t('common.range_delivery')}
          </label>
          <CustomDatePicker
            selectsRange
            startDate={startDate}
            endDate={endDate}
            onChange={handleDateChange}
            isLoading={isLoading}
            dateFormat="dd/MM/yyyy"
            className="sm:w-64"
          />
        </div>
      </div>
      <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 w-full justify-center">
        {/* Tombol Routing Summary */}
        <button
          onClick={() => handleBulkRoutingSummary(t)}
          disabled={isLoading || isRangeInvalid}
          className={`
            px-6 py-3 rounded w-full sm:w-64 text-center text-white font-bold text-lg 
            bg-sky-600 hover:bg-sky-700 cursor-pointer 
            disabled:bg-gray-400 disabled:cursor-not-allowed
          `}
        >
          {isLoading && currentReport === 'routing' ? (
            <div className="flex justify-center items-center gap-2">
              <Spinner size="w-5 h-5" border="border-4 border-amber-400 border-t-white" />
              <span>{formatTimer(elapsedTime)}</span>
            </div>
          ) : (
            t('report.routing_summary')
          )}
        </button>

        {/* Tombol Delivery Summary */}
        <button
          onClick={() => handleBulkDeliverySummary(t)}
          disabled={isLoading || isRangeInvalid}
          className={`
            px-6 py-3 rounded w-full sm:w-64 text-center text-white font-bold text-lg 
            bg-sky-600 hover:bg-sky-700 cursor-pointer 
            disabled:bg-gray-400 disabled:cursor-not-allowed
          `}
        >
          {isLoading && currentReport === 'delivery' ? (
            <div className="flex justify-center items-center gap-2">
              <Spinner size="w-5 h-5" border="border-4 border-amber-400 border-t-white" />
              <span>{formatTimer(elapsedTime)}</span>
            </div>
          ) : (
            t('report.delivery_summary')
          )}
        </button>
        <button
          onClick={() => handleBulkTimeSummary(t)}
          disabled={isLoading || isRangeInvalid}
          className={`
            px-6 py-3 rounded w-full sm:w-64 text-center text-white font-bold text-lg 
            bg-sky-600 hover:bg-sky-700 cursor-pointer 
            disabled:bg-gray-400 disabled:cursor-not-allowed
          `}
        >
          {isLoading && currentReport === 'time' ? (
            <div className="flex justify-center items-center gap-2">
              <Spinner size="w-5 h-5" border="border-4 border-amber-400 border-t-white" />
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
