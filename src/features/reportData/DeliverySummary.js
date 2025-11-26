'use client';

import { toastSuccess } from '@/lib/toastHelper';
import { calculateTargetDates } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import { getResultsSummary, getTasks } from '../../lib/apiService';
import { toastError } from '../../lib/toastHelper';
// (PERUBAHAN 1): Impor 'helper' baru
import { generateDeliveryWorkbook } from '../../lib/reportGenerators/deliveryReport'; // <-- Path diubah

export default function DeliverySummary({
  driverData,
  isInputInvalid,
  isLoading,
  onLoadingChange,
  selectedDate,
  selectedLocation,
  selectedLocationName,
}) {
  // (PERUBAHAN 2): Ganti total isi 'handleDeliverySummary'
  const handleDeliverySummary = async () => {
    if (onLoadingChange) onLoadingChange(true);
    try {
      // 1. Validasi Input (sama seperti TmsSummary)
      if (isInputInvalid || selectedDate === '') {
        throw new Error('Tanggal belum dipilih atau tidak valid.');
      }
      if (!selectedLocation || !Array.isArray(driverData) || driverData.length === 0) {
        throw new Error('Data Hub atau Driver tidak valid.');
      }

      // 2. Tentukan parameter API (menggunakan H-1)
      const { dateFrom: apiDate } = calculateTargetDates(selectedDate);
      const timeFrom = `${selectedDate} 00:00:00`;
      const timeTo = `${selectedDate} 23:59:59`;

      // 3. Fetch Data
      const tasksPromise = getTasks({
        hubId: selectedLocation,
        status: 'DONE',
        timeFrom: timeFrom,
        timeTo: timeTo,
        timeBy: 'doneTime',
        limit: 1000,
      });

      const resultsPromise = getResultsSummary({
        dateFrom: timeFrom, // Gunakan timeFrom H-1 yang sama
        dateTo: timeTo, // Gunakan timeTo H-1 yang sama
        limit: 500,
        hubId: selectedLocation,
      });

      const [allTasks, resultsData] = await Promise.all([tasksPromise, resultsPromise]);

      if (allTasks.length === 0) {
        toastError('Tidak ada data yang ditemukan untuk tanggal ini.');
        if (onLoadingChange) onLoadingChange(false);
        return;
      }
      if (!resultsData) {
        toastError('Gagal mengambil data results summary.');
      }

      // 4. Panggil Generator (Otak Laporan)
      const { wb, excelFileName } = generateDeliveryWorkbook(
        driverData,
        allTasks,
        resultsData,
        selectedDate,
        apiDate,
        selectedLocation,
        selectedLocationName
      );

      // 5. Download File
      XLSX.writeFile(wb, excelFileName);
      toastSuccess('File Delivery Summary berhasil di-download!');
    } catch (err) {
      toastError(err.message);
    } finally {
      if (onLoadingChange) onLoadingChange(false);
    }
  };
  // --- (SELESAI PERUBAHAN 2) ---

  return (
    <div className="flex flex-col">
      <button
        onClick={handleDeliverySummary}
        disabled={isLoading || isInputInvalid}
        className={`
          px-6 py-3 rounded w-full sm:w-64 text-center text-white font-bold text-lg cursor-pointer
          ${
            isInputInvalid
              ? 'bg-gray-400 cursor-not-allowed'
              : isLoading
                ? 'bg-sky-600'
                : 'bg-sky-600 hover:bg-sky-700'
          }
        `}
      >
        {isLoading ? (
          <div className="flex justify-center items-center">
            <div className="w-6 h-6 border-4 border-amber-400 border-t-white rounded-full animate-spin" />
          </div>
        ) : (
          'Delivery Summary'
        )}
      </button>
    </div>
  );
}
