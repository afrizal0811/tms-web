// File: src/features/reportData/DeliverySummary.js
'use client';

import { toastSuccess } from '@/lib/toastHelper';
import {
  calculateHaversineDistance,
  calculateMinuteDifference,
  calculateTargetDates,
  extractCustomerId,
  extractLocationId,
  extractTempFromDriverName,
  formatCoordinates,
  formatSimpleTime,
  formatTimestampToHHMM,
  formatYYYYMMDDToDDMMYYYY,
  getUTC7DateString,
  normalizeEmail,
} from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import { getResultsSummary, getTasks } from '../../lib/apiService';
import { toastError } from '../../lib/toastHelper';

const FAILED_STATUSES = ['PENDING', 'BATAL', 'TERIMA SEBAGIAN'];
const PENDING_SHEET_STATUSES_BASE = ['PENDING', 'BATAL', 'TERIMA SEBAGIAN'];

export default function DeliverySummary({
  driverData,
  isInputInvalid,
  isLoading,
  onLoadingChange,
  selectedDate,
  selectedLocation,
  selectedLocationName,
}) {
  const handleDeliverySummary = async () => {
    if (onLoadingChange) onLoadingChange(true);
    try {
      // --- 1. Persiapan Parameter & Cek Hub Spesial ---
      if (!selectedLocation || !Array.isArray(driverData)) {
        throw new Error('Data Hub atau Driver tidak valid.');
      }
      const specialHubs = ['6895a281bc530d4a4908f5ef', '68b8038b1aa98343380e3ab2'];
      const isSpecialHub = specialHubs.includes(selectedLocation);
      let migrationOccurred = false;
      const PENDING_SHEET_STATUSES = [...PENDING_SHEET_STATUSES_BASE];
      if (isSpecialHub) PENDING_SHEET_STATUSES.push('PENDING GR');

      if (selectedDate === '') throw new Error('Tanggal belum dipilih.');

      const timeFrom = `${selectedDate} 00:00:00`;
      const timeTo = `${selectedDate} 23:59:59`;

      // Buat Peta Lookup Driver (Email -> Info)
      const emailToDriverMap = driverData.reduce((acc, driver) => {
        const normalizedEmail = normalizeEmail(driver.email);
        if (normalizedEmail) {
          acc[normalizedEmail] = { plat: driver.plat || null, name: driver.name };
        }
        return acc;
      }, {});

      const tasksPromise = getTasks({
        hubId: selectedLocation,
        status: 'DONE',
        timeFrom: timeFrom,
        timeTo: timeTo,
        timeBy: 'doneTime',
        limit: 1000,
      });

      const { dateFrom, dateTo: resultsDateTo } = calculateTargetDates(selectedDate);
      const resultsPromise = getResultsSummary({
        dateFrom: dateFrom,
        dateTo: resultsDateTo,
        limit: 500,
        hubId: selectedLocation,
      });

      // Panggil promise
      const [allTasks, resultsData] = await Promise.all([tasksPromise, resultsPromise]);

      // --- 3. Proses Response /tasks ---
      if (allTasks.length === 0) {
        toastError('Tidak ada data yang ditemukan untuk tanggal ini.');
        if (onLoadingChange) onLoadingChange(false);
        return;
      }

      // --- 4. Proses Response /results (Hanya untuk Map Waktu HUB) ---
      const hubTimesMap = new Map();
      if (resultsData) {
        const filteredResults = resultsData.filter((item) => item.dispatchStatus === 'done');
        for (const result of filteredResults) {
          if (result.result && Array.isArray(result.result.routing)) {
            for (const route of result.result.routing) {
              const driverEmail = normalizeEmail(route.assignee);
              const driverInfo = driverEmail ? emailToDriverMap[driverEmail] : null;
              const driverName = driverInfo ? driverInfo.name : driverEmail || 'N/A';
              if (!driverName || !Array.isArray(route.trips) || route.trips.length === 0) continue;

              const hubTrips = route.trips.filter((trip) => trip.isHub === true);
              if (hubTrips.length > 0) {
                const hubETD = hubTrips[0].etd;
                const hubETA = hubTrips[hubTrips.length - 1].eta;
                hubTimesMap.set(driverName, {
                  hubETD: formatSimpleTime(hubETD),
                  hubETA: formatSimpleTime(hubETA),
                });
              }
            }
          }
        }
      } else {
        toastError('Gagal mengambil data');
      }

      // --- 5. Proses Data Utama (Gabungan) ---
      const driverStats = new Map();
      let allTaskDataForSequence = [];
      let updateLonglatData = [];

      for (const task of allTasks) {
        const emailString =
          Array.isArray(task.assignee) && task.assignee.length > 0 ? task.assignee[0] : null;
        const driverEmail = normalizeEmail(emailString);
        const driverInfo = driverEmail ? emailToDriverMap[driverEmail] : null;
        const driverName = driverInfo ? driverInfo.name : driverEmail || 'N/A';
        const statusLabel =
          task.label && task.label.length > 0 ? task.label[0].toUpperCase() : null;
        const customerName = task.customerName || '';
        const flow = task.flow;

        // --- Proses untuk Sheet 1 (Total Delivered) ---
        if (driverName !== 'N/A') {
          const stats = driverStats.get(driverName) || {
            totalOutlet: 0,
            failedCount: 0,
            plat: null,
            driverEmail: driverEmail,
            mismatchCustomers: [],
            missingDataCustomers: [],
          };

          stats.totalOutlet += 1;
          if (FAILED_STATUSES.includes(statusLabel)) stats.failedCount += 1;
          if (!stats.plat && driverInfo && driverInfo.plat) {
            stats.plat = driverInfo.plat;
          }

          // Cek Beda Hari
          const startDate = getUTC7DateString(task.startTime);
          const doneDate = getUTC7DateString(task.doneTime);
          if (startDate && doneDate && startDate !== doneDate) {
            stats.mismatchCustomers.push({
              name: customerName,
              date: startDate,
            });
          }

          // Cek Data Hilang
          if (!task.eta || !task.etd || !task.routePlannedOrder) {
            stats.missingDataCustomers.push({
              name: customerName,
            });
          }

          driverStats.set(driverName, stats);
        }

        let actualArrival, actualDeparture;
        if (flow && flow.toUpperCase().includes('GR')) {
          actualArrival = task.page1DoneTime;
          actualDeparture = task.page1DoneTime;
        } else {
          actualArrival = task.klikJikaSudahSampai;
          actualDeparture = task.page3DoneTime;
        }

        let fakturBatal = null,
          terkirimSebagian = null,
          pending = null,
          pendingGR = null;
        let isMigrated = false;
        if (statusLabel === 'BATAL') fakturBatal = customerName;
        else if (statusLabel === 'TERIMA SEBAGIAN') terkirimSebagian = customerName;
        else if (statusLabel === 'PENDING') pending = customerName;
        else if (statusLabel === 'PENDING GR') {
          if (isSpecialHub) pendingGR = customerName;
          else {
            pending = customerName;
            isMigrated = true;
            migrationOccurred = true;
          }
        }

        allTaskDataForSequence.push({
          driverEmail: driverEmail,
          driver: driverName,
          plat: driverInfo ? driverInfo.plat : null,
          actualArrivalTimestamp: actualArrival ? new Date(actualArrival).getTime() : null,
          roSequence: task.routePlannedOrder || 0,
          statusLabel: statusLabel,
          isMigrated: isMigrated,
          flow: flow,
          customerName: customerName,
          fakturBatal: fakturBatal,
          terkirimSebagian: terkirimSebagian,
          pending: pending,
          pendingGR: pendingGR,
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
          realSequence: 0,
        });

        if (task.klikLokasiClient) {
          updateLonglatData.push({
            customerName: customerName,
            customerId: extractCustomerId(customerName),
            locationId: extractLocationId(customerName),
            newLonglat: formatCoordinates(task.klikLokasiClient),
            bedaJarak: calculateHaversineDistance(task.longlat, task.klikLokasiClient),
          });
        }
      }

      // --- 6. Hitung Real Sequence ---
      allTaskDataForSequence.sort((a, b) => {
        const driverCompare = a.driver.localeCompare(b.driver);
        if (driverCompare !== 0) return driverCompare;
        const timeA = a.actualArrivalTimestamp || Infinity;
        const timeB = b.actualArrivalTimestamp || Infinity;
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
      const getSortGroup = (platStr) => {
        if (!platStr) return 1;
        const platUpper = platStr.toUpperCase();
        if (platUpper.includes('DM')) return 3;
        if (platUpper.includes('SEWA')) return 2;
        return 1;
      };

      // --- 7. Filter & Sortir data "Hasil Pending SO" ---
      const pendingSOData = allTaskDataForSequence.filter(
        (row) => PENDING_SHEET_STATUSES.includes(row.statusLabel) || row.isMigrated
      );

      pendingSOData.sort((a, b) => {
        const platA = a.plat || '';
        const platB = a.plat || '';
        const groupA = getSortGroup(platA);
        const groupB = getSortGroup(platB);
        if (groupA !== groupB) return groupA - groupB;
        const driverCompare = (a.driver || '').localeCompare(b.driver || '');
        if (driverCompare !== 0) return driverCompare;
        return (a.roSequence || 0) - (b.roSequence || 0);
      });

      // --- 8. Siapkan Data Excel ---
      const wb = XLSX.utils.book_new();
      const headerStyle = {
        font: { bold: true },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
      const centerStyle = { alignment: { horizontal: 'center', vertical: 'center' } };
      const wrapTextStyle = {
        alignment: { wrapText: true, vertical: 'center', horizontal: 'left' },
      };
      const redTextStyle = { font: { color: { rgb: 'FF0000' } } };

      // --- (PERUBAHAN 1): Definisikan style warna baru ---
      const blueFillStyle = { fill: { patternType: 'solid', fgColor: { rgb: 'BDE5F8' } } }; // Biru
      const yellowFillStyle = { fill: { patternType: 'solid', fgColor: { rgb: 'ffe19c' } } }; // Kuning
      const greenFillStyle = { fill: { patternType: 'solid', fgColor: { rgb: 'C6EFCE' } } }; // Hijau
      // --- (SELESAI PERUBAHAN 1) ---

      const greenHeaderStyle = {
        font: { bold: true },
        alignment: { horizontal: 'center', vertical: 'center' },
        fill: { patternType: 'solid', fgColor: { rgb: '84fa92' } },
      };

      // --- Sheet 1: Routing Date ---
      // (Tidak ada perubahan)
      const routingDate = formatYYYYMMDDToDDMMYYYY(dateFrom);
      const wsRoutingDate = XLSX.utils.aoa_to_sheet([
        ['ROUTING DATE'],
        [routingDate, null, null, null, null, null, null],
      ]);
      wsRoutingDate['A1'].s = {
        font: { bold: true, sz: 24, color: { rgb: 'FF0000' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
      wsRoutingDate['A2'].s = {
        font: { bold: true, sz: 60 },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
      wsRoutingDate['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
      ];
      wsRoutingDate['!cols'] = Array(7).fill({ wch: 15 });
      XLSX.utils.book_append_sheet(wb, wsRoutingDate, 'Routing Date');

      // --- Sheet 2: Total Delivered (DENGAN PERUBAHAN) ---

      // (PERUBAHAN 2: Ubah nama header)
      const headers1 = [
        'Plat',
        'Driver',
        'Total Outlet',
        'Total Delivery',
        'Info Manual Assign',
        'Info Beda Hari',
      ];

      const validDriverData = driverData.filter((driver) => {
        const plat = driver.plat || '';
        if (plat === '') return false;
        if (plat.toUpperCase().includes('DEMO')) return false;
        return true;
      });

      let sheetData1Objects = validDriverData.map((driver) => {
        const driverName = driver.name;
        const driverPlat = driver.plat;
        const driverEmail = normalizeEmail(driver.email);
        const stats = driverStats.get(driverName);

        if (stats) {
          const totalDelivery = stats.totalOutlet - stats.failedCount;

          const mismatchText = stats.mismatchCustomers
            .map((task) => {
              let formattedDate = task.date;
              if (task.date) {
                const [y, m, d] = task.date.split('-');
                if (y && m && d) formattedDate = `${d}-${m}-${y}`;
              }
              return `• ${task.name} (${formattedDate})`;
            })
            .join('\n');

          const missingDataText = stats.missingDataCustomers
            .map((task) => `• ${task.name}`)
            .join('\n');

          // --- (PERUBAHAN 3): Ubah flag boolean menjadi string 'highlightType' ---
          const hasManualError = stats.missingDataCustomers.length > 0;
          const hasBedaHariError = stats.mismatchCustomers.length > 0;
          let highlightType = 'none';

          if (hasManualError && hasBedaHariError) {
            highlightType = 'green'; // Manual + Beda Hari
          } else if (hasManualError) {
            highlightType = 'blue'; // Hanya Manual
          } else if (hasBedaHariError) {
            highlightType = 'yellow'; // Hanya Beda Hari
          }
          // --- (SELESAI PERUBAHAN 3) ---

          return {
            plat: stats.plat || driverPlat,
            driver: driverName,
            totalOutlet: stats.totalOutlet,
            totalDelivery: totalDelivery,
            driverEmail: stats.driverEmail,
            highlightType: highlightType, // <-- Simpan flag baru
            mismatchText: mismatchText,
            missingDataText: missingDataText,
          };
        } else {
          return {
            plat: driverPlat,
            driver: driverName,
            totalOutlet: null,
            totalDelivery: null,
            driverEmail: driverEmail,
            highlightType: 'none',
            mismatchText: '',
            missingDataText: '',
          };
        }
      });

      sheetData1Objects.sort((a, b) => {
        const groupA = getSortGroup(a.plat);
        const groupB = getSortGroup(b.plat);
        if (groupA !== groupB) {
          return groupA - groupB;
        }
        return (a.driver || '').localeCompare(b.driver || '');
      });

      const finalSheetData1 = [
        headers1,
        ...sheetData1Objects.map((row) => [
          row.plat,
          row.driver,
          row.totalOutlet,
          row.totalDelivery,
          row.missingDataText,
          row.mismatchText,
        ]),
      ];

      const wsDelivered = XLSX.utils.aoa_to_sheet(finalSheetData1);

      wsDelivered['!cols'] = [
        { wch: 15 },
        { wch: 30 },
        { wch: 15 },
        { wch: 15 },
        { wch: 50 },
        { wch: 50 },
      ];

      ['A1', 'B1', 'C1', 'D1', 'E1', 'F1'].forEach((cell) => {
        if (wsDelivered[cell]) wsDelivered[cell].s = headerStyle;
      });

      // (Komen di header D1 dihapus)

      // --- (PERUBAHAN 4): Loop Styling ---
      finalSheetData1.forEach((row, R) => {
        if (R === 0) return;

        const rowData = sheetData1Objects[R - 1];
        const cellRefC = `C${R + 1}`; // Kolom Total Outlet
        const cellRefD = `D${R + 1}`; // Kolom Total Delivery

        // Terapkan style default (termasuk wrap text)
        ['A', 'B', 'C', 'D', 'E', 'F'].forEach((col, C) => {
          const cellRef = `${col}${R + 1}`;
          if (wsDelivered[cellRef]) {
            if (col === 'A' || col === 'C' || col === 'D') {
              wsDelivered[cellRef].s = centerStyle; // Plat, Total, Total
            } else if (col === 'B') {
              wsDelivered[cellRef].s = { alignment: { horizontal: 'left', vertical: 'center' } }; // Driver
            } else if (col === 'E' || col === 'F') {
              wsDelivered[cellRef].s = wrapTextStyle; // Info
            }
          }
        });

        // Terapkan highlight (kuning dulu)
        if (rowData.highlightType === 'green') {
          const style = { ...centerStyle, fill: greenFillStyle.fill };
          if (wsDelivered[cellRefC]) wsDelivered[cellRefC].s = style;
          if (wsDelivered[cellRefD]) wsDelivered[cellRefD].s = style;
        } else if (rowData.highlightType === 'blue') {
          const style = { ...centerStyle, fill: blueFillStyle.fill };
          if (wsDelivered[cellRefC]) wsDelivered[cellRefC].s = style;
          if (wsDelivered[cellRefD]) wsDelivered[cellRefD].s = style;
        } else if (rowData.highlightType === 'yellow') {
          const style = { ...centerStyle, fill: yellowFillStyle.fill };
          if (wsDelivered[cellRefC]) wsDelivered[cellRefC].s = style;
          if (wsDelivered[cellRefD]) wsDelivered[cellRefD].s = style;
        }
      });
      // --- (SELESAI PERUBAHAN 4) ---

      XLSX.utils.book_append_sheet(wb, wsDelivered, 'Total Delivered');

      // --- Sheet 3: Hasil Pending SO ---
      // (Tidak ada perubahan di sheet ini)
      const headers2 = [
        'Flow',
        'Date RO',
        'Plat',
        'Driver',
        'Faktur Batal/ Tolakan SO',
        'Terkirim Sebagian',
        'Pending',
      ];
      if (isSpecialHub) headers2.push('Pending GR');
      headers2.push(
        'Reason',
        '',
        'Open Time',
        'Close Time',
        'ETA',
        'ETD',
        'Actual Arrival',
        'Actual Departure',
        'Visit Time',
        'Actual Visit Time',
        'Customer ID',
        'RO Sequence',
        'Real Sequence',
        'Temperature'
      );
      const finalSheetData2 = [
        headers2,
        ...pendingSOData.map((row) => {
          const dataRow = [
            row.flow,
            routingDate.replace(/\./g, '/'),
            row.plat,
            row.driver,
            row.fakturBatal,
            row.terkirimSebagian,
            row.pending,
          ];
          if (isSpecialHub) dataRow.push(row.pendingGR);
          dataRow.push(
            row.reason,
            null,
            row.openTime,
            row.closeTime,
            row.eta || '-',
            row.etd || '-',
            row.actualArrival,
            row.actualDeparture,
            row.visitTime,
            row.actualVisitTime,
            row.customerId,
            row.roSequence,
            row.realSequence === 0 ? null : row.realSequence,
            row.temperature
          );
          return dataRow;
        }),
      ];
      const wsPendingSO = XLSX.utils.aoa_to_sheet(finalSheetData2);
      wsPendingSO['!view'] = { state: 'frozen', ySplit: 1 };
      const separatorColIndex = isSpecialHub ? 9 : 8;
      const centerAlignedIndices = [
        'Open Time',
        'Close Time',
        'ETA',
        'ETD',
        'Actual Arrival',
        'Actual Departure',
        'Visit Time',
        'Actual Visit Time',
        'Customer ID',
        'RO Sequence',
        'Real Sequence',
        'Temperature',
      ];
      const centerAlignedSOColumns = centerAlignedIndices.map((header) => headers2.indexOf(header));
      const colWidthsSO = headers2.map((header, i) => {
        if (i === separatorColIndex) return { wch: 3 };
        const maxLength = finalSheetData2.reduce(
          (max, row) => Math.max(max, row[i] ? String(row[i]).length : 0),
          0
        );
        return { wch: Math.min(maxLength + 2, 50) };
      });
      wsPendingSO['!cols'] = colWidthsSO;
      const separatorStyle = { fill: { patternType: 'solid', fgColor: { rgb: 'FA9D9D' } } };
      const pendingColIndex = 5;
      const rangeSO = XLSX.utils.decode_range(wsPendingSO['!ref']);
      const flowColIndex = 0;
      for (let R = rangeSO.s.r; R <= rangeSO.e.r; ++R) {
        for (let C = rangeSO.s.c; C <= rangeSO.e.c; ++C) {
          const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
          if (!wsPendingSO[cellRef]) wsPendingSO[cellRef] = { t: 's', v: '' };
          const cell = wsPendingSO[cellRef];
          if (R === 0) {
            if (C === separatorColIndex) {
              cell.s = { ...headerStyle, ...separatorStyle };
            } else if (C === flowColIndex) {
              cell.s = headerStyle;
            } else {
              cell.s = greenHeaderStyle;
            }
            if (migrationOccurred && C === pendingColIndex) {
              cell.c = [
                {
                  a: 'Info',
                  t: 'Warna merah menandakan harusnya pilih "Pending" bukan "Pending GR"',
                  h: true,
                },
              ];
            }
          } else {
            if (C === separatorColIndex) {
              cell.s = separatorStyle;
            } else if (centerAlignedSOColumns.includes(C)) {
              if (!cell.s) cell.s = {};
              cell.s.alignment = centerStyle.alignment;
              if (typeof cell.v === 'number') cell.t = 'n';
            }
            const rowData = pendingSOData[R - 1];
            if (rowData && rowData.isMigrated && C === pendingColIndex) {
              if (!cell.s) cell.s = {};
              cell.s.fill = { fill: { patternType: 'solid', fgColor: { rgb: 'FF0000' } } };
            }
          }
        }
      }
      XLSX.utils.book_append_sheet(wb, wsPendingSO, 'Hasil Pending SO');

      // --- Sheet 5: Update Longlat ---
      // (Tidak ada perubahan di sheet ini)
      const headers4 = [
        'Customer Name',
        'Customer ID',
        'Location ID',
        'New Longlat',
        'Beda Jarak (m)',
      ];
      updateLonglatData.sort((a, b) => {
        const distA = a.bedaJarak !== null ? a.bedaJarak : Infinity;
        const distB = b.bedaJarak !== null ? b.bedaJarak : Infinity;
        return distA - distB;
      });
      const finalSheetData4 = [
        headers4,
        ...updateLonglatData.map((row) => [
          row.customerName,
          row.customerId,
          row.locationId,
          row.newLonglat,
          row.bedaJarak,
        ]),
      ];
      const wsUpdateLonglat = XLSX.utils.aoa_to_sheet(finalSheetData4);
      wsUpdateLonglat['!view'] = { state: 'frozen', ySplit: 1 };
      const colWidths4 = headers4.map((header, i) => {
        const maxLength = finalSheetData4.reduce(
          (max, row) => Math.max(max, row[i] ? String(row[i]).length : 0),
          0
        );
        return { wch: Math.min(maxLength + 2, 50) };
      });
      wsUpdateLonglat['!cols'] = colWidths4;
      const centerAlignedLonglat = [1, 2, 3, 4];
      const range4 = XLSX.utils.decode_range(wsUpdateLonglat['!ref']);
      for (let R = range4.s.r; R <= range4.e.r; ++R) {
        for (let C = range4.s.c; C <= range4.e.c; ++C) {
          const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
          if (!wsUpdateLonglat[cellRef]) continue;
          if (R === 0) {
            wsUpdateLonglat[cellRef].s = headerStyle;
            if (C === 4) {
              wsUpdateLonglat[cellRef].c = [{ a: 'Info', t: 'Jarak secara garis lurus', h: true }];
            }
          } else if (centerAlignedLonglat.includes(C)) {
            wsUpdateLonglat[cellRef].s = centerStyle;
            if (typeof wsUpdateLonglat[cellRef].v === 'number') {
              wsUpdateLonglat[cellRef].t = 'n';
            }
          }
        }
      }
      XLSX.utils.book_append_sheet(wb, wsUpdateLonglat, 'Update Longlat');

      // --- Sheet 4: Hasil RO vs Real ---
      // (Tidak ada perubahan di sheet ini)
      const headers3 = [
        'Flow',
        'Plat',
        'Driver',
        'Customer',
        'Status Delivery',
        'Open Time',
        'Close Time',
        'ETA',
        'Actual Arrival',
        'ETD',
        'Actual Departure',
        'Visit Time',
        'Actual Visit Time',
        'RO Sequence',
        'Real Sequence',
        'Is Same Sequence',
      ];
      let finalSheetData3 = [headers3];
      const tasksByNameMap = new Map();
      for (const task of allTaskDataForSequence) {
        if (!tasksByNameMap.has(task.driver)) {
          tasksByNameMap.set(task.driver, []);
        }
        tasksByNameMap.get(task.driver).push(task);
      }
      let roVsRealDriverList = Array.from(driverStats.entries()).map(([driverName, stats]) => {
        return {
          plat: stats.plat,
          driver: driverName,
          driverEmail: stats.driverEmail,
        };
      });
      roVsRealDriverList.sort((a, b) => {
        const groupA = getSortGroup(a.plat);
        const groupB = getSortGroup(b.plat);
        if (groupA !== groupB) {
          return groupA - groupB;
        }
        return (a.driver || '').localeCompare(b.driver || '');
      });
      for (const driverRow of roVsRealDriverList) {
        const driverName = driverRow.driver;
        const driverPlat = driverRow.plat;
        const tasks = tasksByNameMap.get(driverName) || [];
        const hubTimes = hubTimesMap.get(driverName) || { hubETD: null, hubETA: null };
        finalSheetData3.push([
          null,
          null,
          null,
          'HUB',
          null,
          null,
          null,
          null,
          null,
          hubTimes.hubETD,
          null,
          null,
          null,
          null,
          null,
          null,
        ]);
        tasks.sort((a, b) => a.roSequence - b.roSequence);
        for (const task of tasks) {
          const ro = task.roSequence;
          const real = task.realSequence;
          const isSame = ro == real ? 'SAMA' : 'TIDAK SAMA';
          finalSheetData3.push([
            task.flow,
            task.plat,
            task.driver,
            task.customerName,
            task.statusLabel,
            task.openTime,
            task.closeTime,
            task.eta,
            task.actualArrival,
            task.etd,
            task.actualDeparture,
            task.visitTime,
            task.actualVisitTime,
            ro,
            real,
            isSame,
          ]);
        }
        finalSheetData3.push([
          null,
          null,
          null,
          'HUB',
          null,
          null,
          null,
          hubTimes.hubETA,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
        ]);
        finalSheetData3.push(Array(headers3.length).fill(null));
      }
      const wsRoVsReal = XLSX.utils.aoa_to_sheet(finalSheetData3);
      wsRoVsReal['!view'] = { state: 'frozen', ySplit: 1 };
      const colWidths3 = headers3.map((header, i) => {
        const maxLength = finalSheetData3.reduce(
          (max, row) => Math.max(max, row[i] ? String(row[i]).length : 0),
          0
        );
        return { wch: Math.min(maxLength + 2, 50) };
      });
      wsRoVsReal['!cols'] = colWidths3;
      const centerAlignedROColumns = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const range3 = XLSX.utils.decode_range(wsRoVsReal['!ref']);
      const etaColIndex = 7;
      const etdColIndex = 9;
      const platColIndex = 1;
      const driverColIndex = 2;
      const roColIndex = 13;
      for (let R = range3.s.r; R <= range3.e.r; ++R) {
        const customerCellRef = XLSX.utils.encode_cell({ r: R, c: 3 });
        const isHubRow = wsRoVsReal[customerCellRef] && wsRoVsReal[customerCellRef].v === 'HUB';
        let isMissingRequiredData = false;
        if (R > 0 && !isHubRow) {
          const platValue = wsRoVsReal[XLSX.utils.encode_cell({ r: R, c: platColIndex })]?.v;
          const driverValue = wsRoVsReal[XLSX.utils.encode_cell({ r: R, c: driverColIndex })]?.v;
          if (platValue && driverValue) {
            const etaValue = wsRoVsReal[XLSX.utils.encode_cell({ r: R, c: etaColIndex })]?.v;
            const etdValue = wsRoVsReal[XLSX.utils.encode_cell({ r: R, c: etdColIndex })]?.v;
            const roValue = wsRoVsReal[XLSX.utils.encode_cell({ r: R, c: roColIndex })]?.v;
            if (!etaValue || !etdValue || !roValue) {
              isMissingRequiredData = true;
            }
          }
        }
        for (let C = range3.s.c; C <= range3.e.c; ++C) {
          const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
          if (!wsRoVsReal[cellRef]) wsRoVsReal[cellRef] = { t: 's', v: '' };
          const cell = wsRoVsReal[cellRef];
          if (R === 0) {
            cell.s = headerStyle;
          } else if (isHubRow) {
            cell.s = redTextStyle;
            if (C === 3) {
              cell.s = {
                ...redTextStyle,
                ...centerStyle,
                font: { ...redTextStyle.font, bold: true },
              };
            } else if ([7, 9].includes(C)) {
              cell.s = { ...redTextStyle, ...centerStyle };
            }
          } else {
            if (centerAlignedROColumns.includes(C)) {
              if (!cell.s) cell.s = {};
              cell.s.alignment = centerStyle.alignment;
              if (typeof cell.v === 'number') cell.t = 'n';
            }
            if (isMissingRequiredData) {
              if (!cell.s) cell.s = {};
              cell.s.fill = { fill: { patternType: 'solid', fgColor: { rgb: 'FFC7CE' } } };
            }
          }
        }
      }
      XLSX.utils.book_append_sheet(wb, wsRoVsReal, 'Hasil RO vs Real');

      // --- 9. Download File ---
      const excelFileName = `Delivery Summary - ${formatYYYYMMDDToDDMMYYYY(selectedDate)} - ${selectedLocationName}.xlsx`;
      XLSX.writeFile(wb, excelFileName);
      toastSuccess('File Delivery Summary berhasil di-download!');
    } catch (err) {
      toastError(err.message);
    } finally {
      if (onLoadingChange) onLoadingChange(false);
    }
  };

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
