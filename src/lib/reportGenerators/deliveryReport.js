'use client';

// (PERHATIKAN PATH: Sesuaikan path ke 'constants' dan 'utils' jika perlu)
import {
  calculateHaversineDistance,
  calculateMinuteDifference,
  extractTempFromDriverName,
  formatCoordinates,
  formatDateUniversal,
  formatSimpleTime,
  formatTimestampToHHMM,
  getUTC7DateString,
  isEmpty,
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
  selectedDate,
  apiDate,
  selectedLocationName,
  hasPendingGR,
  t
) {
  const translate = t || ((key) => key);

  const isSpecialHub = hasPendingGR;
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
          if (!driverName || !Array.isArray(route.trips) || isEmpty(route.trips)) continue;

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
    const flow = task.flow;
    const driverEmail = normalizeEmail(emailString);
    const driverInfo = driverEmail ? emailToDriverMap[driverEmail] : null;
    const driverName = driverInfo ? driverInfo.name : driverEmail || 'N/A';
    let statusLabel =
      task.statusDelivery && task.statusDelivery.length > 0
        ? task.statusDelivery[0].toUpperCase()
        : null;
    statusLabel = flow === 'Pickup' && task.status ? 'SUKSES' : statusLabel;
    const customerData = parseCustomerString(task.customerOrder || task.customerName);
    const { name: customerName, id: customerId, location: customerLocation } = customerData;
    const pickupCustomerName = `${task.title} (${customerName})`;
    const orderId = task.orderId || '';

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
          date: doneDate,
        });
      }
      if (!task.eta || !task.etd || !task.routePlannedOrder) {
        stats.missingDataCustomers.push({
          name: flow === 'Pickup' ? pickupCustomerName : customerName,
        });
      }
      driverStats.set(driverName, stats);
    }

    let actualArrival, actualDeparture;
    if (flow && (flow.toUpperCase().includes('GR') || flow.toUpperCase().includes('PICKUP'))) {
      actualArrival = task.page1DoneTime;
      actualDeparture = task.page1DoneTime;
    } else {
      actualArrival = task.klikJikaSudahSampai;
      actualDeparture = task.page3DoneTime;
    }

    // --- TAMBAHAN LOGIKA PENGECEKAN STATUS JAM OPERASIONAL ---
    const openTimeVal = formatSimpleTime(task.openTime) || '-';
    const closeTimeVal = formatSimpleTime(task.closeTime) || '-';
    const actualArrVal = formatTimestampToHHMM(actualArrival) || '-';

    let hoursStatus = null;
    if (actualArrVal !== '-' && openTimeVal !== '-' && closeTimeVal !== '-') {
      const isInside =
        openTimeVal > closeTimeVal
          ? actualArrVal >= openTimeVal || actualArrVal <= closeTimeVal
          : actualArrVal >= openTimeVal && actualArrVal <= closeTimeVal;

      if (isInside) {
        hoursStatus = 'yes';
      } else if (actualArrVal < openTimeVal) {
        hoursStatus = 'early';
      } else {
        hoursStatus = 'no';
      }
    }
    // ---------------------------------------------------------

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
      locationId: customerLocation,
      fakturBatal: fakturBatal,
      terkirimSebagian: terkirimSebagian,
      pending: pending,
      pendingGR: pendingGR,
      reason: task.alasan,
      openTime: openTimeVal,
      closeTime: closeTimeVal,
      eta: formatSimpleTime(task.eta) || '-',
      etd: formatSimpleTime(task.etd) || '-',
      actualArrival: actualArrVal,
      actualDeparture: formatTimestampToHHMM(actualDeparture) || '-',
      visitTime: task.visitTime,
      actualVisitTime: calculateMinuteDifference(actualDeparture, actualArrival),
      customerId: customerId,
      temperature: extractTempFromDriverName(driverName),
      realSequence: 0,
      orderId: orderId,
      isWithinHoursStatus: hoursStatus, // <--- Data Status Jam
    });

    if (task.klikLokasiClient) {
      updateLonglatData.push({
        customerName: customerName,
        customerId: customerId,
        locationId: customerLocation,
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

  // Warna khusus untuk kolom Status Jam
  const textGreenStyle = {
    alignment: centerStyle.alignment,
    font: { bold: true, color: { rgb: '16A34A' } },
  };
  const textAmberStyle = {
    alignment: centerStyle.alignment,
    font: { bold: true, color: { rgb: 'F59E0B' } },
  };
  const textRedStyle = {
    alignment: centerStyle.alignment,
    font: { bold: true, color: { rgb: 'DC2626' } },
  };

  // --- Sheet 1: Routing Date ---
  const routingDate = formatDateUniversal(apiDate, 'DD.MM.YYYY');
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
  XLSX.utils.book_append_sheet(wb, wsRoutingDate, translate('excel.delivery.sheets.routing_date'));

  // --- Sheet 2: Total Delivered ---
  const headers1 = [
    translate('common.license_number'),
    translate('common.driver'),
    translate('excel.delivery.headers.total_outlet'),
    translate('excel.delivery.headers.total_delivery'),
    translate('excel.delivery.headers.info_manual'),
    translate('excel.delivery.headers.info_diff_day'),
  ];
  const validDriverData = driverData.filter((driver) => {
    const plat = driver.plat || '';
    if (isEmpty(plat)) return false;
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
          return `• ${task.name} (done: ${formattedDate})`;
        })
        .join('\n');
      const missingDataText = stats.missingDataCustomers.map((task) => `• ${task.name}`).join('\n');
      const hasManualError = stats.missingDataCustomers.length > 0;
      const hasBedaHariError = stats.mismatchCustomers.length > 0;
      let highlightType = 'none';
      if (hasManualError && hasBedaHariError) {
        highlightType = 'green';
      } else if (hasManualError) {
        highlightType = 'blue';
      } else if (hasBedaHariError) {
        highlightType = 'yellow';
      }
      return {
        plat: driverPlat || stats.plat,
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
    translate('common.flow'),
    translate('common.so_number'),
    translate('common.date'),
    translate('common.license_number'),
    translate('common.driver'),
    translate('common.status.cancel'),
    translate('common.status.partial'),
    translate('common.status.pending'),
  ];
  if (isSpecialHub) headers2.push(translate('common.status.pending_gr'));
  headers2.push(
    translate('excel.delivery.headers.reason'),
    '',
    translate('common.open_time'),
    translate('common.close_time'),
    translate('common.eta'),
    translate('common.etd'),
    translate('common.actual_arrival'),
    translate('common.actual_departure'),
    translate('common.visit_plan'),
    translate('common.visit_actual'),
    translate('common.customer_id'),
    translate('common.ro_seq'),
    translate('common.actual_seq'),
    translate('common.storage_type')
  );
  const finalSheetData2 = [
    headers2,
    ...pendingSOData.map((row) => {
      const dataRow = [
        row.flow,
        row.orderId,
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
  const separatorColIndex = isSpecialHub ? 10 : 9;
  const centerAlignedIndices = [
    translate('common.open_time'),
    translate('common.close_time'),
    translate('common.eta'),
    translate('common.etd'),
    translate('common.actual_arrival'),
    translate('common.actual_departure'),
    translate('common.visit_plan'),
    translate('common.visit_actual'),
    translate('common.customer_id'),
    translate('common.ro_seq'),
    translate('common.actual_seq'),
    translate('common.storage_type'),
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
  const pendingColIndex = 6;
  const rangeSO = XLSX.utils.decode_range(wsPendingSO['!ref']);
  for (let R = rangeSO.s.r; R <= rangeSO.e.r; ++R) {
    for (let C = rangeSO.s.c; C <= rangeSO.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!wsPendingSO[cellRef]) wsPendingSO[cellRef] = { t: 's', v: '' };
      const cell = wsPendingSO[cellRef];
      if (R === 0) {
        if (C === separatorColIndex) {
          cell.s = { ...headerStyle, ...separatorStyle };
        } else if (C <= 1) {
          cell.s = headerStyle;
        } else {
          cell.s = greenHeaderStyle;
        }
        if (migrationOccurred && C === pendingColIndex) {
          cell.c = [
            {
              a: 'Info',
              t: translate('excel.delivery.info_wrong_status'),
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
    translate('common.customer_name'),
    translate('common.customer_id'),
    translate('common.location_id'),
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
            { a: 'Info', t: translate('excel.delivery.info_longlat'), h: true },
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
  XLSX.utils.book_append_sheet(
    wb,
    wsUpdateLonglat,
    translate('excel.delivery.sheets.update_longlat')
  );

  // --- Sheet 4: Hasil RO vs Real ---
  const headers3 = [
    translate('common.flow'),
    translate('common.license_number'),
    translate('common.driver'),
    translate('common.customer_name'),
    translate('excel.delivery.headers.status_del'),
    translate('common.open_time'),
    translate('common.close_time'),
    translate('common.eta'),
    translate('common.actual_arrival'),
    translate('common.etd'),
    translate('common.actual_departure'),
    translate('common.visit_plan'),
    translate('common.visit_actual'),
    translate('common.ro_seq'),
    translate('common.actual_seq'),
    translate('excel.delivery.headers.is_match'),
    translate('dashboard.tab.routingreal.is_within_hours'),
  ];
  let finalSheetData3 = [headers3];
  const manualAssignRows3 = new Set();
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
      null, // 17 Elemen
    ]);
    tasks.sort((a, b) => a.roSequence - b.roSequence);
    for (const task of tasks) {
      const customerName = task.customerName || '';
      const customerId = task.customerId || '';
      const locationId = task.locationId || '';
      const customerData = `${customerName} - ${customerId} - ${locationId}`;
      const ro = task.roSequence || '-';
      const real = task.realSequence || '-';
      const isRealEmpty = isEmpty(real);
      const isSame = isRealEmpty
        ? '-'
        : ro === real
          ? translate('excel.delivery.match')
          : translate('excel.delivery.mismatch');

      let withinHoursText = '-';
      if (task.isWithinHoursStatus === 'yes')
        withinHoursText = translate('dashboard.tab.routingreal.yes');
      else if (task.isWithinHoursStatus === 'early')
        withinHoursText = translate('dashboard.tab.routingreal.early');
      else if (task.isWithinHoursStatus === 'no')
        withinHoursText = translate('dashboard.tab.routingreal.no');
      let newStatusLabel = '-';

      switch (task.statusLabel) {
        case 'SUKSES':
          newStatusLabel = translate('common.status.success');
          break;
        case 'TERIMA SEBAGIAN':
          newStatusLabel = translate('common.status.partial');
          break;
        case 'PENDING':
          newStatusLabel = translate('common.status.pending');
          break;
        case 'BATAL':
          newStatusLabel = translate('common.status.cancel');
          break;
        case 'PENDING GR':
          newStatusLabel = translate('common.status.pending_gr');
          break;
        default:
          newStatusLabel = task.statusLabel;
      }

      // Catat baris manual assign (roSequence === 0, sama seperti dashboard)
      if (task.roSequence === 0) manualAssignRows3.add(finalSheetData3.length);
      finalSheetData3.push([
        task.flow || '-',
        task.plat || '-',
        task.driver || '-',
        customerData || '-',
        isEmpty(newStatusLabel) ? '-' : newStatusLabel.toUpperCase(),
        task.openTime || '-',
        task.closeTime || '-',
        task.eta || '-',
        task.actualArrival || '-',
        task.etd || '-',
        task.actualDeparture || '-',
        task.visitTime || '-',
        task.actualVisitTime,
        ro,
        real,
        isSame,
        withinHoursText,
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
      null, // 17 Elemen
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
  // Override lebar kolom sempit (visit plan, visit actual, ro seq, actual seq)
  colWidths3[11] = { wch: 10 };
  colWidths3[12] = { wch: 10 };
  colWidths3[13] = { wch: 10 };
  colWidths3[14] = { wch: 10 };
  wsRoVsReal['!cols'] = colWidths3;

  // Warna background per kolom (sama seperti dashboard & help.js)
  const colFillMap3 = {
    5: { header: 'A7F3D0', data: 'D1FAE5' }, // open_time  - green
    6: { header: 'A7F3D0', data: 'D1FAE5' }, // close_time - green
    7: { header: 'FED7AA', data: 'FFEDD5' }, // eta        - orange
    8: { header: 'FED7AA', data: 'FFEDD5' }, // actual arr - orange
    9: { header: 'FDE68A', data: 'FEF9C3' }, // etd        - yellow
    10: { header: 'FDE68A', data: 'FEF9C3' }, // actual dep - yellow
    11: { header: 'FBCFE8', data: 'FCE7F3' }, // visit plan - pink
    12: { header: 'FBCFE8', data: 'FCE7F3' }, // visit act  - pink
    13: { header: 'BFDBFE', data: 'DBEAFE' }, // ro seq     - blue
    14: { header: 'BFDBFE', data: 'DBEAFE' }, // actual seq - blue
  };
  const leftAlign3 = { alignment: { horizontal: 'left', vertical: 'center' } };
  const hubRedStyle3 = {
    ...centerStyle,
    font: { bold: true, color: { rgb: 'FF0000' } },
  };

  const range3 = XLSX.utils.decode_range(wsRoVsReal['!ref']);
  for (let R = range3.s.r; R <= range3.e.r; ++R) {
    const customerCellRef = XLSX.utils.encode_cell({ r: R, c: 3 });
    const isHubRow = wsRoVsReal[customerCellRef] && wsRoVsReal[customerCellRef].v === 'HUB';

    for (let C = range3.s.c; C <= range3.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!wsRoVsReal[cellRef]) wsRoVsReal[cellRef] = { t: 's', v: '' };
      const cell = wsRoVsReal[cellRef];

      if (R === 0) {
        // Header: warna kolom + wrapText untuk kolom sempit (11-14)
        const colFill = colFillMap3[C];
        const isNarrow = C >= 11 && C <= 14;
        cell.s = {
          font: { bold: true },
          alignment: {
            horizontal: 'center',
            vertical: 'center',
            ...(isNarrow ? { wrapText: true } : {}),
          },
          ...(colFill ? { fill: { fgColor: { rgb: colFill.header } } } : {}),
        };
        if (C === 16) {
          cell.c = [{ a: 'Info', t: translate('excel.delivery.info_within_hours'), h: true }];
        }
      } else if (isHubRow) {
        // HUB row: teks merah center
        if ([7, 9].includes(C)) {
          cell.s = { ...hubRedStyle3 };
        } else if (C === 3) {
          cell.s = { ...hubRedStyle3 };
        } else {
          cell.s = { font: { color: { rgb: 'FF0000' } } };
        }
      } else {
        // Spacer row: skip semua styling
        const isSpacerRow =
          isEmpty(wsRoVsReal[XLSX.utils.encode_cell({ r: R, c: 0 })]?.v) &&
          isEmpty(wsRoVsReal[XLSX.utils.encode_cell({ r: R, c: 2 })]?.v);
        if (isSpacerRow) continue;

        // Data row: cols 0-3 rata kiri, cols 4-16 rata kanan + warna kolom
        const isManual = manualAssignRows3.has(R);
        if (isManual) {
          // Manual assign: merah di semua kolom
          cell.s = {
            ...(C <= 3 ? leftAlign3 : centerStyle),
            fill: { fgColor: { rgb: 'FECACA' } },
          };
        } else if (C <= 3) {
          cell.s = { ...leftAlign3 };
        } else {
          const colFill = colFillMap3[C];
          cell.s = {
            ...centerStyle,
            ...(colFill ? { fill: { fgColor: { rgb: colFill.data } } } : {}),
          };
        }

        if (typeof cell.v === 'number') cell.t = 'n';

        // Kolom is_match (15): warna teks
        if (C === 15 && cell.v) {
          cell.s = {
            ...cell.s,
            font: {
              bold: true,
              color: { rgb: cell.v === translate('excel.delivery.match') ? '16A34A' : 'DC2626' },
            },
          };
        }

        // Kolom is_within_hours (16): warna teks
        if (C === 16 && cell.v) {
          let color = null;
          if (cell.v === translate('dashboard.tab.routingreal.yes')) color = '16A34A';
          else if (cell.v === translate('dashboard.tab.routingreal.early')) color = 'F59E0B';
          else if (cell.v === translate('dashboard.tab.routingreal.no')) color = 'DC2626';
          if (color) cell.s = { ...cell.s, font: { bold: true, color: { rgb: color } } };
        }
      }
    }
  }
  XLSX.utils.book_append_sheet(wb, wsRoVsReal, t('excel.delivery.sheets.ro_vs_real'));

  const date = formatDateUniversal(selectedDate, 'DD.MM.YYYY');
  const excelFileName = `${translate('excel.delivery.filename')} - ${date} - ${selectedLocationName}.xlsx`;
  return { wb, excelFileName };
}
