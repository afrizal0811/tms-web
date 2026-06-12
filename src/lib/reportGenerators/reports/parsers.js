import { isTripInShift } from '@/lib/reportGenerators/isTripInShift';
import {
  calculateHaversineDistance,
  calculateMinuteDifference,
  extractTempFromDriverName,
  formatCoordinates,
  formatSimpleTime,
  formatTimestampToDDMMYYYY_UTC7,
  formatTimestampToHHMM,
  formatTimestampToQuotedHHMM_UTC7,
  getBasePlate,
  getUTC7DateString,
  normalizeEmail,
  parseCustomerString,
} from '@/lib/utils';
import {
  buildDriverMaps,
  buildNormalizedMappings,
  FAILED_STATUSES,
  PENDING_SHEET_STATUSES_BASE,
} from './help';

export function parseRoutingData(filteredResults, driverData, mappingsObj, vehicleTypes) {
  const { emailMap, platMap } = buildDriverMaps(driverData);
  const normalizedMappings = buildNormalizedMappings(mappingsObj);
  const routingMap = new Map();
  const truckUsageCount = {};
  const distanceTotals = { dry: 0, frozen: 0 };

  vehicleTypes.forEach((v) => {
    const typeName = typeof v === 'string' ? v : v.name;
    truckUsageCount[String(typeName).toUpperCase()] = { Dry: 0, Frozen: 0 };
  });

  function resolveVehicleCategory(driverInfo, route) {
    const basePlateStr = (driverInfo?.plat || '').replace(/\s+/g, '').toLowerCase();
    const originalRawStr = (route.vehicleName || '').replace(/\s+/g, '').toLowerCase();
    const dbKeys = Object.keys(normalizedMappings);

    let category = '';
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
          if (dbKey.length > 3 && (basePlateStr.includes(dbKey) || dbKey.includes(basePlateStr))) {
            category = normalizedMappings[dbKey];
            mapped = true;
            break;
          }
        }
      }
    }

    if (!mapped) {
      const tempCategory = driverInfo?.type || route.vehicleTags?.[0] || '';
      if (tempCategory) {
        const parts = String(tempCategory).split('-');
        let specificType = parts.length > 1 ? parts[1].toUpperCase() : parts[0].toUpperCase();
        if (parts.length > 2 && parts[2].toUpperCase() === 'LONG') {
          if (['CDE', 'CDD', 'FUSO'].includes(specificType)) specificType = `${specificType}-LONG`;
        }
        category = specificType;
      }
    }
    return category ? String(category).toUpperCase() : '';
  }

  filteredResults.forEach((resultItem) => {
    if (!resultItem.result || !Array.isArray(resultItem.result.routing)) return;
    resultItem.result.routing.forEach((route) => {
      const assigneeEmail = route.assignee ? String(route.assignee).trim().toLowerCase() : '';
      const vehiclePlatNorm = route.vehicleName
        ? String(route.vehicleName).replace(/\s+/g, '').toLowerCase()
        : '';
      const driverInfo = emailMap.get(assigneeEmail) || platMap.get(vehiclePlatNorm);
      const driverName = driverInfo ? driverInfo.name : route.assignee || route.vehicleName;

      if (!driverName) return;

      const hasTrips = Array.isArray(route.trips) && route.trips.length > 0;
      let etdHubVal = '-';
      let etaFirstStoreVal = '-';
      let manualWeight = 0,
        manualVolume = 0,
        manualDistance = 0,
        manualTravelTime = 0,
        manualVisitTime = 0,
        manualWaitTime = 0;

      if (hasTrips) {
        const hubTrip = route.trips.find((t) => t.isHub);
        if (hubTrip?.etd) etdHubVal = formatSimpleTime(hubTrip.etd);
        else if (route.trips[0]?.etd) etdHubVal = formatSimpleTime(route.trips[0].etd);

        const firstStore = route.trips.find((t) => !t.isHub);
        if (firstStore?.eta) etaFirstStoreVal = formatSimpleTime(firstStore.eta);

        const hubTrips = route.trips.filter((t) => t.isHub);
        const maxHubWaitTime = hubTrips.length
          ? Math.max(...hubTrips.map((t) => t.waitingTime || 0))
          : 0;
        manualWaitTime += maxHubWaitTime;

        route.trips.forEach((t) => {
          if (!t.isHub) {
            manualWeight += t.weight || 0;
            manualVolume += t.volume || 0;
            manualVisitTime += t.visitTime || 0;
            manualWaitTime += t.waitingTime || 0;
          }
          manualDistance += t.distance || 0;
          manualTravelTime += t.travelTime || 0;
        });
      }
      const fWeight = manualWeight || route.totalWeight || 0;
      const fVolume = manualVolume || route.totalVolume || 0;
      const fDist = manualDistance || route.totalDistance || 0;
      const fSpent =
        manualTravelTime + manualVisitTime + manualWaitTime || route.totalSpentTime || 0;
      const maxWeight = route.vehicleMaxWeight || 0;
      const maxVolume = route.vehicleMaxVolume || 0;
      const weightPct = maxWeight > 0 ? ((fWeight / maxWeight) * 100).toFixed(1) : 0;
      const volumePct = maxVolume > 0 ? ((fVolume / maxVolume) * 100).toFixed(1) : 0;

      const row = {
        hasTrips,
        weightPercentage: weightPct,
        volumePercentage: volumePct,
        totalDistance: fDist,
        shipDurationRaw: fSpent,
        etaFirstStore: etaFirstStoreVal,
        etdHub: etdHubVal,
      };

      if (!routingMap.has(driverName)) {
        routingMap.set(driverName, row);
      } else {
        const ext = routingMap.get(driverName);
        ext.hasTrips = ext.hasTrips || row.hasTrips;
        ext.weightPercentage = Math.max(ext.weightPercentage, row.weightPercentage);
        ext.volumePercentage = Math.max(ext.volumePercentage, row.volumePercentage);
        ext.totalDistance = Math.max(ext.totalDistance, row.totalDistance);
        ext.shipDurationRaw = Math.max(ext.shipDurationRaw, row.shipDurationRaw);
        ext.etaFirstStore = ext.etaFirstStore !== '-' ? ext.etaFirstStore : row.etaFirstStore;
        ext.etdHub = ext.etdHub !== '-' ? ext.etdHub : row.etdHub;
      }

      if (hasTrips) {
        const category = resolveVehicleCategory(driverInfo, route);
        let generalType = 'DRY';
        if (route.vehicleTags && route.vehicleTags.length > 0) {
          generalType = String(route.vehicleTags[0]).split('-')[0].toUpperCase();
        } else if (driverInfo && driverInfo.type) {
          generalType = String(driverInfo.type).split('-')[0].toUpperCase();
        }
        if (!['DRY', 'FROZEN'].includes(generalType)) generalType = 'DRY';

        if (generalType === 'FROZEN') distanceTotals.frozen += fDist;
        else distanceTotals.dry += fDist;

        if (category) {
          if (!truckUsageCount[category]) truckUsageCount[category] = { Dry: 0, Frozen: 0 };
          if (generalType === 'FROZEN') truckUsageCount[category]['Frozen'] += 1;
          else truckUsageCount[category]['Dry'] += 1;
        }
      }
    });
  });

  return { routingMap, distanceTotals, truckUsageCount };
}

export function parseDeliveryData(
  allTasks,
  driverData,
  resultsData,
  hasPendingGR,
  selectedDateString
) {
  const emailToDriverMap = driverData.reduce((acc, d) => {
    const e = normalizeEmail(d.email);
    if (e) acc[e] = { plat: d.plat || null, name: d.name };
    return acc;
  }, {});

  const hubTimesMap = new Map();
  if (resultsData) {
    resultsData
      .filter((i) => String(i.dispatchStatus).toLowerCase() === 'done')
      .forEach((res) => {
        if (Array.isArray(res.result?.routing)) {
          res.result.routing.forEach((r) => {
            const dName = emailToDriverMap[normalizeEmail(r.assignee)]?.name || r.assignee || 'N/A';
            const hubTrips = (r.trips || []).filter((t) => t.isHub);
            if (hubTrips.length > 0) {
              hubTimesMap.set(dName, {
                hubETD: formatSimpleTime(hubTrips[0].etd),
                hubETA: formatSimpleTime(hubTrips[hubTrips.length - 1].eta),
              });
            }
          });
        }
      });
  }

  const deliveryMap = new Map();
  const allTaskDataForSequence = [];
  const updateLonglatData = [];
  const PENDING_STATUSES = [...PENDING_SHEET_STATUSES_BASE];
  if (hasPendingGR) PENDING_STATUSES.push('PENDING GR');

  const [y, m, d] = selectedDateString.split('-');
  const formattedDeliveryDate = `${d}-${m}-${y}`;

  allTasks.forEach((task) => {
    const emailStr =
      Array.isArray(task.assignee) && task.assignee.length > 0 ? task.assignee[0] : null;
    const flow = task.flow;
    const driverEmail = normalizeEmail(emailStr);
    const driverInfo = driverEmail ? emailToDriverMap[driverEmail] : null;
    const driverName = driverInfo?.name || driverEmail || 'N/A';

    let statusLabel = task.statusDelivery?.length > 0 ? task.statusDelivery[0].toUpperCase() : null;
    statusLabel = flow === 'Pickup' && task.status ? 'SUKSES' : statusLabel;

    const {
      name: cName,
      id: cId,
      location: cLoc,
    } = parseCustomerString(task.customerOrder || task.customerName);
    const pickupCName = `${task.title} (${cName})`;

    if (driverName !== 'N/A') {
      const stats = deliveryMap.get(driverName) || {
        totalOutlet: 0,
        failedCount: 0,
        mismatchCustomers: [],
        missingDataCustomers: [],
      };
      stats.totalOutlet += 1;
      if (FAILED_STATUSES.includes(statusLabel)) stats.failedCount += 1;

      const startDate = getUTC7DateString(task.startTime);
      const doneDate = getUTC7DateString(task.doneTime);
      if (startDate && doneDate && startDate !== doneDate) {
        stats.mismatchCustomers.push({ name: cName, date: doneDate });
      }
      if (!task.eta || !task.etd || !task.routePlannedOrder) {
        stats.missingDataCustomers.push({ name: flow === 'Pickup' ? pickupCName : cName });
      }
      deliveryMap.set(driverName, stats);
    }

    const actualArrival =
      flow?.toUpperCase().includes('GR') || flow?.toUpperCase().includes('PICKUP')
        ? task.page1DoneTime
        : task.klikJikaSudahSampai;
    const actualDeparture =
      flow?.toUpperCase().includes('GR') || flow?.toUpperCase().includes('PICKUP')
        ? task.page1DoneTime
        : task.page3DoneTime;
    const actualArrVal = formatTimestampToHHMM(actualArrival) || '-';
    const openTimeVal = formatSimpleTime(task.openTime) || '-';
    const closeTimeVal = formatSimpleTime(task.closeTime) || '-';

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

    let isMigrated = false,
      pending = null,
      pendingGR = null;
    if (statusLabel === 'PENDING') pending = cName;
    else if (statusLabel === 'PENDING GR') {
      if (hasPendingGR) pendingGR = cName;
      else {
        pending = cName;
        isMigrated = true;
      }
    }

    allTaskDataForSequence.push({
      driverEmail,
      driver: driverName,
      plat: driverInfo?.plat,
      actualArrivalTimestamp: actualArrival ? new Date(actualArrival).getTime() : null,
      roSequence: task.routePlannedOrder || 0,
      statusLabel,
      isMigrated,
      flow,
      customerName: cName,
      customerId: cId,
      locationId: cLoc,
      fakturBatal: statusLabel === 'BATAL' ? cName : null,
      terkirimSebagian: statusLabel === 'TERIMA SEBAGIAN' ? cName : null,
      pending,
      pendingGR,
      reason: task.alasan,
      openTime: openTimeVal,
      closeTime: closeTimeVal,
      eta: formatSimpleTime(task.eta) || '-',
      etd: formatSimpleTime(task.etd) || '-',
      actualArrival: actualArrVal,
      actualDeparture: formatTimestampToHHMM(actualDeparture) || '-',
      visitTime: task.visitTime,
      actualVisitTime: calculateMinuteDifference(actualDeparture, actualArrival),
      temperature: extractTempFromDriverName(driverName),
      realSequence: 0,
      orderId: task.orderId || '',
      isWithinHoursStatus: hoursStatus,
      deliveryDate: formattedDeliveryDate,
    });

    if (task.klikLokasiClient) {
      updateLonglatData.push({
        customerName: cName,
        customerId: cId,
        locationId: cLoc,
        newLonglat: formatCoordinates(task.klikLokasiClient),
        bedaJarak: calculateHaversineDistance(task.longlat, task.klikLokasiClient),
      });
    }
  });

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
    (row) => PENDING_STATUSES.includes(row.statusLabel) || row.isMigrated
  );

  return { deliveryMap, hubTimesMap, allTaskDataForSequence, updateLonglatData, pendingSOData };
}

export function parseTimeData(allApiData, driverData, selectedDateString) {
  const emailToDriverMap = driverData.reduce((acc, d) => {
    const e = normalizeEmail(d.email);
    if (e) acc[e] = { plat: d.plat, name: d.name, workingTime: d.workingTime };
    return acc;
  }, {});

  const [y, m, d] = selectedDateString.split('-');
  const targetDateFormatted = `${d}-${m}-${y}`;

  const processed = allApiData
    .map((item) => {
      const email = normalizeEmail(item.email);
      const dInfo = emailToDriverMap[email];
      return {
        email,
        emailExists: !!dInfo,
        plat: dInfo?.plat,
        driver: dInfo?.name || email,
        workingTime: dInfo?.workingTime,
        trackedTime: Math.abs(item.trackedTime || 0),
        totalDistance: item.finish?.totalDistance || 0,
        startDate: formatTimestampToDDMMYYYY_UTC7(item.startTime),
        rawStart: item.startTime,
        rawFinish: item.finish?.finishTime,
        travelTimeVal: item.finish?.totalDuration || 0,
        startTimeFmt: formatTimestampToQuotedHHMM_UTC7(item.startTime),
        finishDateFmt: formatTimestampToDDMMYYYY_UTC7(item.finish?.finishTime),
        finishTimeFmt: formatTimestampToQuotedHHMM_UTC7(item.finish?.finishTime),
      };
    })
    .filter(
      (i) =>
        i.trackedTime >= 10 &&
        i.totalDistance > 5 &&
        i.emailExists &&
        i.startDate === targetDateFormatted
    );

  const grouped = {};
  processed.forEach((i) => {
    if (!grouped[i.email]) grouped[i.email] = [];
    grouped[i.email].push(i);
  });

  const timeDataObjects = [];
  const seenEmails = new Set();
  const uniqueDrivers = driverData.filter((d) => {
    if (d.plat?.toUpperCase().includes('DEMO')) return false;
    const e = normalizeEmail(d.email);
    if (!e || seenEmails.has(e)) return false;
    seenEmails.add(e);
    return true;
  });

  uniqueDrivers.forEach((driver) => {
    const email = normalizeEmail(driver.email);
    const records = grouped[email];
    const cleanPlat = getBasePlate(driver.plat);
    const emptyRow = {
      plat: cleanPlat,
      driver: driver.name,
      startDate: null,
      startTimeFmt: null,
      finishDateFmt: null,
      finishTimeFmt: null,
      travelTimeVal: null,
      totalDistance: null,
      isMultiple: false,
    };

    if (records && records.length > 0) {
      const uniques = records.filter(
        (v, idx, self) =>
          idx === self.findIndex((t) => t.rawStart === v.rawStart && t.rawFinish === v.rawFinish)
      );
      if (uniques.length === 1) {
        timeDataObjects.push({
          ...uniques[0],
          plat: cleanPlat,
          driver: driver.name,
          isMultiple: false,
        });
        return;
      }
      const filtered = uniques.filter((r) => isTripInShift(r.rawStart, r.rawFinish, r.workingTime));
      if (filtered.length > 0) {
        filtered.sort(
          (a, b) => new Date(a.rawStart.replace(' ', 'T')) - new Date(b.rawStart.replace(' ', 'T'))
        );
        filtered.forEach((r) =>
          timeDataObjects.push({
            ...r,
            plat: cleanPlat,
            driver: driver.name,
            isMultiple: filtered.length > 1,
          })
        );
      } else {
        timeDataObjects.push(emptyRow);
      }
    } else {
      timeDataObjects.push(emptyRow);
    }
  });

  return { timeDataObjects };
}
