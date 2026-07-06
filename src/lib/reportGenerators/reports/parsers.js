import {
  calculateHaversineDistance,
  calculateMinuteDifference,
  extractTempFromDriverName,
  formatCoordinates,
  formatSimpleTime,
  formatTimestampToHHMM,
  getUTC7DateString,
  isEmpty,
  normalizeEmail,
  parseCustomerString,
} from '@/lib/utils';
import {
  buildDriverMaps,
  buildNormalizedMappings,
  FAILED_STATUSES,
  PENDING_SHEET_STATUSES_BASE,
} from './help';

export function parseRoutingData(
  filteredResults,
  driverData,
  mappingsObj,
  vehicleTypes,
  allTasks,
  selectedDateString
) {
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
      let manualDistance = 0,
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
            manualVisitTime += t.visitTime || 0;
            manualWaitTime += t.waitingTime || 0;
          }
          manualDistance += Number(t.distance) || 0;
          manualTravelTime += Number(t.travelTime) || 0;
        });
      }

      const fDist = manualDistance || route.totalDistance || 0;
      const fSpent =
        manualTravelTime + manualVisitTime + manualWaitTime || route.totalSpentTime || 0;

      const row = {
        hasTrips,
        weightPercentage: 0,
        volumePercentage: 0,
        totalDistance: fDist,
        shipDurationRaw: fSpent,
        etaFirstStore: etaFirstStoreVal,
        etdHub: etdHubVal,
        rawWeight: 0,
        maxWeight: driverInfo?.maxWeight || route.vehicleMaxWeight || 0,
        rawVolume: 0,
        maxVolume: driverInfo?.maxVolume || route.vehicleMaxVolume || 0,
      };

      if (!routingMap.has(driverName)) {
        routingMap.set(driverName, row);
      } else {
        const ext = routingMap.get(driverName);
        ext.hasTrips = ext.hasTrips || row.hasTrips;
        ext.rawWeight = 0;
        ext.rawVolume = 0;

        ext.maxWeight = Math.max(ext.maxWeight, row.maxWeight);
        ext.maxVolume = Math.max(ext.maxVolume, row.maxVolume);
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

  const uniqueTasksMap = new Map();
  if (allTasks && Array.isArray(allTasks)) {
    allTasks.forEach((task) => {
      const id = task._id || task.id || task.taskId;
      if (id) {
        uniqueTasksMap.set(id, task);
      } else {
        const fallbackKey = `${task.customerOrder || task.content || ''}_${task.flow || ''}_${task.doneTime || task.startTime || ''}`;
        uniqueTasksMap.set(fallbackKey, task);
      }
    });
  }
  const cleanTasks = Array.from(uniqueTasksMap.values());

  cleanTasks.forEach((task) => {
    const dateKey = getUTC7DateString(task.startTime) || getUTC7DateString(task.doneTime);

    if (selectedDateString && dateKey !== selectedDateString) return;
    const isManual = !task.eta || !task.etd || !task.routePlannedOrder;

    let rawEmail = null;
    if (Array.isArray(task.assignee) && task.assignee.length > 0) {
      rawEmail = task.assignee[0];
    } else if (typeof task.assignee === 'string') {
      rawEmail = task.assignee;
    } else if (task.assignedTo && task.assignedTo.email) {
      rawEmail = task.assignedTo.email;
    } else if (task.doneBy) {
      rawEmail = task.doneBy;
    }

    const assigneeEmail = rawEmail ? String(rawEmail).trim().toLowerCase() : '';
    const driverInfo = emailMap.get(assigneeEmail);
    const driverName = driverInfo ? driverInfo.name : rawEmail || 'N/A';
    const taskW = Math.abs(Number(task.weightKg) || 0);
    const taskV = Math.abs(Number(task.volumeCbm) || 0);

    if (driverName !== 'N/A') {
      if (!routingMap.has(driverName)) {
        const masterData = driverData.find((d) => normalizeEmail(d.email) === assigneeEmail);

        routingMap.set(driverName, {
          hasTrips: true,
          weightPercentage: 0,
          volumePercentage: 0,
          totalDistance: 0,
          shipDurationRaw: 0,
          etaFirstStore: '-',
          etdHub: '-',
          rawWeight: 0,
          maxWeight: masterData?.maxWeight || 0,
          rawVolume: 0,
          maxVolume: masterData?.maxVolume || 0,
        });
      }

      const ext = routingMap.get(driverName);
      ext.hasTrips = true;
      ext.rawWeight += taskW;
      ext.rawVolume += taskV;

      ext.weightPercentage =
        ext.maxWeight > 0 ? ((ext.rawWeight / ext.maxWeight) * 100).toFixed(1) : 0;
      ext.volumePercentage =
        ext.maxVolume > 0 ? ((ext.rawVolume / ext.maxVolume) * 100).toFixed(1) : 0;
    }
  });
  for (const [dName, ext] of routingMap.entries()) {
    if (ext.rawWeight === 0 && ext.rawVolume === 0) {
      routingMap.delete(dName);
    }
  }

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
        hasSplitTask: false,
      };
      stats.totalOutlet += 1;
      if (FAILED_STATUSES.includes(statusLabel) || isEmpty(statusLabel)) stats.failedCount += 1;
      if (task.isSplitTask === 'true' || task.isSplitTask === true) stats.hasSplitTask = true;

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
