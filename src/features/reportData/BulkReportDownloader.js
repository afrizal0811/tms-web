// File: features/reports/BulkReportDownloader.js
'use client';

import Spinner from '@/components/Spinner';
import { getLocationHistories, getResultsSummary, getTasks } from '@/lib/apiService';
import { TAG_MAP_KEY } from '@/lib/constants';
import { generateDeliveryWorkbook } from '@/lib/reportGenerators/deliveryReport';
import { generateRoutingWorkbook } from '@/lib/reportGenerators/routingReport';
import { generateTimeSummaryWorkbook } from '@/lib/reportGenerators/timeReport';
import { toastError, toastInfo, toastSuccess, toastWarning } from '@/lib/toastHelper';
import {
  calculateStartFinishDates,
  calculateTargetDates,
  formatDate,
  getTodayDateString,
  isDateSunday,
} from '@/lib/utils';
import { format } from 'date-fns';
import JSZip from 'jszip';
import { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import * as XLSX from 'xlsx-js-style';

function getDatesInRange(startDate, endDate) {
  const dates = [];
  let currentDate = new Date(startDate);
  const stopDate = new Date(endDate);
  currentDate.setHours(12, 0, 0, 0);
  stopDate.setHours(12, 0, 0, 0);
  while (currentDate <= stopDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
}
const parseDate = (dateStr) => {
  return new Date(dateStr.replace(/-/g, '/'));
};

export default function BulkReportDownloader({ driverData }) {
  const today = parseDate(getTodayDateString());
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const [isLoading, setIsLoading] = useState(false);
  const [currentReport, setCurrentReport] = useState(null);

  // Handler DatePicker (tidak berubah)
  const handleDateChange = (dates) => {
    const [start, end] = dates;
    setStartDate(start);
    setEndDate(end);
  };

  // --- VALIDATION: allow Sunday as start/end, but require range length > 0 (start !== end) ---
  let isRangeInvalid = false;
  if (!startDate || !endDate) {
    isRangeInvalid = true;
  } else if (startDate.getTime() === endDate.getTime()) {
    // range must be at least 2 different days (start != end)
    isRangeInvalid = true;
  } else if (startDate > endDate) {
    // start should not be after end
    isRangeInvalid = true;
  }
  // --------------------------------------------------------

  // --- (Handler untuk tombol-tombol) ---
  const handleBulkRoutingSummary = async () => {
    if (isRangeInvalid) {
      if (startDate && endDate && startDate.getTime() === endDate.getTime()) {
        toastError('Rentang tanggal tidak boleh sama. Harap pilih minimal 2 hari.');
      } else {
        toastError('Rentang tanggal tidak valid. Pastikan awal <= akhir dan berbeda tanggal.');
      }
      return;
    }

    setIsLoading(true);
    setCurrentReport('routing');
    toastInfo('Memulai proses bulk Routing Summary...');
    try {
      const originalStartDateString = formatDate(startDate);
      const originalEndDateString = formatDate(endDate);
      const hubId = localStorage.getItem('userLocation');
      const hubName = localStorage.getItem('userLocationName') || 'Lokasi';
      if (!hubId || !driverData || driverData.length === 0) {
        throw new Error('Data Hub atau Driver tidak valid.');
      }
      const fullTagMap = JSON.parse(localStorage.getItem(TAG_MAP_KEY) || '{}');
      const hubTagMap = fullTagMap[hubId] || {};
      const datesToProcess = getDatesInRange(startDate, endDate);
      const zip = new JSZip();
      let filesGenerated = 0;
      for (const dateObj of datesToProcess) {
        const dateForFile = formatDate(dateObj);
        if (isDateSunday(dateForFile)) {
          const formattedDate = format(dateObj, 'dd-MM-yyyy');
          toastWarning(`Melewati ${formattedDate} (Hari Minggu)`); // skip sundays
          continue;
        }
        try {
          const { dateFrom: apiDate, dateTo: apiDateTo } = calculateTargetDates(dateForFile);
          const dateFrom = `${apiDate} 00:00:00`;
          const dateTo = `${apiDateTo} 23:59:59`;
          const resultsData = await getResultsSummary({
            dateFrom,
            dateTo,
            limit: 500,
            hubId,
          });
          const filteredResults = resultsData.filter((item) => item.dispatchStatus === 'done');
          if (filteredResults.length > 0) {
            const { wb, excelFileName } = generateRoutingWorkbook(
              driverData,
              filteredResults,
              hubTagMap,
              dateForFile,
              hubName
            );
            const excelUint8Array = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            zip.file(excelFileName, excelUint8Array);
            filesGenerated++;
          } else {
            toastWarning(`Tidak ada data Routing Summary untuk ${apiDate}`);
          }
        } catch (err) {
          toastError(`Gagal memproses ${dateForFile}: ${err.message}`);
        }
      }
      if (filesGenerated === 0) {
        toastError('Tidak ada file Routing Summary yang berhasil dibuat.');
        return;
      }
      toastInfo('Membuat file ZIP...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `Bulk_Routing_Summary_${originalStartDateString}_sd_${originalEndDateString}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toastSuccess(`Berhasil! ${filesGenerated} file telah di-zip dan diunduh.`);
    } catch (e) {
      toastError(e.message);
    } finally {
      setIsLoading(false);
      setCurrentReport(null);
    }
  };

  // (Handler Delivery Summary)
  const handleBulkDeliverySummary = async () => {
    if (isRangeInvalid) {
      if (startDate && endDate && startDate.getTime() === endDate.getTime()) {
        toastError('Rentang tanggal tidak boleh sama. Harap pilih minimal 2 hari.');
      } else {
        toastError('Rentang tanggal tidak valid. Pastikan awal <= akhir dan berbeda tanggal.');
      }
      return;
    }

    setIsLoading(true);
    setCurrentReport('delivery');
    toastInfo('Memulai proses bulk Delivery Summary...');
    try {
      const originalStartDateString = formatDate(startDate);
      const originalEndDateString = formatDate(endDate);
      const hubId = localStorage.getItem('userLocation');
      const hubName = localStorage.getItem('userLocationName') || 'Lokasi';
      if (!hubId || !driverData || driverData.length === 0) {
        throw new Error('Data Hub atau Driver tidak valid.');
      }
      const datesToProcess = getDatesInRange(startDate, endDate);
      const zip = new JSZip();
      let filesGenerated = 0;
      for (const dateObj of datesToProcess) {
        const dateForFile = formatDate(dateObj);
        if (isDateSunday(dateForFile)) {
          const formattedDate = format(dateObj, 'dd-MM-yyyy');
          toastWarning(`Melewati ${formattedDate} (Hari Minggu)`);
          continue;
        }
        try {
          const { dateFrom: apiDate, dateTo: apiDateTo } = calculateTargetDates(dateForFile);
          const timeFrom = `${apiDate} 00:00:00`;
          const timeTo = `${apiDateTo} 23:59:59`;
          const tasksPromise = getTasks({
            hubId: hubId,
            status: 'DONE',
            timeFrom: timeFrom,
            timeTo: timeTo,
            timeBy: 'startTime',
            limit: 1000,
          });
          const resultsPromise = getResultsSummary({
            dateFrom: timeFrom,
            dateTo: timeTo,
            limit: 500,
            hubId: hubId,
          });
          const [allTasks, resultsData] = await Promise.all([tasksPromise, resultsPromise]);
          if (allTasks.length > 0) {
            const { wb, excelFileName } = generateDeliveryWorkbook(
              driverData,
              allTasks,
              resultsData || [],
              dateForFile,
              apiDate,
              hubId,
              hubName
            );
            const excelUint8Array = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            zip.file(excelFileName, excelUint8Array);
            filesGenerated++;
          } else {
            toastWarning(`Tidak ada data Delivery Summary untuk ${apiDate}`);
          }
        } catch (err) {
          toastError(`Gagal memproses ${dateForFile}: ${err.message}`);
        }
      }
      if (filesGenerated === 0) {
        toastError('Tidak ada file Delivery Summary yang berhasil dibuat.');
        return;
      }
      toastInfo('Membuat file ZIP...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `Bulk_Delivery_Summary_${originalStartDateString}_sd_${originalEndDateString}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toastSuccess(`Berhasil! ${filesGenerated} file telah di-zip dan diunduh.`);
    } catch (e) {
      toastError(e.message);
    } finally {
      setIsLoading(false);
      setCurrentReport('delivery');
    }
  };

  // (Handler Time Summary)
  const handleBulkTimeSummary = async () => {
    if (isRangeInvalid) {
      if (startDate && endDate && startDate.getTime() === endDate.getTime()) {
        toastError('Rentang tanggal tidak boleh sama. Harap pilih minimal 2 hari.');
      } else {
        toastError('Rentang tanggal tidak valid. Pastikan awal <= akhir dan berbeda tanggal.');
      }
      return;
    }

    setIsLoading(true);
    setCurrentReport('time');
    toastInfo('Memulai proses bulk Time Summary...');
    try {
      const originalStartDateString = formatDate(startDate);
      const originalEndDateString = formatDate(endDate);
      const hubName = localStorage.getItem('userLocationName') || 'Lokasi';
      if (!driverData || driverData.length === 0) {
        throw new Error('Data Driver tidak valid.');
      }
      const datesToProcess = getDatesInRange(startDate, endDate);
      const zip = new JSZip();
      let filesGenerated = 0;
      for (const dateObj of datesToProcess) {
        const dateForFile = formatDate(dateObj);
        if (isDateSunday(dateForFile)) {
          const formattedDate = format(dateObj, 'dd-MM-yyyy');
          toastWarning(`Melewati ${formattedDate} (Hari Minggu)`);
          continue;
        }
        try {
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
            const { wb, excelFileName } = generateTimeSummaryWorkbook(
              driverData,
              allApiData,
              dateForFile,
              hubName
            );
            const excelUint8Array = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            zip.file(excelFileName, excelUint8Array);
            filesGenerated++;
          } else {
            toastWarning(
              `Tidak ada data Time Summary untuk ${dateForFile} (API call: ${timeFrom})`
            );
          }
        } catch (err) {
          toastError(`Gagal memproses ${dateForFile}: ${err.message}`);
        }
      }
      if (filesGenerated === 0) {
        toastError('Tidak ada file Time Summary yang berhasil dibuat.');
        return;
      }
      toastInfo('Membuat file ZIP...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `Bulk_Time_Summary_${originalStartDateString}_sd_${originalEndDateString}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toastSuccess(`Berhasil! ${filesGenerated} file telah di-zip dan diunduh.`);
    } catch (e) {
      toastError(e.message);
    } finally {
      setIsLoading(false);
      setCurrentReport('time');
    }
  };
  // --- (SELESAI HANDLER) ---

  return (
    <div className="w-full max-w-6xl p-4">
      <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-center">Laporan Periode</h1>
      <div className="flex flex-col sm:flex-row justify-center items-center">
        <div className="mb-8 text-center w-full max-w-xs">
          <label htmlFor="shippingDate" className="block text-lg mb-2 text-gray-500">
            Pilih Rentang Tanggal Pengiriman
          </label>

          <DatePicker
            selectsRange={true}
            startDate={startDate}
            endDate={endDate}
            onChange={handleDateChange}
            disabled={isLoading}
            dateFormat="dd/MM/yyyy"
            className="w-64 p-2 rounded border border-gray-300 text-slate-900 bg-white text-center"
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
