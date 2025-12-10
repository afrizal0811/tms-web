// File: features/reportData/TmsSummary.js
'use client';

import Spinner from '@/components/Spinner';
import { getLocationHistories, getResultsSummary, getTasks } from '@/lib/apiService';
import { TAG_MAP_KEY } from '@/lib/constants';
import { toastError, toastSuccess, toastWarning } from '@/lib/toastHelper';
import { useState } from 'react';
import DatePicker from 'react-datepicker';
import * as XLSX from 'xlsx-js-style';

import {
  calculateStartFinishDates,
  calculateTargetDates,
  formatDate,
  getTodayDateString,
  isDateSunday,
} from '@/lib/utils';

import { generateDeliveryWorkbook } from '@/lib/reportGenerators/deliveryReport';
import { generateRoutingWorkbook } from '@/lib/reportGenerators/routingReport';
import { generateTimeSummaryWorkbook } from '@/lib/reportGenerators/timeReport';

const parseDate = (dateStr) => new Date(dateStr.replace(/-/g, '/'));

/**
 * Unified TmsSummary component.
 *
 * Props:
 * - driverData: array
 * - isAnyLoading: boolean (parent-level)
 * - isMapping: boolean (parent-level)
 * - selectedLocation: string hubId
 * - selectedLocationName: string
 * - setIsAnyLoading: fn
 * - setIsMapping: fn
 */
export default function TmsSummary({
  driverData,
  isAnyLoading,
  isMapping,
  selectedLocation,
  selectedLocationName,
  setIsAnyLoading,
  setIsMapping,
}) {
  const initialDate = parseDate(getTodayDateString());
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [currentRunning, setCurrentRunning] = useState(null); // 'routing'|'delivery'|'time'|null

  const selectedDateString = formatDate(selectedDate); // "YYYY-MM-DD"
  const isDateInvalid = isDateSunday(selectedDateString);

  const disabledCommon = isAnyLoading || isMapping;

  const safeEnsureDriverData = () => {
    if (!Array.isArray(driverData) || driverData.length === 0) {
      throw new Error('Data driver belum dimuat. Mohon muat data driver terlebih dahulu.');
    }
    if (!selectedLocation) {
      throw new Error('Lokasi belum dipilih.');
    }
  };

  // ---------- Handlers (gabungan) ----------
  const handleRouting = async () => {
    if (isDateInvalid) {
      toastError('Tidak ada pengiriman saat Minggu. Silahkan pilih tanggal lain.');
      return;
    }

    try {
      if (setIsAnyLoading) setIsAnyLoading(true);
      setCurrentRunning('routing');
      if (setIsMapping) setIsMapping(false);

      safeEnsureDriverData();

      if (!selectedDateString) throw new Error('Tanggal tidak valid.');

      // H-1 logic encapsulated by helper
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
      if (filteredResults.length === 0) {
        throw new Error('Tidak ada data yang ditemukan untuk tanggal ini (Routing).');
      }

      // Tag map for mapping validation
      const fullTagMap = JSON.parse(localStorage.getItem(TAG_MAP_KEY) || '{}');
      const hubTagMap = fullTagMap[selectedLocation] || {};

      const { wb, excelFileName, missingTimesFound } = generateRoutingWorkbook(
        driverData,
        filteredResults,
        hubTagMap,
        selectedDateString,
        selectedLocationName
      );

      if (missingTimesFound) {
        toastWarning(
          'Travel Time atau Visit Time tidak ada di API. Periksa manual di menu Routing!'
        );
      }

      XLSX.writeFile(wb, excelFileName);
      toastSuccess('File Routing Summary berhasil diunduh!');
    } catch (err) {
      toastError(err.message || String(err));
    } finally {
      setCurrentRunning(null);
      if (setIsAnyLoading) setIsAnyLoading(false);
      if (setIsMapping) setIsMapping(false);
    }
  };

  const handleDelivery = async () => {
    if (isDateInvalid) {
      toastError('Tidak ada pengiriman saat Minggu. Silahkan pilih tanggal lain.');
      return;
    }

    try {
      if (setIsAnyLoading) setIsAnyLoading(true);
      setCurrentRunning('delivery');

      safeEnsureDriverData();

      if (!selectedDateString) throw new Error('Tanggal tidak valid.');

      // calculateTargetDates returns dateFrom (H-1) as needed by prior logic
      const { dateFrom: apiDate } = calculateTargetDates(selectedDateString);
      const timeFrom = `${selectedDateString} 00:00:00`;
      const timeTo = `${selectedDateString} 23:59:59`;

      const tasksPromise = getTasks({
        hubId: selectedLocation,
        status: 'DONE',
        timeFrom,
        timeTo,
        timeBy: 'doneTime',
        limit: 5000,
      });

      const resultsPromise = getResultsSummary({
        dateFrom: timeFrom,
        dateTo: timeTo,
        limit: 1000,
        hubId: selectedLocation,
      });

      const [allTasks, resultsData] = await Promise.all([tasksPromise, resultsPromise]);

      if (!Array.isArray(allTasks) || allTasks.length === 0) {
        throw new Error('Tidak ada data Delivery untuk tanggal ini.');
      }

      const { wb, excelFileName } = generateDeliveryWorkbook(
        driverData,
        allTasks,
        resultsData || [],
        selectedDateString,
        apiDate,
        selectedLocation,
        selectedLocationName
      );

      XLSX.writeFile(wb, excelFileName);
      toastSuccess('File Delivery Summary berhasil diunduh!');
    } catch (err) {
      toastError(err.message || String(err));
    } finally {
      setCurrentRunning(null);
      if (setIsAnyLoading) setIsAnyLoading(false);
    }
  };

  const handleTime = async () => {
    if (isDateInvalid) {
      toastError('Tidak ada pengiriman saat Minggu. Silahkan pilih tanggal lain.');
      return;
    }

    try {
      if (setIsAnyLoading) setIsAnyLoading(true);
      setCurrentRunning('time');

      safeEnsureDriverData();

      if (!selectedDateString) throw new Error('Tanggal tidak valid.');

      const { timeFrom, timeTo } = calculateStartFinishDates(selectedDateString);

      const allApiData = await getLocationHistories({
        timeFrom,
        timeTo,
        limit: 5000,
        startFinish: 'true',
        fields: 'finish,startTime,email,trackedTime,totalDistance',
        timeBy: 'createdTime',
      });

      if (!Array.isArray(allApiData) || allApiData.length === 0) {
        throw new Error('Tidak ada data Start/Finish untuk tanggal ini.');
      }

      const { wb, excelFileName, error } = generateTimeSummaryWorkbook(
        driverData,
        allApiData,
        selectedDateString,
        selectedLocationName
      );

      if (error) {
        throw new Error('Tidak ada data Start/Finish untuk tanggal ini.');
      }

      XLSX.writeFile(wb, excelFileName);
      toastSuccess('File Time Summary berhasil diunduh!');
    } catch (err) {
      toastError(err.message || String(err));
    } finally {
      setCurrentRunning(null);
      if (setIsAnyLoading) setIsAnyLoading(false);
    }
  };
  // ---------- end handlers ----------

  const handleDateChange = (date) => {
    if (!date) {
      toastError('Pilih tanggal pengiriman');
      return;
    }
    // allow selecting any date in picker but warn on Sunday selection
    if (date.getDay() === 0) {
      toastError('Tidak ada pengiriman saat Minggu. Silahkan pilih tanggal lain');
      return;
    }
    setSelectedDate(date);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-6xl p-4">
      <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-center">Laporan Harian</h1>

      <div className="mb-8 text-center w-full max-w-xs cursor-pointer">
        <label htmlFor="shippingDate" className="block text-lg mb-2 text-gray-500">
          Tanggal Pengiriman
        </label>
        <DatePicker
          className="p-2 rounded border border-gray-300 bg-white text-slate-900 disabled:bg-gray-200 disabled:text-gray-400 w-full max-w-xs text-center"
          dateFormat="dd MMMM yyyy"
          disabled={disabledCommon}
          id="shippingDate"
          maxDate={new Date()}
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
            <div className="flex justify-center items-center">
              <Spinner size="w-6 h-6" border="border-4 border-amber-400 border-t-white" />
            </div>
          ) : (
            'Routing Summary'
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
            <div className="flex justify-center items-center">
              <Spinner size="w-6 h-6" border="border-4 border-amber-400 border-t-white" />
            </div>
          ) : (
            'Delivery Summary'
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
