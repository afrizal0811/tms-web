'use client';

// (PERHATIKAN PATH: Sesuaikan path ke 'constants' dan 'utils' jika perlu)
import {
  calculateHaversineDistance,
  calculateMinuteDifference,
  extractTempFromDriverName,
  formatCoordinates,
  formatSimpleTime,
  formatTimestampToHHMM,
  formatYYYYMMDDToDDMMYYYY,
  getUTC7DateString,
  normalizeEmail,
  parseCustomerString,
} from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
// Definisikan konstanta yang dibutuhkan

const FAILED_STATUSES = ['PENDING', 'BATAL', 'TERIMA SEBAGIAN'];
const PENDING_SHEET_STATUSES_BASE = ['PENDING', 'BATAL', 'TERIMA SEBAGIAN'];

export function generateDeliveryWorkbook(
  driverData,
  allTasks,
  resultsData,
  selectedDate, // Tanggal Asli (pilihan user, misal "2025-11-11")
  apiDate,
  selectedLocation,
  selectedLocationName,
  t
) {
  // --- (SEMUA LOGIC DARI DeliverySummary.js 'handleDeliverySummary' DIPINDAH KE SINI) ---
  const translate = t || ((key) => key);
  // 1. Cek Hub Spesial
  const specialHubs = ['6895a281bc530d4a4908f5ef', '68b8038b1aa98343380e3ab2'];
  const isSpecialHub = specialHubs.includes(selectedLocation);
  let migrationOccurred = false;
  const PENDING_SHEET_STATUSES = [...PENDING_SHEET_STATUSES_BASE];
  if (isSpecialHub) PENDING_SHEET_STATUSES.push('PENDING GR');

  // 2. Buat Peta Lookup Driver
  const emailToDriverMap = driverData.reduce((acc, driver) => {
    const normalizedEmail = normalizeEmail(driver.email);
    if (normalizedEmail) {
      acc[normalizedEmail] = { plat: driver.plat || null, name: driver.name };
    }
    return acc;
  }, {});

  // 3. Buat Map Waktu HUB (dari resultsData)
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
  }

  // 4. Proses Data Utama (Gabungan)
  const driverStats = new Map();
  let allTaskDataForSequence = [];
  let updateLonglatData = [];

  for (const task of allTasks) {
    const emailString =
      Array.isArray(task.assignee) && task.assignee.length > 0 ? task.assignee[0] : null;
    const driverEmail = normalizeEmail(emailString);
    const driverInfo = driverEmail ? emailToDriverMap[driverEmail] : null;
    const driverName = driverInfo ? driverInfo.name : driverEmail || 'N/A';
    const statusLabel = task.label && task.label.length > 0 ? task.label[0].toUpperCase() : null;
    const customerName = task.customerName || '';
    const flow = task.flow;

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
      const startDate = getUTC7DateString(task.startTime);
      const doneDate = getUTC7DateString(task.doneTime);
      if (startDate && doneDate && startDate !== doneDate) {
        stats.mismatchCustomers.push({
          name: customerName,
          date: startDate,
        });
      }
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
    const { id: custId, location: locId } = parseCustomerString(customerName);
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
      customerId: custId,
      temperature: extractTempFromDriverName(driverName),
      realSequence: 0,
    });
    if (task.klikLokasiClient) {
      updateLonglatData.push({
        customerName: customerName,
        customerId: custId,
        locationId: locId,
        newLonglat: formatCoordinates(task.klikLokasiClient),
        bedaJarak: calculateHaversineDistance(task.longlat, task.klikLokasiClient),
      });
    }
  }

  // 5. Hitung Real Sequence
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

  // 6. Filter & Sortir data "Hasil Pending SO"
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

  // 7. Siapkan Data Excel
  const wb = XLSX.utils.book_new();
  const headerStyle = {
    font: { bold: true },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
  const centerStyle = { alignment: { horizontal: 'center', vertical: 'center' } };
  const wrapTextStyle = { alignment: { wrapText: true, vertical: 'center', horizontal: 'left' } };
  const redTextStyle = { font: { color: { rgb: 'FF0000' } } };
  const blueFillStyle = { fill: { patternType: 'solid', fgColor: { rgb: 'BDE5F8' } } };
  const yellowFillStyle = { fill: { patternType: 'solid', fgColor: { rgb: 'ffe19c' } } };
  const greenFillStyle = { fill: { patternType: 'solid', fgColor: { rgb: 'C6EFCE' } } };
  const greenHeaderStyle = {
    ...centerStyle,
    font: { bold: true },
    fill: { patternType: 'solid', fgColor: { rgb: '84fa92' } },
  };

  // --- Sheet 1: Routing Date ---
  // Gunakan 'selectedDate' (tanggal asli pilihan user)
  const routingDate = formatYYYYMMDDToDDMMYYYY(apiDate);
  const wsRoutingDate = XLSX.utils.aoa_to_sheet([
    [translate('excel.delivery.headers.routing_date_title')],
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

  // --- Sheet 2: Total Delivered ---
  const headers1 = [
    translate('excel.delivery.headers.plate'),
    translate('excel.delivery.headers.driver'),
    translate('excel.delivery.headers.total_outlet'),
    translate('excel.delivery.headers.total_delivery'),
    translate('excel.delivery.headers.info_manual'),
    translate('excel.delivery.headers.info_diff_day'),
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
      const missingDataText = stats.missingDataCustomers.map((task) => `• ${task.name}`).join('\n');
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
      return {
        plat: stats.plat || driverPlat,
        driver: driverName,
        totalOutlet: stats.totalOutlet,
        totalDelivery: totalDelivery,
        driverEmail: stats.driverEmail,
        highlightType: highlightType,
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
  finalSheetData1.forEach((row, R) => {
    if (R === 0) return;
    const rowData = sheetData1Objects[R - 1];
    const cellRefC = `C${R + 1}`;
    const cellRefD = `D${R + 1}`;
    ['A', 'B', 'C', 'D', 'E', 'F'].forEach((col, C) => {
      const cellRef = `${col}${R + 1}`;
      if (wsDelivered[cellRef]) {
        if (col === 'A' || col === 'C' || col === 'D') {
          wsDelivered[cellRef].s = centerStyle;
        } else if (col === 'B') {
          wsDelivered[cellRef].s = { alignment: { horizontal: 'left', vertical: 'center' } };
        } else if (col === 'E' || col === 'F') {
          wsDelivered[cellRef].s = wrapTextStyle;
        }
      }
    });
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
  XLSX.utils.book_append_sheet(wb, wsDelivered, translate('excel.delivery.sheets.total_delivered'));

  // --- Sheet 3: Hasil Pending SO ---
  const headers2 = [
    translate('excel.delivery.headers.flow'),
    translate('excel.delivery.headers.date'),
    translate('excel.delivery.headers.plate'),
    translate('excel.delivery.headers.driver'),
    translate('excel.delivery.headers.faktur_batal'),
    translate('excel.delivery.headers.partial'),
    translate('excel.delivery.headers.pending'),
  ];
  if (isSpecialHub) headers2.push(translate('excel.delivery.headers.pending_gr'));
  headers2.push(
    translate('excel.delivery.headers.reason'),
    '',
    translate('excel.delivery.headers.open_time'),
    translate('excel.delivery.headers.close_time'),
    translate('excel.delivery.headers.eta'),
    translate('excel.delivery.headers.etd'),
    translate('excel.delivery.headers.act_arr'),
    translate('excel.delivery.headers.act_dep'),
    translate('excel.delivery.headers.visit_time'),
    translate('excel.delivery.headers.act_visit_time'),
    translate('excel.delivery.headers.cust_id'),
    translate('excel.delivery.headers.ro_seq'),
    translate('excel.delivery.headers.real_seq'),
    translate('excel.delivery.headers.temp')
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
    translate('excel.delivery.headers.open_time'),
    translate('excel.delivery.headers.close_time'),
    translate('excel.delivery.headers.eta'),
    translate('excel.delivery.headers.etd'),
    translate('excel.delivery.headers.act_arr'),
    translate('excel.delivery.headers.act_dep'),
    translate('excel.delivery.headers.visit_time'),
    translate('excel.delivery.headers.act_visit_time'),
    translate('excel.delivery.headers.cust_id'),
    translate('excel.delivery.headers.ro_seq'),
    translate('excel.delivery.headers.real_seq'),
    translate('excel.delivery.headers.temp'),
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
  XLSX.utils.book_append_sheet(wb, wsPendingSO, translate('excel.delivery.sheets.pending_so'));

  // --- Sheet 5: Update Longlat ---
  const headers4 = [
    translate('excel.delivery.headers.cust_name'),
    translate('excel.delivery.headers.cust_id'),
    translate('excel.delivery.headers.loc_id'),
    translate('excel.delivery.headers.new_longlat'),
    translate('excel.delivery.headers.dist_diff'),
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
          wsUpdateLonglat[cellRef].c = [
            { a: 'Info', t: translate('excel.delivery.data.longlat_info'), h: true },
          ];
        }
      } else if (centerAlignedLonglat.includes(C)) {
        wsUpdateLonglat[cellRef].s = centerStyle;
        if (typeof wsUpdateLonglat[cellRef].v === 'number') {
          wsUpdateLonglat[cellRef].t = 'n';
        }
      }
    }
  }
  XLSX.utils.book_append_sheet(wb, wsUpdateLonglat, translate('excel.delivery.sheets.update_longlat'));

  // --- Sheet 4: Hasil RO vs Real ---
  const headers3 = [
    translate('excel.delivery.headers.flow'),
    translate('excel.delivery.headers.plate'),
    translate('excel.delivery.headers.driver'),
    translate('excel.delivery.headers.cust_name'),
    translate('excel.delivery.headers.status_del'),
    translate('excel.delivery.headers.open_time'),
    translate('excel.delivery.headers.close_time'),
    translate('excel.delivery.headers.eta'),
    translate('excel.delivery.headers.act_arr'),
    translate('excel.delivery.headers.etd'),
    translate('excel.delivery.headers.act_dep'),
    translate('excel.delivery.headers.visit_time'),
    translate('excel.delivery.headers.act_visit_time'),
    translate('excel.delivery.headers.ro_seq'),
    translate('excel.delivery.headers.real_seq'),
    translate('excel.delivery.headers.is_same_seq'),
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
      const isSame = ro == real ? translate('excel.delivery.data.match') : translate('excel.delivery.data.mismatch');
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
  const redFillStyleRoVsReal = { fill: { patternType: 'solid', fgColor: { rgb: 'FFC7CE' } } };
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
          cell.s.fill = redFillStyleRoVsReal.fill;
        }
      }
    }
  }
  XLSX.utils.book_append_sheet(wb, wsRoVsReal, 'Hasil RO vs Real');

  // --- 9. Kembalikan Hasil ---
  const excelFileName = `${translate('excel.delivery.filename')} - ${formatYYYYMMDDToDDMMYYYY(selectedDate)} - ${selectedLocationName}.xlsx`;
  return { wb, excelFileName };
}
