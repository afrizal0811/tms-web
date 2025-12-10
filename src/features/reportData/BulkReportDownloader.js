// File: features/reports/BulkReportDownloader.js
'use client';

import Spinner from '@/components/Spinner';
import { getLocationHistories, getResultsSummary, getTasks } from '@/lib/apiService';
import { TAG_MAP_KEY } from '@/lib/constants';
import { generateDeliveryWorkbook } from '@/lib/reportGenerators/deliveryReport';
import { generateRoutingWorkbook } from '@/lib/reportGenerators/routingReport';
import { generateTimeSummaryWorkbook } from '@/lib/reportGenerators/timeReport';
import { toastWarning } from '@/lib/toastHelper'; // Kita masih butuh warning untuk notif "Data Kosong" per tanggal
import { calculateStartFinishDates, calculateTargetDates, getTodayDateString } from '@/lib/utils';
import { useState } from 'react';
import DatePicker from 'react-datepicker';
import { bulkDownloader } from './help';

const parseDate = (dateStr) => {
  return new Date(dateStr.replace(/-/g, '/'));
};

export default function BulkReportDownloader({ driverData }) {
  const today = parseDate(getTodayDateString());
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const [isLoading, setIsLoading] = useState(false);
  const [currentReport, setCurrentReport] = useState(null);

  const handleDateChange = (dates) => {
    const [start, end] = dates;
    setStartDate(start);
    setEndDate(end);
  };

  const handleBulkRoutingSummary = () => {
    const fullTagMap = JSON.parse(localStorage.getItem(TAG_MAP_KEY) || '{}');
    const hubIdLocal = localStorage.getItem('userLocation');
    const hubTagMap = fullTagMap[hubIdLocal] || {};

    bulkDownloader({
      startDate,
      endDate,
      driverData,
      reportType: 'routing',
      zipPrefix: 'Bulk Routing Summary',
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
            hubName
          );
        } else {
          toastWarning(`Tidak ada data Routing Summary untuk ${apiDate}`);
          return null;
        }
      },
    });
  };

  const handleBulkDeliverySummary = () => {
    bulkDownloader({
      startDate,
      endDate,
      driverData,
      reportType: 'delivery',
      zipPrefix: 'Bulk Delivery Summary',
      setIsLoading,
      setCurrentReport,
      processDateCallback: async ({ dateForFile, hubId, hubName }) => {
        const { dateFrom: apiDate, dateTo: apiDateTo } = calculateTargetDates(dateForFile);
        const timeFrom = `${apiDate} 00:00:00`;
        const timeTo = `${apiDateTo} 23:59:59`;

        const [allTasks, resultsData] = await Promise.all([
          getTasks({
            hubId: hubId,
            status: 'DONE',
            timeFrom: timeFrom,
            timeTo: timeTo,
            timeBy: 'doneTime',
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
            hubName
          );
        } else {
          toastWarning(`Tidak ada data Delivery Summary untuk ${apiDate}`);
          return null;
        }
      },
    });
  };

  const handleBulkTimeSummary = () => {
    bulkDownloader({
      startDate,
      endDate,
      driverData,
      reportType: 'time',
      zipPrefix: 'Bulk Time Summary',
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
          return generateTimeSummaryWorkbook(driverData, allApiData, dateForFile, hubName);
        } else {
          toastWarning(`Tidak ada data Time Summary untuk ${dateForFile}`);
          return null;
        }
      },
    });
  };

  const isRangeInvalid =
    !startDate || !endDate || startDate > endDate || startDate.getTime() === endDate.getTime();

  return (
    <div className="w-full max-w-6xl p-4">
      <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-center">Laporan Periode</h1>
      <div className="flex flex-col sm:flex-row justify-center items-center mb-8 gap-4">
        <div className="text-center w-full max-w-xs">
          <label htmlFor="shippingDate" className="block text-lg mb-2 text-gray-500">
            Rentang Tanggal Pengiriman
          </label>
          <DatePicker
            className="w-full sm:w-64 p-2 rounded border border-gray-300 text-slate-900 bg-white text-center"
            dateFormat="dd/MM/yyyy"
            disabled={isLoading}
            endDate={endDate}
            maxDate={new Date()}
            onChange={handleDateChange}
            selectsRange={true}
            startDate={startDate}
          />
        </div>
      </div>
      <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 w-full justify-center">
        {/* Tombol Routing Summary */}
        <button
          onClick={handleBulkRoutingSummary}
          disabled={isLoading || isRangeInvalid}
          className={`
            px-6 py-3 rounded w-full sm:w-64 text-center text-white font-bold text-lg 
            bg-sky-600 hover:bg-sky-700 cursor-pointer 
            disabled:bg-gray-400 disabled:cursor-not-allowed
          `}
        >
          {isLoading && currentReport === 'routing' ? (
            <div className="flex justify-center items-center">
              <Spinner size="w-6 h-6" border="border-4 border-amber-400 border-t-white" />
            </div>
          ) : (
            'Routing Summary'
          )}
        </button>

        {/* Tombol Delivery Summary */}
        <button
          onClick={handleBulkDeliverySummary}
          disabled={isLoading || isRangeInvalid}
          className={`
            px-6 py-3 rounded w-full sm:w-64 text-center text-white font-bold text-lg 
            bg-sky-600 hover:bg-sky-700 cursor-pointer 
            disabled:bg-gray-400 disabled:cursor-not-allowed
          `}
        >
          {isLoading && currentReport === 'delivery' ? (
            <div className="flex justify-center items-center">
              <Spinner size="w-6 h-6" border="border-4 border-amber-400 border-t-white" />
            </div>
          ) : (
            'Delivery Summary'
          )}
        </button>

        {/* Tombol Time Summary */}
        <button
          onClick={handleBulkTimeSummary}
          disabled={isLoading || isRangeInvalid}
          className={`
            px-6 py-3 rounded w-full sm:w-64 text-center text-white font-bold text-lg 
            bg-sky-600 hover:bg-sky-700 cursor-pointer 
            disabled:bg-gray-400 disabled:cursor-not-allowed
          `}
        >
          {isLoading && currentReport === 'time' ? (
            <div className="flex justify-center items-center">
              <Spinner size="w-6 h-6" border="border-4 border-amber-400 border-t-white" />
            </div>
          ) : (
            'Time Summary'
          )}
        </button>
      </div>
    </div>
  );
}
