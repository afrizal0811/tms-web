'use client';

import {
  calculateStartFinishDates, // <-- Logic H-1
  formatYYYYMMDDToDDMMYYYY,
} from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import { getLocationHistories } from '../../lib/apiService';
import { toastError, toastSuccess } from '../../lib/toastHelper';
// (PERUBAHAN 1): Impor 'helper' baru
import { generateTimeSummaryWorkbook } from '../../lib/reportGenerators/timeReport'; // <-- Path diubah

export default function StartFinishSummary({
  driverData,
  isInputInvalid,
  isLoading,
  onLoadingChange,
  selectedDate,
  selectedLocationName,
}) {
  // (PERUBAHAN 2): Ganti total isi 'handleStartFinishSummary'
  const handleStartFinishSummary = async () => {
    if (onLoadingChange) onLoadingChange(true);
    try {
      // 1. Validasi Input
      if (isInputInvalid || selectedDate === '') {
        throw new Error('Tanggal belum dipilih atau tidak valid.');
      }
      if (!Array.isArray(driverData)) {
        throw new Error('Data Driver tidak valid.');
      }

      // 2. Tentukan parameter API (menggunakan H-1)
      const { timeFrom, timeTo } = calculateStartFinishDates(selectedDate);

      // 3. Panggil API
      const allApiData = await getLocationHistories({
        timeFrom: timeFrom,
        timeTo: timeTo,
        limit: 1000,
        startFinish: 'true',
        fields: 'finish,startTime,email,trackedTime,totalDistance',
        timeBy: 'createdTime',
      });

      if (allApiData.length === 0) {
        toastError('Tidak ada data task yang ditemukan untuk tanggal ini.');
        if (onLoadingChange) onLoadingChange(false);
        return;
      }

      // 4. Panggil Generator (Otak Laporan)
      const { wb, excelFileName } = generateTimeSummaryWorkbook(
        driverData,
        allApiData,
        selectedDate, // Kirim tanggal ASLI (pilihan user) untuk penamaan
        selectedLocationName
      );

      // 5. Download
      XLSX.writeFile(wb, excelFileName);
      toastSuccess('File Time Summary berhasil di-download!');
    } catch (e) {
      toastError(e.message);
    } finally {
      if (onLoadingChange) onLoadingChange(false);
    }
  };
  // --- (SELESAI PERUBAHAN 2) ---

  return (
    <div className="flex flex-col">
      <button
        onClick={handleStartFinishSummary}
        disabled={isLoading || isInputInvalid}
        className={`
          px-6 py-3 rounded w-full sm:w-64 text-center text-white font-bold text-lg 
          ${
            isInputInvalid
              ? 'bg-gray-400 cursor-not-allowed'
              : isLoading
                ? 'bg-sky-600 cursor-not-allowed'
                : 'bg-sky-600 hover:bg-sky-700 cursor-pointer'
          }
        `}
      >
        {isLoading ? (
          <div className="flex justify-center items-center">
            <div className="w-6 h-6 border-4 border-amber-400 border-t-white rounded-full animate-spin" />
          </div>
        ) : (
          'Time Summary'
        )}
      </button>
    </div>
  );
}
