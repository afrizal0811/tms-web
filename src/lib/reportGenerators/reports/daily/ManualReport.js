import {
  calculateMinuteDifference,
  formatCoordinates,
  formatDateUniversal,
  getBasePlate,
  getDistance,
  getStorageType,
  isEmpty,
  normalizeEmail,
  parseCustomerString,
} from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import {
  buildDriverMaps,
  buildNormalizedMappings,
  FAILED_STATUSES,
  PENDING_SHEET_STATUSES_BASE,
} from './help';
import {
  buildDistanceSummary,
  buildPendingSOSheet,
  buildRoutingDateSheet,
  buildRoVsRealSheet,
  buildTimeDriverSheet,
  buildTruckDetailSheet,
  buildTruckUsageSheet,
  buildUpdateLonglatSheet,
} from './sheet';

function parseToNum(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const str = String(val).replace(/,/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function ultraNormalize(str) {
  if (!str) return '';
  return String(str)
    .replace(/[\s\-'"]/g, '')
    .toLowerCase();
}

async function parseManualRouting(routingBuffers, driverData, mappingsObj, vehicleTypes) {
  const routingMap = new Map();
  const truckUsageCount = {};
  const seenTrucks = new Set();
  const { emailMap, platMap } = buildDriverMaps(driverData);
  const normalizedMappings = buildNormalizedMappings(mappingsObj);

  driverData.forEach((d) => {
    const basePlateStr = ultraNormalize(d?.plat);
    let cat = normalizedMappings[basePlateStr];
    if (!cat && basePlateStr) {
      const dbKeys = Object.keys(normalizedMappings);
      for (const dbKey of dbKeys) {
        if (dbKey.length > 3 && (basePlateStr.includes(dbKey) || dbKey.includes(basePlateStr))) {
          cat = normalizedMappings[dbKey];
          break;
        }
      }
    }
    if (!cat) {
      let tCat = d?.type || '';
      if (tCat) {
        const pts = String(tCat).split('-');
        let sType = pts.length > 1 ? pts[1].toUpperCase() : pts[0].toUpperCase();
        if (pts.length > 2 && pts[2].toUpperCase() === 'LONG') {
          if (['CDE', 'CDD', 'FUSO'].includes(sType)) sType = `${sType}-LONG`;
        }
        cat = sType;
      }
    }
    if (cat) {
      const uCat = String(cat).toUpperCase();
      if (!truckUsageCount[uCat]) truckUsageCount[uCat] = { Dry: 0, Frozen: 0 };
    }
  });

  for (const fileBuffer of routingBuffers) {
    const wbInput = XLSX.read(fileBuffer, { type: 'array' });
    const summarySheetName = wbInput.SheetNames.find(
      (s) => s.toLowerCase().includes('summary') || s.toLowerCase().includes('ringkasan')
    );
    if (!summarySheetName) continue;
    const rawRows = XLSX.utils.sheet_to_json(wbInput.Sheets[summarySheetName], { header: 1 });

    let headerRowIdx = -1;
    for (let i = 0; i < rawRows.length; i++) {
      if (Array.isArray(rawRows[i])) {
        if (
          rawRows[i].some(
            (c) =>
              typeof c === 'string' &&
              (c.toLowerCase().includes('vehicle name') || c.toLowerCase().includes('assignee'))
          )
        ) {
          headerRowIdx = i;
          break;
        }
      }
    }
    if (headerRowIdx === -1) continue;

    const excelHeaders = rawRows[headerRowIdx].map((h) =>
      typeof h === 'string' ? h.toLowerCase().trim() : ''
    );
    const idxVehicleName = excelHeaders.findIndex(
      (h) => h.includes('vehicle name') || h.includes('vehicle id')
    );
    const idxAssignee = excelHeaders.findIndex((h) => h.includes('assignee'));
    const idxWeight = excelHeaders.findIndex((h) => h.includes('weight percentage'));
    const idxVolume = excelHeaders.findIndex((h) => h.includes('volume percentage'));
    const idxDist = excelHeaders.findIndex((h) => h.includes('total distance (m)'));
    const idxTime = excelHeaders.findIndex((h) => h.includes('total spent time (mins)'));

    for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || row.length === 0) continue;

      const rawPlate =
        idxVehicleName !== -1 && row[idxVehicleName] ? String(row[idxVehicleName]) : '';
      const rawAssignee =
        idxAssignee !== -1 && row[idxAssignee] ? String(row[idxAssignee]).trim().toLowerCase() : '';

      if (!rawPlate && !rawAssignee) continue;

      let driverInfo = emailMap.get(rawAssignee);
      if (!driverInfo && rawPlate) driverInfo = platMap.get(ultraNormalize(rawPlate));

      const cleanPlat = driverInfo?.plat || rawPlate;
      const driverName =
        driverInfo?.name || (idxAssignee !== -1 && row[idxAssignee] ? row[idxAssignee] : rawPlate);

      const basePlat = getBasePlate(cleanPlat) || cleanPlat || '';
      const groupKey = `${driverName}_${basePlat}`;

      const weightPct = idxWeight !== -1 ? parseToNum(row[idxWeight]) : 0;
      const volumePct = idxVolume !== -1 ? parseToNum(row[idxVolume]) : 0;
      const totalDistM = idxDist !== -1 ? parseToNum(row[idxDist]) : 0;
      const spentTimeMins = idxTime !== -1 ? parseToNum(row[idxTime]) : 0;

      if (!routingMap.has(groupKey)) {
        routingMap.set(groupKey, {
          driver: driverName,
          plat: cleanPlat || '-',
          hasTrips: true,
          weightPercentage: weightPct,
          volumePercentage: volumePct,
          totalDistance: totalDistM,
          shipDurationRaw: spentTimeMins,
          etaFirstStore: '-',
          etdHub: '-',
        });
      } else {
        const ext = routingMap.get(groupKey);
        ext.weightPercentage = Math.max(ext.weightPercentage, weightPct);
        ext.volumePercentage = Math.max(ext.volumePercentage, volumePct);
        ext.totalDistance += totalDistM;
        ext.shipDurationRaw += spentTimeMins;
      }

      let category = '';
      const basePlateStr = ultraNormalize(cleanPlat);
      const originalRawStr = ultraNormalize(rawAssignee || rawPlate);
      const dbKeys = Object.keys(normalizedMappings);
      let mapped = false;

      if (basePlateStr && normalizedMappings[basePlateStr]) {
        category = normalizedMappings[basePlateStr];
        mapped = true;
      } else if (originalRawStr && normalizedMappings[originalRawStr]) {
        category = normalizedMappings[originalRawStr];
        mapped = true;
      } else {
        for (const dbKey of dbKeys) {
          if (
            dbKey.length > 3 &&
            (originalRawStr.includes(dbKey) || dbKey.includes(originalRawStr))
          ) {
            category = normalizedMappings[dbKey];
            mapped = true;
            break;
          }
        }
        if (!mapped && basePlateStr) {
          for (const dbKey of dbKeys) {
            if (
              dbKey.length > 3 &&
              (basePlateStr.includes(dbKey) || dbKey.includes(basePlateStr))
            ) {
              category = normalizedMappings[dbKey];
              mapped = true;
              break;
            }
          }
        }
      }

      if (!mapped) {
        let tempCategory = driverInfo?.type || '';
        if (tempCategory) {
          const parts = String(tempCategory).split('-');
          let specificType = parts.length > 1 ? parts[1].toUpperCase() : parts[0].toUpperCase();
          if (parts.length > 2 && parts[2].toUpperCase() === 'LONG') {
            if (['CDE', 'CDD', 'FUSO'].includes(specificType))
              specificType = `${specificType}-LONG`;
          }
          category = specificType;
        }
      }

      category = category ? String(category).toUpperCase() : '';
      const storageType = (driverInfo?.storage || 'DRY').toUpperCase();

      if (category && basePlat) {
        const truckKey = `${category}_${storageType}_${basePlat}`;
        if (!seenTrucks.has(truckKey)) {
          seenTrucks.add(truckKey);
          if (!truckUsageCount[category]) truckUsageCount[category] = { Dry: 0, Frozen: 0 };
          if (storageType === 'FROZEN') truckUsageCount[category]['Frozen'] += 1;
          else truckUsageCount[category]['Dry'] += 1;
        }
      }
    }
  }
  return { routingMap, truckUsageCount };
}

async function parseManualDelivery(deliveryBuffers, driverData, hasPendingGR, selectedDateString) {
  const deliveryMap = new Map();
  const allTaskDataForSequence = [];
  const updateLonglatData = [];
  const hubTimesMap = new Map();

  let formattedDeliveryDate = selectedDateString;
  if (
    formattedDeliveryDate &&
    formattedDeliveryDate.includes('-') &&
    formattedDeliveryDate.split('-')[0].length === 4
  ) {
    const [y, m, d] = formattedDeliveryDate.split('-');
    formattedDeliveryDate = `${d}-${m}-${y}`;
  }

  const PENDING_SHEET_STATUSES = [...PENDING_SHEET_STATUSES_BASE];
  if (hasPendingGR) PENDING_SHEET_STATUSES.push('PENDING GR');

  const emailToDriverMap = driverData.reduce((acc, driver) => {
    const normalizedEmail = normalizeEmail(driver.email);
    if (normalizedEmail) acc[normalizedEmail] = { plat: driver.plat || null, name: driver.name };
    return acc;
  }, {});

  for (const fileBuffer of deliveryBuffers) {
    const wbInput = XLSX.read(fileBuffer, { type: 'array' });
    const targetSheetName =
      wbInput.SheetNames.find((s) => s.toLowerCase() === 'main') || wbInput.SheetNames[0];
    const rawRows = XLSX.utils.sheet_to_json(wbInput.Sheets[targetSheetName], { header: 1 });

    let headerRowIdx = -1;
    for (let i = 0; i < rawRows.length; i++) {
      if (Array.isArray(rawRows[i])) {
        const rowStr = rawRows[i].map((c) => String(c).toLowerCase().trim());
        if (rowStr.includes('_id') && rowStr.includes('flow')) {
          headerRowIdx = i;
          break;
        }
      }
    }
    if (headerRowIdx === -1) continue;

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

    for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || row.length === 0) continue;

      const rawAssignee = idxAssignee !== -1 && row[idxAssignee] ? String(row[idxAssignee]) : null;
      const flow = idxFlow !== -1 && row[idxFlow] ? String(row[idxFlow]) : '';
      const driverEmail = normalizeEmail(rawAssignee);
      const driverInfo = driverEmail ? emailToDriverMap[driverEmail] : null;
      const driverName = driverInfo?.name || driverEmail || 'N/A';

      const rawCustOrder =
        idxCustOrder !== -1 && row[idxCustOrder] ? String(row[idxCustOrder]) : '';
      const rawCustName = idxCustName !== -1 && row[idxCustName] ? String(row[idxCustName]) : '';
      const {
        name: customerName,
        id: customerId,
        location: customerLocation,
        fullCustomerName,
      } = parseCustomerString(rawCustOrder || rawCustName);
      const title = idxTitle !== -1 && row[idxTitle] ? String(row[idxTitle]) : '';
      const pickupCustomerName = `${title} (${customerName})`;

      let statusLabel =
        idxStatusDel !== -1 && row[idxStatusDel] ? String(row[idxStatusDel]).toUpperCase() : null;
      const taskStatus = idxStatus !== -1 && row[idxStatus] ? String(row[idxStatus]) : null;
      statusLabel = flow.toLowerCase() === 'pickup' && taskStatus ? 'SUKSES' : statusLabel;

      const orderId = idxOrderId !== -1 && row[idxOrderId] ? String(row[idxOrderId]) : '';
      const startTime = idxStartTime !== -1 && row[idxStartTime] ? String(row[idxStartTime]) : null;
      const doneTime = idxDoneTime !== -1 && row[idxDoneTime] ? String(row[idxDoneTime]) : null;
      const eta = idxEta !== -1 && row[idxEta] ? String(row[idxEta]) : null;
      const etd = idxEtd !== -1 && row[idxEtd] ? String(row[idxEtd]) : null;
      const routePlannedOrder =
        idxRoSeq !== -1 && row[idxRoSeq] ? parseInt(row[idxRoSeq], 10) : null;
      const typeStorage =
        idxTypeStorage !== -1 && row[idxTypeStorage] ? String(row[idxTypeStorage]) : '';

      if (driverName !== 'N/A') {
        const basePlat = getBasePlate(driverInfo?.plat) || driverInfo?.plat || '';
        const groupKey = `${driverName}_${basePlat}`;
        const stats = deliveryMap.get(groupKey) || {
          driver: driverName,
          plat: driverInfo?.plat || '-',
          totalOutlet: 0,
          failedCount: 0,
          mismatchCustomers: [],
          missingDataCustomers: [],
        };
        stats.totalOutlet += 1;
        if (FAILED_STATUSES.includes(statusLabel)) stats.failedCount += 1;

        const startDateOnly = startTime ? startTime.split(/[T\s]/)[0] : null;
        const doneDateOnly = doneTime ? doneTime.split(/[T\s]/)[0] : null;
        if (startDateOnly && doneDateOnly && startDateOnly !== doneDateOnly) {
          const parts = doneDateOnly.split('-');
          stats.mismatchCustomers.push({
            name: customerName,
            date: parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : doneDateOnly,
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
        deliveryMap.set(groupKey, stats);
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

      const openTime = `${selectedDateString} ${String(row[idxOpenTime])}`;
      const closeTime = `${selectedDateString} ${String(row[idxCloseTime])}`;
      const openTimeVal =
        idxOpenTime !== -1 && row[idxOpenTime] ? formatDateUniversal(openTime, 'HH:mm') : '-';
      const closeTimeVal =
        idxCloseTime !== -1 && row[idxCloseTime] ? formatDateUniversal(closeTime, 'HH:mm') : '-';

      const actualArrVal = formatDateUniversal(actualArrival, 'HH:mm') || '-';
      const actualDepVal = formatDateUniversal(actualDeparture, 'HH:mm') || '-';

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
        pendingGR = null,
        isMigrated = false;
      if (statusLabel === 'BATAL') fakturBatal = customerName;
      else if (statusLabel === 'TERIMA SEBAGIAN') terkirimSebagian = customerName;
      else if (statusLabel === 'PENDING') pending = customerName;
      else if (statusLabel === 'PENDING GR') {
        if (hasPendingGR) pendingGR = customerName;
        else {
          pending = customerName;
          isMigrated = true;
        }
      }

      allTaskDataForSequence.push({
        driverEmail,
        driver: driverName,
        plat: driverInfo?.plat,
        actualArrivalTimestamp: actualArrival ? new Date(actualArrival).getTime() : null,
        roSequence: isNaN(routePlannedOrder) ? null : routePlannedOrder,
        statusLabel,
        isMigrated,
        flow,
        customerName,
        fullCustomerName: fullCustomerName || customerName,
        customerId,
        locationId: customerLocation,
        fakturBatal,
        terkirimSebagian,
        pending,
        pendingGR,
        reason: idxAlasan !== -1 && row[idxAlasan] ? String(row[idxAlasan]) : '',
        openTime: openTimeVal,
        closeTime: closeTimeVal,
        eta: formatDateUniversal(`${selectedDateString} ${eta}`, 'HH:mm') || '-',
        etd: formatDateUniversal(`${selectedDateString} ${etd}`, 'HH:mm') || '-',
        actualArrival: actualArrVal,
        actualDeparture: actualDepVal,
        visitTime: idxVisitTime !== -1 && row[idxVisitTime] ? row[idxVisitTime] : null,
        actualVisitTime: calculateMinuteDifference(actualDeparture, actualArrival),
        temperature: typeStorage || getStorageType(driverName),
        orderId,
        isWithinHoursStatus: hoursStatus,
        deliveryDate: formattedDeliveryDate,
      });

      const gpsSesuai =
        idxGpsSesuai !== -1 && row[idxGpsSesuai] ? String(row[idxGpsSesuai]).toUpperCase() : '';
      const klikLokasi =
        idxKlikLokasi !== -1 && row[idxKlikLokasi] ? String(row[idxKlikLokasi]) : null;
      const expectedCoord =
        idxExpectedCoord !== -1 && row[idxExpectedCoord] ? String(row[idxExpectedCoord]) : null;

      if (gpsSesuai === 'TIDAK' && klikLokasi) {
        updateLonglatData.push({
          customerName,
          customerId,
          locationId: customerLocation,
          newLonglat: formatCoordinates(klikLokasi),
          distanceDiff: getDistance(expectedCoord, klikLokasi),
        });
      }
    }
  }

  allTaskDataForSequence.sort((a, b) => {
    if (a.driver !== b.driver) return a.driver.localeCompare(b.driver);
    return (a.actualArrivalTimestamp || Infinity) - (b.actualArrivalTimestamp || Infinity);
  });

  let currDriver = null,
    rank = 1;
  allTaskDataForSequence.forEach((row) => {
    if (row.driver !== currDriver) {
      currDriver = row.driver;
      rank = 1;
    }
    row.realSequence = row.actualArrivalTimestamp ? rank++ : null;
  });

  const pendingSOData = allTaskDataForSequence.filter(
    (r) => PENDING_SHEET_STATUSES.includes(r.statusLabel) || r.isMigrated
  );

  return { deliveryMap, hubTimesMap, allTaskDataForSequence, updateLonglatData, pendingSOData };
}

export async function generateManualReportWorkbook({
  routingBuffers,
  deliveryBuffers,
  driverData,
  timeData,
  mappingsObj,
  vehicleTypes,
  targetRoutingStr,
  selectedDateString,
  hubLabel,
  hasPendingGR,
  t,
}) {
  const wb = XLSX.utils.book_new();

  const { routingMap, truckUsageCount } = await parseManualRouting(
    routingBuffers,
    driverData,
    mappingsObj,
    vehicleTypes
  );

  const { deliveryMap, hubTimesMap, allTaskDataForSequence, updateLonglatData, pendingSOData } =
    await parseManualDelivery(deliveryBuffers, driverData, hasPendingGR, selectedDateString);

  buildRoutingDateSheet(wb, targetRoutingStr, t);
  buildTimeDriverSheet(wb, timeData, t, driverData);
  buildTruckDetailSheet(wb, driverData, routingMap, deliveryMap, t);
  buildRoVsRealSheet(wb, allTaskDataForSequence, hubTimesMap, t);
  buildTruckUsageSheet(wb, truckUsageCount, vehicleTypes, t);
  buildDistanceSummary(wb, driverData, routingMap, timeData, t);
  buildPendingSOSheet(wb, pendingSOData, hasPendingGR, t);
  buildUpdateLonglatSheet(wb, updateLonglatData, t);
  const formattedDate = formatDateUniversal(selectedDateString, 'DD.MM.YYYY');
  const excelFileName = `Manual ${t('report.daily_report')} - ${formattedDate} - ${hubLabel}.xlsx`;

  return { wb, excelFileName };
}
