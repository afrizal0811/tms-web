// File: src/components/StartFinishSummary.js
'use client';

import {
  calculateDurationAsQuotedHHMM,
  calculateStartFinishDates,
  formatTimestampToDDMMYYYY_UTC7,
  formatTimestampToQuotedHHMM_UTC7,
  formatYYYYMMDDToDDMMYYYY,
  normalizeEmail,
} from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import { getLocationHistories } from '../../lib/apiService';
import { toastError, toastSuccess } from '../../lib/toastHelper';

export default function StartFinishSummary({
  driverData,
  isLoading,
  onLoadingChange,
  selectedDate,
  selectedLocationName,
}) {
  const handleStartFinishSummary = async () => {
    if (onLoadingChange) onLoadingChange(true);
    try {
      // 1. Cek driverData
      if (!Array.isArray(driverData)) {
        throw new Error('Data Driver tidak valid.');
      }

      if (selectedDate === '') throw new Error('Tanggal belum dipilih.');

      const { timeFrom, timeTo } = calculateStartFinishDates(selectedDate);

      // 3. Panggil API (Tetap sama)
      const allApiData = await getLocationHistories({
        timeFrom: timeFrom,
        timeTo: timeTo,
        limit: 1000,
        startFinish: 'true',
        fields: 'finish,startTime,email,trackedTime,totalDistance',
        timeBy: 'createdTime',
      });

      // 'allApiData' dijamin berupa array (tasks.data)
      if (allApiData.length === 0) {
        toastError('Tidak ada data task yang ditemukan untuk tanggal ini.');
        if (onLoadingChange) onLoadingChange(false);
        return;
      }
      // 4. Buat Map Driver (Email -> Info)
      const emailToDriverMap = driverData.reduce((acc, driver) => {
        const normalizedEmail = normalizeEmail(driver.email);
        if (normalizedEmail) {
          acc[normalizedEmail] = { plat: driver.plat || null, name: driver.name };
        }
        return acc;
      }, {});

      // 5. Ubah 'selectedDate' ke format "DD-MM-YYYY"
      const [y, m, d] = selectedDate.split('-');
      const formattedSelectedDate = `${d}-${m}-${y}`;

      // 6. Proses Data API dan Filter (Hasilnya dimasukkan ke Map)
      const processedApiData = allApiData.map((item) => {
        const email = normalizeEmail(item.email);
        const driverInfo = emailToDriverMap[email];
        const startTime = item.startTime;
        const finishTime = item.finish?.finishTime;
        const startDate = formatTimestampToDDMMYYYY_UTC7(startTime);

        return {
          // Kriteria Filter
          email: email, // Penting untuk mapping
          trackedTime: Math.abs(item.trackedTime || 0),
          totalDistance: item.finish?.totalDistance || 0,
          emailExists: !!driverInfo,
          startDate: startDate,

          // Data Tampilan
          plat: driverInfo?.plat || null,
          driver: driverInfo?.name || email,
          startTimeFormatted: formatTimestampToQuotedHHMM_UTC7(startTime),
          finishDate: formatTimestampToDDMMYYYY_UTC7(finishTime),
          finishTimeFormatted: formatTimestampToQuotedHHMM_UTC7(finishTime),
          duration: calculateDurationAsQuotedHHMM(startTime, finishTime),
        };
      });

      // Filter data API
      const filteredApiData = processedApiData.filter((item) => {
        const criteriaMet = item.trackedTime >= 10 && item.totalDistance > 5;
        const emailExists = item.emailExists;
        const dateMatches = item.startDate === formattedSelectedDate;

        return criteriaMet && emailExists && dateMatches;
      });

      // Buat Map (Email -> Data API yang sudah difilter) untuk lookup
      const apiDataMap = filteredApiData.reduce((acc, item) => {
        if (item.email) {
          acc.set(item.email, item);
        }
        return acc;
      }, new Map());

      // --- PERUBAHAN LOGIKA UTAMA DIMULAI DARI SINI ---

      // 7. Filter Master List (driverData) sesuai Poin 1
      const masterDriverList = driverData.filter((driver) => {
        const plat = driver.plat || '';
        if (plat === '') return false; // Poin 1: Exclude jika plat null
        if (plat.toUpperCase().includes('DEMO')) return false; // Poin 1: Exclude "Demo"
        return true;
      });

      if (masterDriverList.length === 0) {
        alert(
          'Tidak ada data driver di master list yang memenuhi kriteria (bukan Demo / plat tidak null).'
        );
        if (onLoadingChange) onLoadingChange(false);
        return;
      }

      // 8. Buat data Excel dari masterDriverList, diperkaya dengan apiDataMap
      let excelDataObjects = masterDriverList.map((driver) => {
        const normalizedEmail = normalizeEmail(driver.email);
        const apiData = apiDataMap.get(normalizedEmail);

        if (apiData) {
          // Driver ada di master list DAN punya data di API
          return apiData;
        } else {
          // Driver ada di master list TAPI TIDAK punya data di API
          return {
            plat: driver.plat,
            driver: driver.name,
            startDate: null,
            startTimeFormatted: null,
            finishDate: null,
            finishTimeFormatted: null,
            duration: null,
            // (emailExists, trackedTime, etc. tidak perlu diisi krn hanya untuk internal)
          };
        }
      });

      // 9. Terapkan Sorting 3-Tingkat (Poin 2 & 3)
      const getSortGroup = (platStr) => {
        if (!platStr) return 1; // Asli
        const platUpper = platStr.toUpperCase();
        if (platUpper.includes('DM')) return 3;
        if (platUpper.includes('SEWA')) return 2;
        return 1; // Asli
      };

      excelDataObjects.sort((a, b) => {
        const groupA = getSortGroup(a.plat);
        const groupB = getSortGroup(b.plat);

        if (groupA !== groupB) {
          return groupA - groupB; // Urutkan berdasarkan grup (Asli, Sewa, DM)
        }

        // Jika grup sama, urutkan berdasarkan nama driver
        return (a.driver || '').localeCompare(b.driver || '');
      });

      // 10. Proses Data untuk Excel
      const wb = XLSX.utils.book_new();
      const headers = [
        'Plat',
        'Driver',
        'Start Date',
        'Start Time',
        'Finish Date',
        'Finish Time',
        'Duration',
      ];

      const finalSheetData = [
        headers,
        ...excelDataObjects.map((item) => [
          item.plat,
          item.driver,
          item.startDate,
          item.startTimeFormatted,
          item.finishDate,
          item.finishTimeFormatted,
          item.duration,
        ]),
      ];

      const ws = XLSX.utils.aoa_to_sheet(finalSheetData);

      // 11. Styling
      ws['!view'] = { state: 'frozen', ySplit: 1 };
      const colWidths = headers.map((header, i) => {
        const maxLength = finalSheetData.reduce(
          (max, row) => Math.max(max, row[i] ? String(row[i]).length : 0),
          0
        );
        return { wch: Math.min(maxLength + 2, 50) };
      });
      ws['!cols'] = colWidths;

      const headerStyle = {
        font: { bold: true },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
      const centerStyle = { alignment: { horizontal: 'center', vertical: 'center' } };
      const leftStyle = { alignment: { horizontal: 'left', vertical: 'center' } };
      const redFillStyle = { fill: { patternType: 'solid', fgColor: { rgb: 'FF0000' } } };

      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cellRef]) continue;

          if (R === 0) {
            ws[cellRef].s = headerStyle;
          } else {
            // Gunakan excelDataObjects (data yg sudah di-sort) untuk cek styling
            const rowData = excelDataObjects[R - 1];

            // Default styling
            if (C === 0 || C === 1) {
              // Plat, Driver
              ws[cellRef].s = leftStyle;
            } else {
              // Dates, Times, Duration
              ws[cellRef].s = centerStyle;
            }

            // Cek jika Start Date != Finish Date
            // (Jika rowData.startDate null, perbandingan null !== null akan false, jadi aman)
            if (
              rowData &&
              rowData.startDate !== rowData.finishDate &&
              rowData.startDate &&
              rowData.finishDate
            ) {
              if (C === 2) {
                // Kolom Start Date (index 2)
                ws[cellRef].s = { ...ws[cellRef].s, ...redFillStyle };
              }
              if (C === 4) {
                // Kolom Finish Date (index 4)
                ws[cellRef].s = { ...ws[cellRef].s, ...redFillStyle };
              }
            }
          }
        }
      }

      XLSX.utils.book_append_sheet(wb, ws, 'Start-Finish Summary');

      // 12. Download
      const formattedDate = formatYYYYMMDDToDDMMYYYY(selectedDate);
      const excelFileName = `Time Summary - ${formattedDate} - ${selectedLocationName}.xlsx`;
      XLSX.writeFile(wb, excelFileName);
      toastSuccess('File Time Summary berhasil di-download!');
    } catch (e) {
      toastError(e.message);
    } finally {
      if (onLoadingChange) onLoadingChange(false);
    }
  };

  return (
    <div className="flex flex-col">
      <button
        onClick={handleStartFinishSummary}
        disabled={isLoading}
        className={`
          px-6 py-3 rounded w-full sm:w-64 text-center text-white font-bold text-lg 
          ${
            isLoading
              ? 'bg-sky-600 cursor-not-allowed'
              : 'bg-sky-600 hover:bg-sky-700 cursor-pointer' // Style normal/loading
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
