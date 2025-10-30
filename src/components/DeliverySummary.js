// File: src/components/DeliverySummary.js
'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx-js-style'; 
import { 
  formatTimestampToHHMM, 
  calculateMinuteDifference, 
  extractCustomerId,
  formatSimpleTime,
  extractTempFromDriverName
} from '@/lib/utils';

// Status yang dianggap "tidak terkirim" (untuk Sheet 1)
const FAILED_STATUSES = ["PENDING", "BATAL", "TERIMA SEBAGIAN"];

// Status yang ingin ditampilkan di Sheet 2 ("Hasil Pending SO")
// "PENDING GR" akan kita tangani secara dinamis
const PENDING_SHEET_STATUSES_BASE = ["PENDING", "BATAL", "TERIMA SEBAGIAN"];

/**
 * Fungsi helper untuk membersihkan/menormalisasi email
 * @param {string} email
 * @returns {string | null}
 */
const normalizeEmail = (email) => {
  if (typeof email !== 'string' || !email) return null;
  return email.toLowerCase().trim(); 
};


export default function DeliverySummary({ selectedLocation, selectedUser, driverData, selectedDate }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleDeliverySummary = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // --- 1. Persiapan Parameter & Cek Hub Spesial ---
      if (!selectedLocation || !Array.isArray(driverData)) {
        throw new Error("Data Hub atau Driver tidak valid.");
      }

      // 1. Tentukan apakah ini hub spesial
      const specialHubs = ['6895a281bc530d4a4908f5ef', '68b8038b1aa98343380e3ab2'];
      const isSpecialHub = specialHubs.includes(selectedLocation);
      let migrationOccurred = false; // Flag untuk melacak jika ada data PENDING GR yg dipindah

      // Tentukan status apa saja yg akan ditampilkan di sheet 2
      const PENDING_SHEET_STATUSES = [...PENDING_SHEET_STATUSES_BASE];
      if (isSpecialHub) {
        PENDING_SHEET_STATUSES.push("PENDING GR");
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
      if (!response.ok) throw new Error(responseData.error || 'Gagal mengambil data tasks');
      if (!responseData.tasks || !Array.isArray(responseData.tasks.data)) {
         throw new Error("Format data tasks tidak sesuai (tasks.data tidak ditemukan).");
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
          acc[normalizedEmail] = { plat: driver.plat || null, name: driver.name };
        }
        return acc;
      }, {});

      const driverStats = new Map(); 
      let allTaskDataForSequence = []; 

      for (const task of allTasks) {
        const emailString = (Array.isArray(task.assignee) && task.assignee.length > 0) ? task.assignee[0] : null;
        const driverEmail = normalizeEmail(emailString);
        const driverInfo = driverEmail ? emailToDriverMap[driverEmail] : null;
        const driverName = driverInfo ? driverInfo.name : (driverEmail || 'N/A');
        const statusLabel = (task.label && task.label.length > 0) ? task.label[0].toUpperCase() : null;

        if (driverEmail) { 
          const stats = driverStats.get(driverEmail) || { totalOutlet: 0, failedCount: 0 };
          stats.totalOutlet += 1;
          if (FAILED_STATUSES.includes(statusLabel)) stats.failedCount += 1;
          driverStats.set(driverEmail, stats);
        }

        const customerName = task.customerName || '';
        const flow = task.flow;

        let actualArrival, actualDeparture;
        if (flow && flow.toUpperCase().includes('GR')) { 
          actualArrival = task.page1DoneTime;
          actualDeparture = task.page1DoneTime;
        } else {
          actualArrival = task.klikJikaSudahSampai;
          actualDeparture = task.page3DoneTime;
        }
        
        // --- LOGIKA MIGRASI PENDING GR ---
        let fakturBatal = null, terkirimSebagian = null, pending = null, pendingGR = null;
        let isMigrated = false; // Flag untuk sel ini

        if (statusLabel === "BATAL") {
          fakturBatal = customerName;
        } else if (statusLabel === "TERIMA SEBAGIAN") {
          terkirimSebagian = customerName;
        } else if (statusLabel === "PENDING") {
          pending = customerName;
        } else if (statusLabel === "PENDING GR") {
          if (isSpecialHub) {
            pendingGR = customerName; // Hub spesial, masukkan ke PENDING GR
          } else {
            pending = customerName; // Hub non-spesial, pindahkan ke Pending
            isMigrated = true;
            migrationOccurred = true;
          }
        }
        // --- SELESAI LOGIKA MIGRASI ---

        allTaskDataForSequence.push({
          driver: driverName,
          plat: driverInfo ? driverInfo.plat : null,
          actualArrivalTimestamp: actualArrival ? new Date(actualArrival).getTime() : null,
          roSequence: task.routePlannedOrder || 0,
          statusLabel: statusLabel, 
          isMigrated: isMigrated, // Simpan status migrasi
          
          flow: flow,
          fakturBatal: fakturBatal,
          terkirimSebagian: terkirimSebagian,
          pending: pending,
          pendingGR: pendingGR, // Akan null jika bukan hub spesial
          reason: task.alasan,
          openTime: formatSimpleTime(task.openTime),
          closeTime: formatSimpleTime(task.closeTime),
          eta: formatSimpleTime(task.eta), 
          etd: formatSimpleTime(task.etd),
          actualArrival: formatTimestampToHHMM(actualArrival),
          actualDeparture: formatTimestampToHHMM(actualDeparture),
          visitTime: task.visitTime,
          actualVisitTime: calculateMinuteDifference(actualDeparture, actualArrival),
          customerId: extractCustomerId(customerName),
          temperature: extractTempFromDriverName(driverName), 
          realSequence: 0 
        });
      }

      // --- 4. Hitung Real Sequence (berdasarkan SEMUA task) ---
      allTaskDataForSequence.sort((a, b) => {
        const driverCompare = a.driver.localeCompare(b.driver);
        if (driverCompare !== 0) return driverCompare;
        const timeA = a.actualArrivalTimestamp || Infinity;
        const timeB = a.actualArrivalTimestamp || Infinity;
        return timeA - timeB;
      });
      let currentDriver = null;
      let rankCounter = 1;
      for (const row of allTaskDataForSequence) {
        if (row.driver !== currentDriver) {
          currentDriver = row.driver;
          rankCounter = 1;
        }
        if (row.actualArrivalTimestamp !== null) {
          row.realSequence = rankCounter;
          rankCounter++;
        } else {
          row.realSequence = null; 
        }
      }

      // --- 5. Filter data HANYA untuk "Hasil Pending SO" ---
      // Filter berdasarkan status ATAU jika datanya dimigrasi
      const pendingSOData = allTaskDataForSequence.filter(row => 
        PENDING_SHEET_STATUSES.includes(row.statusLabel) || row.isMigrated
      );

      // 6. Sortir data yang sudah difilter
      pendingSOData.sort((a, b) => {
        const driverCompare = a.driver.localeCompare(b.driver);
        if (driverCompare !== 0) return driverCompare;
        return a.roSequence - b.roSequence;
      });
      
      // --- 7. Siapkan Data Excel ---
      const wb = XLSX.utils.book_new();
      
      // --- Sheet 1: Total Delivered (Tidak berubah) ---
      const headers1 = ["Plat", "Driver", "Total Outlet", "Total Delivery"];
      const sheetData1 = Array.from(driverStats.entries()).map(([driverEmail, stats]) => {
        const driverInfo = emailToDriverMap[driverEmail]; 
        const plat = driverInfo ? driverInfo.plat : null;
        const driverName = driverInfo ? driverInfo.name : driverEmail; 
        const totalDelivery = stats.totalOutlet - stats.failedCount;
        return [ plat, driverName, stats.totalOutlet, totalDelivery ];
      });
      sheetData1.sort((a, b) => { // Sorting custom SEWA
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
      const finalSheetData1 = [headers1, ...sheetData1];
      const wsDelivered = XLSX.utils.aoa_to_sheet(finalSheetData1);
      // (Styling Sheet 1)
      const headerStyle = { font: { bold: true }, alignment: { horizontal: "center", vertical: "center" } };
      const centerStyle = { alignment: { horizontal: "center", vertical: "center" } };
      wsDelivered['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 15 }];
      ['A1','B1','C1','D1'].forEach(cell => { if(wsDelivered[cell]) wsDelivered[cell].s = headerStyle; });
      if(wsDelivered['D1']) wsDelivered['D1'].c = [{ a: 'Info', t: 'Total Outlet - (Pending + Batal + Terima Sebagian)', h: true }];
      finalSheetData1.forEach((row, R) => {
        if (R === 0) return;
        if (wsDelivered[`A${R+1}`]) wsDelivered[`A${R+1}`].s = centerStyle;
        if (wsDelivered[`B${R+1}`]) wsDelivered[`B${R+1}`].s = { alignment: { horizontal: "left", vertical: "center" } };
        if (wsDelivered[`C${R+1}`]) wsDelivered[`C${R+1}`].s = centerStyle;
        if (wsDelivered[`D${R+1}`]) wsDelivered[`D${R+1}`].s = centerStyle;
      });
      XLSX.utils.book_append_sheet(wb, wsDelivered, "Total Delivered");

      // --- Sheet 2: Hasil Pending SO (KOLOM DINAMIS) ---
      
      // 1. Tentukan Header secara dinamis
      const headers2 = [
        "Flow", "Plat", "Driver", "Faktur Batal/ Tolakan SO", "Terkirim Sebagian", "Pending"
      ];
      if (isSpecialHub) {
        headers2.push("Pending GR");
      }
      headers2.push(
        "Reason", "", // Kolom Separator
        "Open Time", "Close Time", "ETA", "ETD", "Actual Arrival", "Actual Departure", 
        "Visit Time", "Actual Visit Time", "Customer ID", "RO Sequence", "Real Sequence", "Temperature"
      );
      
      // 2. Tentukan Data secara dinamis
      const finalSheetData2 = [headers2, ...pendingSOData.map(row => {
          const dataRow = [
            row.flow, row.plat, row.driver, row.fakturBatal, row.terkirimSebagian, row.pending
          ];
          if (isSpecialHub) {
            dataRow.push(row.pendingGR);
          }
          dataRow.push(
            row.reason,
            null, // Data separator
            row.openTime, row.closeTime, row.eta, row.etd, row.actualArrival, row.actualDeparture,
            row.visitTime, row.actualVisitTime, row.customerId, row.roSequence, 
            row.realSequence === 0 ? null : row.realSequence,
            row.temperature
          );
          return dataRow;
      })];
      
      const wsPendingSO = XLSX.utils.aoa_to_sheet(finalSheetData2);

      // --- STYLING SHEET 2 (DINAMIS) ---
      
      wsPendingSO['!view'] = { state: 'frozen', ySplit: 1 };

      // 3. Tentukan Indeks dinamis
      const pendingColIndex = 5; // Kolom "Pending" selalu di index 5
      const separatorColIndex = isSpecialHub ? 8 : 7;
      // List indeks kolom yg di-center (setelah separator)
      const centerAlignedIndices = [
        'Open Time', 'Close Time', 'ETA', 'ETD', 'Actual Arrival', 'Actual Departure', 
        'Visit Time', 'Actual Visit Time', 'Customer ID', 'RO Sequence', 'Real Sequence', 'Temperature'
      ];
      // Cari indeks aktualnya berdasarkan header
      const centerAlignedSOColumns = centerAlignedIndices.map(header => headers2.indexOf(header));

      // Style
      const separatorStyle = { fill: { patternType: "solid", fgColor: { rgb: "FA9D9D" } } };
      const redFillStyle = { fill: { patternType: "solid", fgColor: { rgb: "FF0000" } } }; // Merah #FF0000

      // 4. Auto-fit Lebar Kolom (dinamis)
      const colWidthsSO = headers2.map((header, i) => {
        if (i === separatorColIndex) return { wch: 3 }; 
        const maxLength = finalSheetData2.reduce((max, row) => {
            const cellValue = row[i];
            const cellLength = cellValue ? String(cellValue).length : 0;
            return Math.max(max, cellLength);
        }, 0);
        return { wch: Math.min(maxLength + 2, 50) }; 
      });
      wsPendingSO['!cols'] = colWidthsSO;

      const rangeSO = XLSX.utils.decode_range(wsPendingSO['!ref']);
      for (let R = rangeSO.s.r; R <= rangeSO.e.r; ++R) { 
        for (let C = rangeSO.s.c; C <= rangeSO.e.c; ++C) { 
          const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
          if (!wsPendingSO[cellRef]) {
             wsPendingSO[cellRef] = { t: 's', v: '' }; 
          }
          const cell = wsPendingSO[cellRef];

          if (R === 0) { // Baris Header
            cell.s = (C === separatorColIndex) ? { ...headerStyle, ...separatorStyle } : headerStyle;
            
            // 4. Tambah Komen jika ada migrasi
            if (migrationOccurred && C === pendingColIndex) {
              cell.c = [{ a: 'Info', t: 'Warna merah menandakan harusnya pilih "Pending" bukan "Pending GR"', h: true }];
            }
          } else { // Baris Data
            // 1. Fill color separator
            if (C === separatorColIndex) {
              cell.s = separatorStyle;
            } 
            // 3. Rata Tengah
            else if (centerAlignedSOColumns.includes(C)) {
              if (!cell.s) cell.s = {};
              cell.s.alignment = centerStyle.alignment;
              if (typeof cell.v === 'number') cell.t = 'n';
            }
            
            // 2. Fill color merah untuk data migrasi
            // Ambil data asli (index R-1 karena R=1 adalah baris data pertama)
            const rowData = pendingSOData[R - 1]; 
            if (rowData && rowData.isMigrated && C === pendingColIndex) {
              if (!cell.s) cell.s = {};
              cell.s.fill = redFillStyle.fill;
            }
          }
        }
      }
      // --- SELESAI STYLING SHEET 2 ---

      XLSX.utils.book_append_sheet(wb, wsPendingSO, "Hasil Pending SO");

      // Sheet 3 & 4 (Placeholder)
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[]]), "Hasil RO vs Real");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[]]), "Update Longlat");

      // --- 8. Download File ---
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