// File: src/components/StartFinishSummary.js
'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx-js-style'; 
import {
  calculateStartFinishDates,
  formatTimestampToDDMMYYYY_UTC7,
  formatTimestampToQuotedHHMM_UTC7,
  calculateDurationAsQuotedHHMM,
  normalizeEmail,
  formatYYYYMMDDToDDMMYYYY
} from '@/lib/utils';

export default function StartFinishSummary({
  selectedLocation,
  selectedUser,
  driverData,
  selectedDate,
  selectedLocationName
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null); 

  const handleStartFinishSummary = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Cek driverData
      if (!Array.isArray(driverData)) {
        throw new Error("Data Driver tidak valid.");
      }
      
      // 2. Hitung tanggal
      const { timeFrom, timeTo } = calculateStartFinishDates(selectedDate);

      // 3. Panggil API
      const params = new URLSearchParams({
        timeFrom: timeFrom,
        timeTo: timeTo,
        limit: 1000,
        startFinish: "true",
        fields: "finish,startTime,email,trackedTime,totalDistance",
        timeBy: "createdTime"
      });
      const apiUrl = `/api/get-location-histories?${params.toString()}`;
      
      const response = await fetch(apiUrl);
      const responseData = await response.json();

      if (!response.ok) throw new Error(responseData.error || 'Gagal mengambil data location histories');
      
      if (!responseData.tasks || !Array.isArray(responseData.tasks.data)) {
         throw new Error("Format data tidak sesuai (tasks.data tidak ditemukan).");
      }
      const allData = responseData.tasks.data;

      // 4. Buat Map Driver
      const emailToDriverMap = driverData.reduce((acc, driver) => {
        const normalizedEmail = normalizeEmail(driver.email); 
        if (normalizedEmail) {
          acc[normalizedEmail] = { plat: driver.plat || null, name: driver.name };
        }
        return acc;
      }, {});

      // 5. Ubah 'selectedDate' (YYYY-MM-DD) ke format "DD-MM-YYYY" untuk perbandingan
      const [y, m, d] = selectedDate.split('-');
      const formattedSelectedDate = `${d}-${m}-${y}`;

      // 6. Proses Data
      const processedData = allData.map(item => {
        const email = normalizeEmail(item.email);
        const driverInfo = emailToDriverMap[email];
        const startTime = item.startTime;
        const finishTime = item.finish?.finishTime;
        const startDate = formatTimestampToDDMMYYYY_UTC7(startTime);
        const finishDate = formatTimestampToDDMMYYYY_UTC7(finishTime);

        // Data untuk filter
        const trackedTime = Math.abs(item.trackedTime || 0);
        const totalDistance = item.finish?.totalDistance || 0;
        
        return {
          // Kriteria Filter
          trackedTime: trackedTime,
          totalDistance: totalDistance,
          emailExists: !!driverInfo,
          startDate: startDate,
          finishDate: finishDate,
          
          // Data Tampilan
          plat: driverInfo?.plat || null,
          driver: driverInfo?.name || email,
          startTimeFormatted: formatTimestampToQuotedHHMM_UTC7(startTime),
          finishTimeFormatted: formatTimestampToQuotedHHMM_UTC7(finishTime),
          duration: calculateDurationAsQuotedHHMM(startTime, finishTime)
        };
      });

      // Filter
      const filteredData = processedData.filter(item => {
        const criteriaMet = item.trackedTime >= 10 && item.totalDistance > 5;
        const emailExists = item.emailExists;
        const dateMatches = item.startDate === formattedSelectedDate; 
        
        return criteriaMet && emailExists && dateMatches;
      });

      if (filteredData.length === 0) {
        alert('Tidak ada data yang memenuhi kriteria (waktu, jarak, email terdaftar, dan tanggal mulai yang sesuai).');
        setIsLoading(false);
        return;
      }
      
      // 7. Sortir berdasarkan Driver (Ascending)
      filteredData.sort((a, b) => {
         const driverA = a.driver || '';
         const driverB = b.driver || '';
         return driverA.localeCompare(driverB);
      });

      // 8. Proses Data untuk Excel
      const wb = XLSX.utils.book_new();
      const headers = ["Plat", "Driver", "Start Date", "Start Time", "Finish Date", "Finish Time", "Duration"];
      
      const finalSheetData = [headers, ...filteredData.map(item => [
        item.plat,
        item.driver,
        item.startDate,
        item.startTimeFormatted,
        item.finishDate,
        item.finishTimeFormatted,
        item.duration 
      ])];

      const ws = XLSX.utils.aoa_to_sheet(finalSheetData);

      // 9. Styling
      ws['!view'] = { state: 'frozen', ySplit: 1 };
      const colWidths = headers.map((header, i) => {
        const maxLength = finalSheetData.reduce((max, row) => Math.max(max, row[i] ? String(row[i]).length : 0), 0);
        return { wch: Math.min(maxLength + 2, 50) };
      });
      ws['!cols'] = colWidths;
      
      const headerStyle = { font: { bold: true }, alignment: { horizontal: "center", vertical: "center" } };
      const centerStyle = { alignment: { horizontal: "center", vertical: "center" } };
      const leftStyle = { alignment: { horizontal: "left", vertical: "center" } };
      const redFillStyle = { fill: { patternType: "solid", fgColor: { rgb: "FF0000" } } };

      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cellRef]) continue;
          
          if (R === 0) {
            ws[cellRef].s = headerStyle;
          } else {
            const rowData = filteredData[R - 1]; 
            
            // Default styling
            if (C === 0 || C === 1) { // Plat, Driver
               ws[cellRef].s = leftStyle;
            } else { // Dates, Times, Duration
               ws[cellRef].s = centerStyle;
            }

            // --- PERUBAHAN DI SINI ---
            // Cek jika Start Date != Finish Date (untuk styling)
            if (rowData && rowData.startDate !== rowData.finishDate) {
              if (C === 2) { // Kolom Start Date (index 2)
                ws[cellRef].s = { ...ws[cellRef].s, ...redFillStyle };
              }
              if (C === 4) { // Kolom Finish Date (index 4)
                ws[cellRef].s = { ...ws[cellRef].s, ...redFillStyle };
              }
            }
            // --- SELESAI PERUBAHAN ---
          }
        }
      }
      
      XLSX.utils.book_append_sheet(wb, ws, "Start-Finish Summary");
      
      // 10. Download
      const formattedDate = formatYYYYMMDDToDDMMYYYY(selectedDate);
      const excelFileName = `Time Summary - ${formattedDate} - ${selectedLocationName}.xlsx`;
      XLSX.writeFile(wb, excelFileName);

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col">
      <button
        onClick={handleStartFinishSummary}
        disabled={isLoading}
        className="px-6 py-3 rounded w-full sm:w-auto text-white
                   bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500"
      >
        {isLoading ? 'Memproses...' : '3. Generate Start-Finish'}
      </button>
      {error && (
        <p className="mt-2 text-red-500 text-xs text-center w-full max-w-xs">{error}</p>
      )}
    </div>
  );
}