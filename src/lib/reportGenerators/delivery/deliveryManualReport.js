'use client';

import {
  calculateHaversineDistance,
  calculateMinuteDifference,
  extractTempFromDriverName,
  formatCoordinates,
  formatDateUniversal,
  formatSimpleTime,
  formatTimestampToHHMM,
  getBasePlate,
  isEmpty,
  normalizeEmail,
  parseCustomerString,
} from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import {
  FAILED_STATUSES,
  PENDING_SHEET_STATUSES_BASE,
  getDeliveryHeaders,
  getDeliverySheetNames,
  reportStyles,
} from './help';

function extractDateOnly(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.split(/[T\s]/);
  return parts[0] || null;
}

function extractAndFormatDDMMYYYY(dateStr) {
  const datePart = extractDateOnly(dateStr);
  if (!datePart) return '';
  const [y, m, d] = datePart.split('-');
  return y && m && d ? `${d}-${m}-${y}` : datePart;
}

function getMajority(arr) {
  if (!arr || arr.length === 0) return null;
  const counts = {};
  let max = 0;
  let res = arr[0];
  for (const val of arr) {
    counts[val] = (counts[val] || 0) + 1;
    if (counts[val] > max) {
      max = counts[val];
      res = val;
    }
  }
  return res;
}

export async function generateManualDeliveryWorkbook(
  fileBuffers,
  driverData,
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

  const headers = getDeliveryHeaders(translate, isSpecialHub);
  const sheetNames = getDeliverySheetNames(translate);

  const emailToDriverMap = driverData.reduce((acc, driver) => {
    const normalizedEmail = normalizeEmail(driver.email);
    if (normalizedEmail) {
      acc[normalizedEmail] = { plat: driver.plat || null, name: driver.name };
    }
    return acc;
  }, {});

  const driverStats = new Map();
  let allTaskDataForSequence = [];
  let updateLonglatData = [];
  const allAssignedDates = [];

  for (const fileBuffer of fileBuffers) {
    const wbInput = XLSX.read(fileBuffer, { type: 'array' });
    const targetSheetName =
      wbInput.SheetNames.find((s) => s.toLowerCase() === 'main') || wbInput.SheetNames[0];
    const rawRows = XLSX.utils.sheet_to_json(wbInput.Sheets[targetSheetName], { header: 1 });

    let headerRowIdx = -1;
    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (Array.isArray(row)) {
        const rowStr = row.map((cell) => String(cell).toLowerCase().trim());
        if (rowStr.includes('_id') && rowStr.includes('flow') && rowStr.includes('flowid')) {
          headerRowIdx = i;
          break;
        }
      }
    }

    if (headerRowIdx === -1) {
      throw new Error(
        translate('report.toast.error_invalid_format') ||
          'Format excel tidak valid: Header _id, flow, dan flowId tidak ditemukan.'
      );
    }

    const excelHeaders = rawRows[headerRowIdx].map((h) =>
      typeof h === 'string' ? h.toLowerCase().trim() : ''
    );

    const idxAssignee = excelHeaders.findIndex((h) => h === 'assignee');
    const idxFlow = excelHeaders.findIndex((h) => h === 'flow');
    const idxCustOrder = excelHeaders.findIndex((h) => h === 'customer order');
    const idxCustName = excelHeaders.findIndex((h) => h === 'customer name');
    const idxStatusDel = excelHeaders.findIndex((h) => h === 'status delivery');
    const idxStatus = excelHeaders.findIndex((h) => h === 'status');
    const idxOrderId = excelHeaders.findIndex((h) => h === 'order id');
    const idxStartTime = excelHeaders.findIndex((h) => h === 'starttime');
    const idxDoneTime = excelHeaders.findIndex((h) => h === 'donetime');
    const idxAlasan = excelHeaders.findIndex((h) => h === 'alasan');
    const idxOpenTime = excelHeaders.findIndex((h) => h === 'open time');
    const idxCloseTime = excelHeaders.findIndex((h) => h === 'close time');
    const idxEta = excelHeaders.findIndex((h) => h === 'eta');
    const idxEtd = excelHeaders.findIndex((h) => h === 'etd');
    const idxPage1 = excelHeaders.findIndex((h) => h === 'page1donetime');
    const idxKlikSampai = excelHeaders.findIndex((h) => h.includes('klik jika sudah sampai'));
    const idxPage3 = excelHeaders.findIndex((h) => h === 'page3donetime');
    const idxVisitTime = excelHeaders.findIndex((h) => h === 'visit time');
    const idxRoSeq = excelHeaders.findIndex((h) => h === 'routeplannedorder');
    const idxTypeStorage = excelHeaders.findIndex((h) => h === 'typestorage');
    const idxKlikLokasi = excelHeaders.findIndex((h) => h.includes('klik lokasi client'));
    const idxExpectedCoord = excelHeaders.findIndex((h) => h === 'expectedcoordinate');
    const idxGpsSesuai = excelHeaders.findIndex((h) => h === 'gps sesuai');
    const idxTitle = excelHeaders.findIndex((h) => h === 'title');
    const idxAssignedTime = excelHeaders.findIndex((h) => h === 'assignedtime');

    for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || row.length === 0) continue;

      const rawAssignee = idxAssignee !== -1 && row[idxAssignee] ? String(row[idxAssignee]) : null;
      const flow = idxFlow !== -1 && row[idxFlow] ? String(row[idxFlow]) : '';
      const driverEmail = normalizeEmail(rawAssignee);
      const driverInfo = driverEmail ? emailToDriverMap[driverEmail] : null;
      const driverName = driverInfo ? driverInfo.name : driverEmail || 'N/A';

      const assignedTime =
        idxAssignedTime !== -1 && row[idxAssignedTime] ? String(row[idxAssignedTime]) : null;
      if (assignedTime) {
        const datePart = assignedTime.split(/[T\s]/)[0];
        const p = datePart.split('-');
        if (p.length === 3) {
          allAssignedDates.push(`${p[2]}.${p[1]}.${p[0]}`);
        } else if (datePart.includes('/')) {
          allAssignedDates.push(datePart.replace(/\//g, '.'));
        }
      }

      const rawCustOrder =
        idxCustOrder !== -1 && row[idxCustOrder] ? String(row[idxCustOrder]) : '';
      const rawCustName = idxCustName !== -1 && row[idxCustName] ? String(row[idxCustName]) : '';
      const customerData = parseCustomerString(rawCustOrder || rawCustName);
      const {
        name: customerName,
        id: customerId,
        location: customerLocation,
        invoiceNumber,
        fullCustomerName,
      } = customerData;

      const title = idxTitle !== -1 && row[idxTitle] ? String(row[idxTitle]) : '';
      const pickupCustomerName = `${title} (${customerName})`;

      let statusLabel =
        idxStatusDel !== -1 && row[idxStatusDel] ? String(row[idxStatusDel]).toUpperCase() : null;
      const taskStatus = idxStatus !== -1 && row[idxStatus] ? String(row[idxStatus]) : null;
      statusLabel = flow.toLowerCase() === 'pickup' && taskStatus ? 'SUKSES' : statusLabel;

      const orderId = idxOrderId !== -1 && row[idxOrderId] ? String(row[idxOrderId]) : '';
      const startTime = idxStartTime !== -1 && row[idxStartTime] ? String(row[idxStartTime]) : null;
      const doneTime = idxDoneTime !== -1 && row[idxDoneTime] ? String(row[idxDoneTime]) : null;
      const alasan = idxAlasan !== -1 && row[idxAlasan] ? String(row[idxAlasan]) : '';
      const eta = idxEta !== -1 && row[idxEta] ? String(row[idxEta]) : null;
      const etd = idxEtd !== -1 && row[idxEtd] ? String(row[idxEtd]) : null;
      const routePlannedOrder =
        idxRoSeq !== -1 && row[idxRoSeq] ? parseInt(row[idxRoSeq], 10) : null;
      const typeStorage =
        idxTypeStorage !== -1 && row[idxTypeStorage] ? String(row[idxTypeStorage]) : '';
      const visitTime = idxVisitTime !== -1 && row[idxVisitTime] ? row[idxVisitTime] : null;

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

        const startDateOnly = extractDateOnly(startTime);
        const doneDateOnly = extractDateOnly(doneTime);
        if (startDateOnly && doneDateOnly && startDateOnly !== doneDateOnly) {
          stats.mismatchCustomers.push({
            name: customerName,
            date: extractAndFormatDDMMYYYY(doneTime),
          });
        }
        if (
          isEmpty(eta) ||
          isEmpty(etd) ||
          isEmpty(routePlannedOrder) ||
          isNaN(routePlannedOrder)
        ) {
          stats.missingDataCustomers.push({
            name: flow.toLowerCase() === 'pickup' ? pickupCustomerName : customerName,
          });
        }
        driverStats.set(driverName, stats);
      }

      const page1DoneTime = idxPage1 !== -1 && row[idxPage1] ? String(row[idxPage1]) : null;
      const page3DoneTime = idxPage3 !== -1 && row[idxPage3] ? String(row[idxPage3]) : null;
      const klikSampai =
        idxKlikSampai !== -1 && row[idxKlikSampai] ? String(row[idxKlikSampai]) : null;

      let actualArrival, actualDeparture;
      if (flow && (flow.toUpperCase().includes('GR') || flow.toUpperCase().includes('PICKUP'))) {
        actualArrival = page1DoneTime;
        actualDeparture = page1DoneTime;
      } else {
        actualArrival = klikSampai;
        actualDeparture = page3DoneTime;
      }

      const openTimeVal =
        idxOpenTime !== -1 && row[idxOpenTime] ? formatSimpleTime(String(row[idxOpenTime])) : '-';
      const closeTimeVal =
        idxCloseTime !== -1 && row[idxCloseTime]
          ? formatSimpleTime(String(row[idxCloseTime]))
          : '-';
      const actualArrVal = formatTimestampToHHMM(actualArrival) || '-';
      const actualDepVal = formatTimestampToHHMM(actualDeparture) || '-';

      let hoursStatus = null;
      if (actualArrVal !== '-' && openTimeVal !== '-' && closeTimeVal !== '-') {
        const isInside =
          openTimeVal > closeTimeVal
            ? actualArrVal >= openTimeVal || actualArrVal <= closeTimeVal
            : actualArrVal >= openTimeVal && actualArrVal <= closeTimeVal;
        if (isInside) hoursStatus = 'yes';
        else if (actualArrVal < openTimeVal) hoursStatus = 'early';
        else hoursStatus = 'no';
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
        actualDepartureTimestamp: actualDeparture ? new Date(actualDeparture).getTime() : null,
        roSequence: isNaN(routePlannedOrder) ? null : routePlannedOrder,
        statusLabel: statusLabel,
        isMigrated: isMigrated,
        flow: flow,
        customerName: customerName,
        fullCustomerName: fullCustomerName || customerName,
        locationId: customerLocation,
        fakturBatal: fakturBatal,
        terkirimSebagian: terkirimSebagian,
        pending: pending,
        pendingGR: pendingGR,
        reason: alasan,
        openTime: openTimeVal,
        closeTime: closeTimeVal,
        eta: formatSimpleTime(eta) || '-',
        etd: formatSimpleTime(etd) || '-',
        actualArrival: actualArrVal,
        actualDeparture: actualDepVal,
        visitTime: visitTime,
        actualVisitTime: calculateMinuteDifference(actualDeparture, actualArrival),
        customerId: customerId,
        invoiceNumber: invoiceNumber || orderId,
        temperature: typeStorage || extractTempFromDriverName(driverName),
        realSequence: 0,
        startTimeFormatted: startTime
          ? extractAndFormatDDMMYYYY(startTime).replace(/-/g, '/')
          : '-',
        isWithinHoursStatus: hoursStatus,
      });

      const gpsSesuai =
        idxGpsSesuai !== -1 && row[idxGpsSesuai] ? String(row[idxGpsSesuai]).toUpperCase() : '';
      const klikLokasi =
        idxKlikLokasi !== -1 && row[idxKlikLokasi] ? String(row[idxKlikLokasi]) : null;
      const expectedCoord =
        idxExpectedCoord !== -1 && row[idxExpectedCoord] ? String(row[idxExpectedCoord]) : null;

      if (gpsSesuai === 'TIDAK' && klikLokasi) {
        updateLonglatData.push({
          customerName: customerName,
          customerId: customerId,
          locationId: customerLocation,
          newLonglat: formatCoordinates(klikLokasi),
          bedaJarak: calculateHaversineDistance(expectedCoord, klikLokasi),
        });
      }
    }
  }

  allTaskDataForSequence.sort((a, b) => {
    const driverCompare = a.driver.localeCompare(b.driver);
    if (driverCompare !== 0) return driverCompare;
    const timeA = a.actualDepartureTimestamp || Infinity;
    const timeB = b.actualDepartureTimestamp || Infinity;
    return timeA - timeB;
  });

  let currentDriver = null;
  let rankCounter = 1;
  for (const row of allTaskDataForSequence) {
    if (row.driver !== currentDriver) {
      currentDriver = row.driver;
      rankCounter = 1;
    }
    if (row.actualDepartureTimestamp !== null) {
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

  const wb = XLSX.utils.book_new();

  const majorityAssignedDate = getMajority(allAssignedDates);
  const routingDateStr = majorityAssignedDate || formatDateUniversal(apiDate, 'DD.MM.YYYY');

  const wsRoutingDate = XLSX.utils.aoa_to_sheet([
    [translate('excel.delivery.headers.routing_date_title')],
    [routingDateStr, null, null, null, null, null, null],
  ]);
  wsRoutingDate['A1'].s = reportStyles.routingDateTitle;
  wsRoutingDate['A2'].s = reportStyles.routingDateValue;
  wsRoutingDate['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
  ];
  wsRoutingDate['!cols'] = Array(7).fill({ wch: 15 });
  XLSX.utils.book_append_sheet(wb, wsRoutingDate, sheetNames.routingDate);

  const validDriverData = driverData.filter((driver) => {
    const plat = driver.plat || '';
    if (isEmpty(plat) || plat.toUpperCase().includes('DEMO')) return false;
    return true;
  });

  const aggregatedMap = new Map();
  validDriverData.forEach((driver) => {
    const driverName = driver.name;
    const basePlate = getBasePlate(driver.plat);
    const stats = driverStats.get(driverName);

    if (!aggregatedMap.has(basePlate)) {
      aggregatedMap.set(basePlate, {
        plat: basePlate,
        driver: driverName,
        totalOutlet: 0,
        totalDelivery: 0,
        mismatchCustomers: [],
        missingDataCustomers: [],
        hasData: false,
      });
    }

    const agg = aggregatedMap.get(basePlate);
    const cleanExisting = agg.driver.replace(/['"]?(DRY|FRZ)['"]?\s*/i, '').trim();
    const cleanNew = driverName.replace(/['"]?(DRY|FRZ)['"]?\s*/i, '').trim();
    if (cleanExisting !== cleanNew && !agg.driver.includes(cleanNew)) {
      agg.driver += ` / ${driverName}`;
    }

    if (stats) {
      agg.hasData = true;
      agg.totalOutlet = stats.totalOutlet;
      agg.totalDelivery = stats.totalOutlet - stats.failedCount;

      stats.mismatchCustomers.forEach((mc) => {
        if (!agg.mismatchCustomers.some((ex) => ex.name === mc.name && ex.date === mc.date)) {
          agg.mismatchCustomers.push(mc);
        }
      });

      stats.missingDataCustomers.forEach((md) => {
        if (!agg.missingDataCustomers.some((ex) => ex.name === md.name)) {
          agg.missingDataCustomers.push(md);
        }
      });
    }
  });

  const sheetData1Objects = Array.from(aggregatedMap.values()).map((agg) => {
    if (!agg.hasData) {
      return {
        ...agg,
        totalOutlet: null,
        totalDelivery: null,
        highlightType: 'none',
        mismatchText: '',
        missingDataText: '',
      };
    }
    const mismatchText = agg.mismatchCustomers
      .map((t) => `• ${t.name} (done: ${t.date})`)
      .join('\n');
    const missingDataText = agg.missingDataCustomers.map((t) => `• ${t.name}`).join('\n');

    let highlightType = 'none';
    if (agg.missingDataCustomers.length > 0 && agg.mismatchCustomers.length > 0)
      highlightType = 'green';
    else if (agg.missingDataCustomers.length > 0) highlightType = 'blue';
    else if (agg.mismatchCustomers.length > 0) highlightType = 'yellow';

    return { ...agg, highlightType, mismatchText, missingDataText };
  });

  sheetData1Objects.sort((a, b) => {
    const groupA = getSortGroup(a.plat);
    const groupB = getSortGroup(b.plat);
    if (groupA !== groupB) return groupA - groupB;
    return (a.driver || '').localeCompare(b.driver || '');
  });

  const finalSheetData1 = [
    headers.totalDelivered,
    ...sheetData1Objects.map((r) => [
      r.plat,
      r.driver,
      r.totalOutlet,
      r.totalDelivery,
      r.missingDataText,
      r.mismatchText,
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
    if (wsDelivered[cell]) wsDelivered[cell].s = reportStyles.headerStyle;
  });

  finalSheetData1.forEach((row, R) => {
    if (R === 0) return;
    const rowData = sheetData1Objects[R - 1];
    ['A', 'B', 'C', 'D', 'E', 'F'].forEach((col) => {
      const cellRef = `${col}${R + 1}`;
      if (wsDelivered[cellRef]) {
        if (col === 'A' || col === 'C' || col === 'D')
          wsDelivered[cellRef].s = reportStyles.centerStyle;
        else if (col === 'B') wsDelivered[cellRef].s = reportStyles.leftAlignStyle;
        else if (col === 'E' || col === 'F') wsDelivered[cellRef].s = reportStyles.wrapTextStyle;
      }
    });

    const styleMap = {
      green: { ...reportStyles.centerStyle, fill: reportStyles.greenFillStyle.fill },
      blue: { ...reportStyles.centerStyle, fill: reportStyles.blueFillStyle.fill },
      yellow: { ...reportStyles.centerStyle, fill: reportStyles.yellowFillStyle.fill },
    };

    if (styleMap[rowData.highlightType]) {
      if (wsDelivered[`C${R + 1}`]) wsDelivered[`C${R + 1}`].s = styleMap[rowData.highlightType];
      if (wsDelivered[`D${R + 1}`]) wsDelivered[`D${R + 1}`].s = styleMap[rowData.highlightType];
    }
  });
  XLSX.utils.book_append_sheet(wb, wsDelivered, sheetNames.totalDelivered);

  const pendingSOData = allTaskDataForSequence.filter(
    (row) => PENDING_SHEET_STATUSES.includes(row.statusLabel) || row.isMigrated
  );
  pendingSOData.sort((a, b) => {
    const groupA = getSortGroup(a.plat || '');
    const groupB = getSortGroup(b.plat || '');
    if (groupA !== groupB) return groupA - groupB;
    const driverCompare = (a.driver || '').localeCompare(b.driver || '');
    if (driverCompare !== 0) return driverCompare;
    return (a.roSequence || 0) - (b.roSequence || 0);
  });

  const finalSheetData2 = [
    headers.pendingSO,
    ...pendingSOData.map((row) => {
      const dataRow = [
        row.flow,
        row.invoiceNumber,
        routingDateStr.replace(/\./g, '/'),
        getBasePlate(row.plat),
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
        row.eta,
        row.etd,
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
  const pendingColIndex = 6;
  const centerAlignedSOColumns = [
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
  ].map((h) => headers.pendingSO.indexOf(h));

  wsPendingSO['!cols'] = headers.pendingSO.map((_, i) => {
    if (i === separatorColIndex) return { wch: 3 };
    const max = finalSheetData2.reduce((m, r) => Math.max(m, r[i] ? String(r[i]).length : 0), 0);
    return { wch: Math.min(max + 2, 50) };
  });

  const rangeSO = XLSX.utils.decode_range(wsPendingSO['!ref']);
  for (let R = rangeSO.s.r; R <= rangeSO.e.r; ++R) {
    for (let C = rangeSO.s.c; C <= rangeSO.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!wsPendingSO[cellRef]) wsPendingSO[cellRef] = { t: 's', v: '' };
      const cell = wsPendingSO[cellRef];

      if (R === 0) {
        if (C === separatorColIndex)
          cell.s = { ...reportStyles.headerStyle, ...reportStyles.separatorStyle };
        else if (C <= 1) cell.s = reportStyles.headerStyle;
        else cell.s = reportStyles.greenHeaderStyle;

        if (migrationOccurred && C === pendingColIndex) {
          cell.c = [{ a: 'Info', t: translate('excel.delivery.info_wrong_status'), h: true }];
        }
      } else {
        if (C === separatorColIndex) cell.s = reportStyles.separatorStyle;
        else if (centerAlignedSOColumns.includes(C)) {
          cell.s = { ...reportStyles.centerStyle };
          if (typeof cell.v === 'number') cell.t = 'n';
        }
        const rowData = pendingSOData[R - 1];
        if (rowData && rowData.isMigrated && C === pendingColIndex) {
          cell.s = { ...cell.s, fill: { patternType: 'solid', fgColor: { rgb: 'FF0000' } } };
        }
      }
    }
  }
  XLSX.utils.book_append_sheet(wb, wsPendingSO, sheetNames.pendingSO);

  updateLonglatData.sort((a, b) => (a.bedaJarak ?? Infinity) - (b.bedaJarak ?? Infinity));
  const finalSheetData4 = [
    headers.updateLonglat,
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
  wsUpdateLonglat['!cols'] = headers.updateLonglat.map((_, i) => {
    const max = finalSheetData4.reduce((m, r) => Math.max(m, r[i] ? String(r[i]).length : 0), 0);
    return { wch: Math.min(max + 2, 50) };
  });

  const range4 = XLSX.utils.decode_range(wsUpdateLonglat['!ref']);
  for (let R = range4.s.r; R <= range4.e.r; ++R) {
    for (let C = range4.s.c; C <= range4.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!wsUpdateLonglat[cellRef]) continue;
      if (R === 0) {
        wsUpdateLonglat[cellRef].s = reportStyles.headerStyle;
        if (C === 4)
          wsUpdateLonglat[cellRef].c = [
            { a: 'Info', t: translate('excel.delivery.info_longlat'), h: true },
          ];
      } else if ([1, 2, 3, 4].includes(C)) {
        wsUpdateLonglat[cellRef].s = reportStyles.centerStyle;
        if (typeof wsUpdateLonglat[cellRef].v === 'number') wsUpdateLonglat[cellRef].t = 'n';
      }
    }
  }
  XLSX.utils.book_append_sheet(wb, wsUpdateLonglat, sheetNames.updateLonglat);

  let finalSheetData3 = [headers.roVsReal];
  const manualAssignRows3 = new Set();

  const tasksByNameMap = new Map();
  for (const task of allTaskDataForSequence) {
    if (!tasksByNameMap.has(task.driver)) tasksByNameMap.set(task.driver, []);
    tasksByNameMap.get(task.driver).push(task);
  }

  let roVsRealDriverList = Array.from(driverStats.entries()).map(([driver, stats]) => ({
    plat: stats.plat,
    driver,
  }));
  roVsRealDriverList.sort((a, b) => {
    const groupA = getSortGroup(a.plat);
    const groupB = getSortGroup(b.plat);
    if (groupA !== groupB) return groupA - groupB;
    return (a.driver || '').localeCompare(b.driver || '');
  });

  for (const driverRow of roVsRealDriverList) {
    const tasks = tasksByNameMap.get(driverRow.driver) || [];

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
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ]);

    tasks.sort((a, b) => {
      const roA = a.roSequence === '-' || a.roSequence == null ? -1 : Number(a.roSequence);
      const roB = b.roSequence === '-' || b.roSequence == null ? -1 : Number(b.roSequence);
      return roA - roB;
    });

    for (const task of tasks) {
      const customerData = task.fullCustomerName;
      const ro = task.roSequence || '-';
      const real = task.realSequence || '-';
      const isSame = isEmpty(real)
        ? '-'
        : ro === real
          ? translate('common.status.match')
          : translate('common.status.mismatch');

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

      if (task.roSequence === null || task.roSequence === 0)
        manualAssignRows3.add(finalSheetData3.length);

      finalSheetData3.push([
        task.flow || '-',
        getBasePlate(task.plat) || '-',
        task.driver || '-',
        customerData || '-',
        isEmpty(newStatusLabel) ? '-' : newStatusLabel.toUpperCase(),
        task.openTime,
        task.closeTime,
        task.eta,
        task.actualArrival,
        task.etd,
        task.actualDeparture,
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
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
    finalSheetData3.push(Array(headers.roVsReal.length).fill(null));
  }

  const wsRoVsReal = XLSX.utils.aoa_to_sheet(finalSheetData3);
  wsRoVsReal['!view'] = { state: 'frozen', ySplit: 1 };
  wsRoVsReal['!cols'] = headers.roVsReal.map((_, i) => {
    const max = finalSheetData3.reduce((m, r) => Math.max(m, r[i] ? String(r[i]).length : 0), 0);
    return { wch: Math.min(max + 2, 50) };
  });

  const range3 = XLSX.utils.decode_range(wsRoVsReal['!ref']);
  for (let R = range3.s.r; R <= range3.e.r; ++R) {
    const isHubRow = wsRoVsReal[XLSX.utils.encode_cell({ r: R, c: 3 })]?.v === 'HUB';
    for (let C = range3.s.c; C <= range3.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!wsRoVsReal[cellRef]) wsRoVsReal[cellRef] = { t: 's', v: '' };
      const cell = wsRoVsReal[cellRef];

      if (R === 0) {
        const colFill = reportStyles.colFillMapRoVsReal[C];
        cell.s = {
          font: { bold: true },
          alignment: {
            horizontal: 'center',
            vertical: 'center',
            ...(C >= 11 && C <= 14 ? { wrapText: true } : {}),
          },
          ...(colFill ? { fill: { fgColor: { rgb: colFill.header } } } : {}),
        };
        if (C === 16)
          cell.c = [{ a: 'Info', t: translate('excel.delivery.info_within_hours'), h: true }];
      } else if (isHubRow) {
        if ([3, 7, 9].includes(C)) cell.s = { ...reportStyles.hubRedStyle };
        else cell.s = { font: { color: { rgb: 'FF0000' } } };
      } else {
        if (
          isEmpty(wsRoVsReal[XLSX.utils.encode_cell({ r: R, c: 0 })]?.v) &&
          isEmpty(wsRoVsReal[XLSX.utils.encode_cell({ r: R, c: 2 })]?.v)
        )
          continue;

        if (manualAssignRows3.has(R)) {
          cell.s = {
            ...(C <= 3 ? reportStyles.leftAlignStyle : reportStyles.centerStyle),
            fill: { fgColor: { rgb: 'FECACA' } },
          };
        } else if (C <= 3) {
          cell.s = { ...reportStyles.leftAlignStyle };
        } else {
          const colFill = reportStyles.colFillMapRoVsReal[C];
          cell.s = {
            ...reportStyles.centerStyle,
            ...(colFill ? { fill: { fgColor: { rgb: colFill.data } } } : {}),
          };
        }

        if (typeof cell.v === 'number') cell.t = 'n';

        if (C === 15 && cell.v) {
          cell.s = {
            ...cell.s,
            font: {
              bold: true,
              color: { rgb: cell.v === translate('common.status.match') ? '16A34A' : 'DC2626' },
            },
          };
        }
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
  XLSX.utils.book_append_sheet(wb, wsRoVsReal, sheetNames.roVsReal);

  const formattedDate = majorityAssignedDate || formatDateUniversal(selectedDate, 'DD.MM.YYYY');
  const excelFileName = `${translate('excel.delivery.filename_manual') || 'Delivery Report Manual'} - ${formattedDate} - ${selectedLocationName}.xlsx`;

  return { wb, excelFileName };
}
