'use client';

// (PERUBAHAN 1): Impor 'DatePicker'
import { getResultsSummary } from '@/lib/apiService';
import { TAG_MAP_KEY } from '@/lib/constants';
import { generateRoutingWorkbook } from '@/lib/reportGenerators';
import { toastError, toastInfo, toastSuccess, toastWarning } from '@/lib/toastHelper';
import {
  calculateTargetDates,
  getTodayDateString,
  isDateSunday,
  formatDate,
  formatYYYYMMDDToDDMMYYYY,
} from '@/lib/utils';
import JSZip from 'jszip';
import { useState } from 'react';
import DatePicker from 'react-datepicker'; // <-- Impor baru
import 'react-datepicker/dist/react-datepicker.css'; // <-- (Tambahan) Seringkali diperlukan
import * as XLSX from 'xlsx-js-style';


// (PERUBAHAN B): Perbaiki 'getDatesInRange' agar tidak pakai toISOString
function getDatesInRange(startDate, endDate) {
  const dates = [];
  // Buat salinan baru agar tidak mengubah state asli
  let currentDate = new Date(startDate.getTime());
  const stopDate = new Date(endDate.getTime());

  // Setel jam ke tengah hari (12:00)
  // Ini trik aman untuk menghindari masalah saat iterasi tanggal
  // jika terjadi pergantian Daylight Saving Time (DST) tepat jam 00:00.
  currentDate.setHours(12, 0, 0, 0);
  stopDate.setHours(12, 0, 0, 0);

  while (currentDate <= stopDate) {
    // Gunakan helper format LOKAL kita yang baru (PERUBAHAN A)
    dates.push(formatDate(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
}

export default function BulkReportDownloader({ driverData }) {
  // (State tidak berubah)
  const [startDate, setStartDate] = useState(new Date(getTodayDateString().replace(/-/g, '/')));
  const [endDate, setEndDate] = useState(new Date(getTodayDateString().replace(/-/g, '/')));

  const [isLoading, setIsLoading] = useState(false);
  const [currentReport, setCurrentReport] = useState(null);

  // (Handler DatePicker tidak berubah)
  const handleDateChange = (dates) => {
    const [start, end] = dates;
    setStartDate(start);
    setEndDate(end);
  };

  // --- (Handler untuk tombol-tombol - Diperbarui) ---

  const handleBulkRoutingSummary = async () => {
    setIsLoading(true);
    setCurrentReport('routing');

    const startDateString = formatYYYYMMDDToDDMMYYYY(formatDate(startDate));
    const endDateString = formatYYYYMMDDToDDMMYYYY(formatDate(endDate));

    if (startDateString === endDateString) {
      toastError(`Tidak boleh 1 tanggal. Harap pilih rentang tanggal (minimal 2 hari).`);
      setIsLoading(false);
      return;
    }

    if (isDateSunday(startDateString) || isDateSunday(endDateString)) {
      toastError(`Tanggal awal atau tanggal akhir tidak boleh hari Minggu.`);
      setIsLoading(false);
      return;
    }

    toastInfo('Mengambil data...');
    try {
      if (!startDate || !endDate) {
        throw new Error('Harap pilih rentang tanggal yang valid.');
      }

      const hubId = localStorage.getItem('userLocation');
      const hubName = localStorage.getItem('userLocationName') || 'Lokasi';
      if (!hubId || !driverData || driverData.length === 0) {
        throw new Error('Data Hub atau Driver tidak valid.');
      }

      const fullTagMap = JSON.parse(localStorage.getItem(TAG_MAP_KEY) || '{}');
      const hubTagMap = fullTagMap[hubId] || {};

      // (PERUBAHAN F): Panggil getDatesInRange (versi LOKAL) yang baru
      const datesToProcess = getDatesInRange(startDate, endDate);
      const zip = new JSZip();
      let filesGenerated = 0;

      for (const date of datesToProcess) {
        try {
          if (isDateSunday(date)) continue;
          const { dateFrom, dateTo } = calculateTargetDates(date);
          const resultsData = await getResultsSummary({
            dateFrom,
            dateTo,
            limit: 500,
            hubId,
          });
          // ... (sisa logika filter dan generate workbook tidak berubah)
          const filteredResults = resultsData.filter((item) => item.dispatchStatus === 'done');

          if (filteredResults.length > 0) {
            const { wb, excelFileName } = generateRoutingWorkbook(
              driverData,
              filteredResults,
              hubTagMap,
              date,
              hubName
            );
            const excelUint8Array = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            zip.file(excelFileName, excelUint8Array);
            filesGenerated++;
          } else {
            toastWarning(`Tidak ada data Routing Summary untuk ${date}`);
          }
        } catch (err) {
          toastError(`Gagal memproses ${date}: ${err.message}`);
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

      // (PERUBAHAN G): Nama file ZIP sekarang akan benar
      // karena startDateString dan endDateString sudah diformat dengan benar
      link.download = `Routing Summary - ${startDateString} - ${endDateString}.zip`;
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

  // ... (handler lain dan JSX return tidak berubah) ...
  // ... (pastikan Anda mengimpor CSS untuk react-datepicker jika belum) ...

  const handleBulkDeliverySummary = () => {
    toastWarning('Fitur bulk Delivery Summary belum tersedia.');
  };

  const handleBulkTimeSummary = () => {
    toastWarning('Fitur bulk Time Summary belum tersedia.');
  };
  // --- (SELESAI HANDLER) ---

  return (
    <div className="w-full max-w-6xl p-4 mt-10">
      <h2 className="text-2xl font-bold text-gray-700 mb-6 text-center">
        Laporan Bulk (Multi-Tanggal)
      </h2>

      {/* --- (Picker tidak berubah) --- */}
      <div className="flex flex-col sm:flex-row justify-center items-center gap-4 p-6 ">
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-gray-500 mb-1 text-center">
            Pilih Rentang Tanggal
          </label>

          {/* Ini adalah komponen DatePicker yang baru */}
          <DatePicker
            selectsRange={true}
            startDate={startDate}
            endDate={endDate}
            onChange={handleDateChange} // <-- Handler baru
            disabled={isLoading}
            dateFormat="dd/MM/yyyy" // Format tampilan
            // Ini adalah class untuk membuat input-nya terlihat bagus
            className="w-64 p-2 rounded border border-gray-300 text-slate-900 bg-white text-center"
          />
        </div>
      </div>
      {/* --- (SELESAI PERUBAHAN 8) --- */}

      {/* --- (Tombol-tombol - tidak berubah) --- */}
      <div className="mt-8 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 w-full justify-center">
        {/* Tombol Routing Summary */}
        <button
          onClick={handleBulkRoutingSummary}
          disabled={isLoading}
          className={`
            px-6 py-3 rounded w-full sm:w-64 text-center text-white font-bold text-lg 
            ${
              isLoading && currentReport === 'routing'
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-sky-600 hover:bg-sky-700 cursor-pointer disabled:bg-gray-400'
            }
          `}
        >
          {isLoading && currentReport === 'routing' ? (
            <div className="flex justify-center items-center">
              <div className="w-6 h-6 border-4 border-amber-400 border-t-white rounded-full animate-spin" />
            </div>
          ) : (
            'Routing Summary'
          )}
        </button>

        {/* Tombol Delivery Summary */}
        <button
          onClick={handleBulkDeliverySummary}
          disabled={isLoading}
          className={`
            px-6 py-3 rounded w-full sm:w-64 text-center text-white font-bold text-lg 
            ${
              isLoading && currentReport === 'delivery'
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-sky-600 hover:bg-sky-700 cursor-pointer disabled:bg-gray-400'
            }
          `}
        >
          {isLoading && currentReport === 'delivery' ? (
            <div className="flex justify-center items-center">
              <div className="w-6 h-6 border-4 border-amber-400 border-t-white rounded-full animate-spin" />
            </div>
          ) : (
            'Delivery Summary'
          )}
        </button>

        {/* Tombol Time Summary */}
        <button
          onClick={handleBulkTimeSummary}
          disabled={isLoading}
          className={`
            px-6 py-3 rounded w-full sm:w-64 text-center text-white font-bold text-lg 
            ${
              isLoading && currentReport === 'time'
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-sky-600 hover:bg-sky-700 cursor-pointer disabled:bg-gray-400'
            }
          `}
        >
          {isLoading && currentReport === 'time' ? (
            <div className="flex justify-center items-center">
              <div className="w-6 h-6 border-4 border-amber-400 border-t-white rounded-full animate-spin" />
            </div>
          ) : (
            'Time Summary'
          )}
        </button>
      </div>
    </div>
  );
}
