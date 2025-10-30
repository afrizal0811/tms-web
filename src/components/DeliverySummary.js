// File: src/components/DeliverySummary.js
'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';

// Daftar status yang dianggap "tidak terkirim"
const FAILED_STATUSES = ["PENDING", "BATAL", "TERIMA SEBAGIAN"];

/**
 * Fungsi helper untuk membersihkan/menormalisasi email
 * @param {string} email
 * @returns {string | null}
 */
const normalizeEmail = (email) => {
  if (typeof email !== 'string' || !email) {
    return null;
  }
  return email.toLowerCase().trim(); // Ubah ke lowercase dan hapus spasi
};


export default function DeliverySummary({ selectedLocation, selectedUser, driverData, selectedDate }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleDeliverySummary = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // --- 1. Persiapan Parameter ---
      if (!selectedLocation || !Array.isArray(driverData)) {
        throw new Error("Data Hub atau Driver tidak valid.");
      }

      const timeFrom = `${selectedDate} 00:00:00`;
      const timeTo = `${selectedDate} 23:59:59`;

      const params = new URLSearchParams({
        hubId: selectedLocation,
        status: "DONE",
        timeFrom: timeFrom,
        timeTo: timeTo,
        timeBy: "doneTime",
        limit: 1000
      });
      const apiUrl = `/api/get-tasks?${params.toString()}`;

      // --- 2. Fetch Data ---
      const response = await fetch(apiUrl);
      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Gagal mengambil data tasks');
      }

      if (!responseData.tasks || !Array.isArray(responseData.tasks.data)) {
         throw new Error("Format data tasks tidak sesuai (bukan array atau 'tasks.data' tidak ditemukan).");
      }
      
      const allTasks = responseData.tasks.data; 
      
      if (allTasks.length === 0) {
        alert('Tidak ada data task yang ditemukan untuk tanggal ini.');
        setIsLoading(false);
        return;
      }

      // --- 3. Proses Data ---
      
      const emailToDriverMap = driverData.reduce((acc, driver) => {
        const normalizedEmail = normalizeEmail(driver.email);
        if (normalizedEmail) {
          acc[normalizedEmail] = { 
            plat: driver.plat || null, 
            name: driver.name 
          };
        }
        return acc;
      }, {});

      const driverStats = new Map();

      for (const task of allTasks) {
        const emailString = (Array.isArray(task.assignee) && task.assignee.length > 0) 
                              ? task.assignee[0] 
                              : null;
        const driverEmail = normalizeEmail(emailString);
        const statusLabel = (task.label && task.label.length > 0) ? task.label[0].toUpperCase() : null;

        if (!driverEmail) { 
          continue; 
        }

        const stats = driverStats.get(driverEmail) || { totalOutlet: 0, failedCount: 0 };
        stats.totalOutlet += 1;

        if (FAILED_STATUSES.includes(statusLabel)) {
          stats.failedCount += 1;
        }

        driverStats.set(driverEmail, stats);
      }

      if (driverStats.size === 0) {
         throw new Error("Tidak ada data task yang cocok dengan data driver di localStorage.");
      }

      // --- 4. Siapkan Data Excel ---

      const wb = XLSX.utils.book_new();
      
      const headers = ["Plat", "Driver", "Total Outlet", "Total Delivery"];
      
      const sheetData = Array.from(driverStats.entries()).map(([driverEmail, stats]) => {
        const driverInfo = emailToDriverMap[driverEmail]; 
        
        const plat = driverInfo ? driverInfo.plat : null;
        const driverName = driverInfo ? driverInfo.name : driverEmail; 
        const totalDelivery = stats.totalOutlet - stats.failedCount;
        
        return [
          plat,
          driverName,
          stats.totalOutlet,
          totalDelivery
        ];
      });

      // --- Custom Sorting (SEWA di bawah) ---
      sheetData.sort((a, b) => {
        const aPlat = String(a[0] || '').toUpperCase();
        const bPlat = String(b[0] || '').toUpperCase();
        const aDriver = String(a[1] || '');
        const bDriver = String(b[1] || '');

        const aHasSewa = aPlat.includes('SEWA');
        const bHasSewa = bPlat.includes('SEWA');

        if (aHasSewa && !bHasSewa) return 1;
        if (!aHasSewa && bHasSewa) return -1;
        return aDriver.localeCompare(bDriver);
      });
      // --- Selesai Sorting ---

      const finalSheetData = [headers, ...sheetData];
      const wsDelivered = XLSX.utils.aoa_to_sheet(finalSheetData);

      // (Styling)
      const headerStyle = { font: { bold: true }, alignment: { horizontal: "center", vertical: "center" } };
      const centerStyle = { alignment: { horizontal: "center", vertical: "center" } };
      wsDelivered['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 15 }];
      wsDelivered['A1'].s = headerStyle;
      wsDelivered['B1'].s = headerStyle;
      wsDelivered['C1'].s = headerStyle;
      wsDelivered['D1'].s = headerStyle;

      // --- PERUBAHAN DI SINI: Tambahkan 'h: true' (hidden) ---
      wsDelivered['D1'].c = [
        { a: 'Info', t: 'Total Outlet - (Pending + Batal + Terima Sebagian)', h: true }
      ];
      // --- SELESAI PERUBAHAN ---

      finalSheetData.forEach((row, R) => {
        if (R === 0) return;
        if (wsDelivered[`A${R+1}`]) wsDelivered[`A${R+1}`].s = centerStyle;
        if (wsDelivered[`B${R+1}`]) wsDelivered[`B${R+1}`].s = { alignment: { horizontal: "left", vertical: "center" } };
        if (wsDelivered[`C${R+1}`]) wsDelivered[`C${R+1}`].s = centerStyle;
        if (wsDelivered[`D${R+1}`]) wsDelivered[`D${R+1}`].s = centerStyle;
      });

      XLSX.utils.book_append_sheet(wb, wsDelivered, "Total Delivered");

      // Sheet 2, 3, 4 (Placeholder)
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[]]), "Hasil Pending SO");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[]]), "Hasil RO vs Real");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[]]), "Update Longlat");

      // --- 5. Download File ---
      const excelFileName = `Delivery_Summary_${selectedDate}.xlsx`;
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
        onClick={handleDeliverySummary}
        disabled={isLoading}
        className="px-6 py-3 rounded w-full sm:w-auto text-white
                   bg-green-600 hover:bg-green-700 disabled:bg-gray-500"
      >
        {isLoading ? 'Memproses...' : '2. Generate Delivery Summary'}
      </button>
      {error && (
        <p className="mt-2 text-red-500 text-xs text-center w-full max-w-xs">{error}</p>
      )}
    </div>
  );
}