import { routingActual } from '@/lib/routingActual';
import {
  formatCoordinates,
  formatDateUniversal,
  formatUTC7,
  getBasePlate,
  getDistance,
  isEmpty,
  normalizeEmail,
} from '@/lib/utils';
import {
  buildDriverMaps,
  buildNormalizedMappings,
  FAILED_STATUSES,
  PENDING_SHEET_STATUSES_BASE,
} from './help';

const getTaskPlat = (item) =>
  item?.vehicleName ||
  item?.vehiclePlat ||
  item?.licenseNumber ||
  item?.licensePlate ||
  item?.vehicleId ||
  item?.vehicle_name ||
  item?.vehicle_plate ||
  item?.plate_number ||
  item?.plat_nomor ||
  (typeof item?.vehicle === 'string' ? item.vehicle : null) ||
  item?.assignedVehicle?.name ||
  item?.assignedVehicle?.plat ||
  item?.plat ||
  item?.nopol ||
  '';

const matchNormalizedCategory = (originalStr, baseStr, normalizedMappings) => {
  const dbKeys = Object.keys(normalizedMappings);
  if (baseStr && normalizedMappings[baseStr]) return normalizedMappings[baseStr];
  if (originalStr && normalizedMappings[originalStr]) return normalizedMappings[originalStr];

  for (const targetStr of [originalStr, baseStr]) {
    if (!targetStr) continue;
    for (const dbKey of dbKeys) {
      if (dbKey.length > 3 && (targetStr.includes(dbKey) || dbKey.includes(targetStr))) {
        return normalizedMappings[dbKey];
      }
    }
  }
  return '';
};

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
  const seenTrucks = new Set();

  driverData.forEach((d) => {
    const basePlateStr = (d?.plat || '').replace(/\s+/g, '').toLowerCase();
    let cat = matchNormalizedCategory(basePlateStr, basePlateStr, normalizedMappings);
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

  function resolveVehicleCategory(driverInfo, route) {
    const basePlateStr = (driverInfo?.plat || '').replace(/\s+/g, '').toLowerCase();
    const originalRawStr = (route.vehicleName || '').replace(/\s+/g, '').toLowerCase();
    let category = matchNormalizedCategory(originalRawStr, basePlateStr, normalizedMappings);

    if (!category) {
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

      const rawPlat = getTaskPlat(route) || driverInfo?.plat || '';
      const basePlat = getBasePlate(rawPlat) || rawPlat;
      const groupKey = `${driverName}_${basePlat}`;
      const hasTrips = Array.isArray(route.trips) && route.trips.length > 0;

      let etdHubVal = '-';
      let etaFirstStoreVal = '-';
      let manualDistance = 0,
        manualTravelTime = 0,
        manualVisitTime = 0,
        manualWaitTime = 0;

      if (hasTrips) {
        const hubTrip = route.trips.find((t) => t.isHub);
        if (hubTrip?.etd)
          etdHubVal = formatDateUniversal(`${selectedDateString} ${hubTrip.etd}`, 'HH:mm');
        else if (route.trips[0]?.etd)
          etdHubVal = formatDateUniversal(`${selectedDateString} ${route.trips[0].etd}`, 'HH:mm');

        const firstStore = route.trips.find((t) => !t.isHub);
        if (firstStore?.eta)
          etaFirstStoreVal = formatDateUniversal(
            `${selectedDateString} ${firstStore.eta}`,
            'HH:mm'
          );

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
        driver: driverName,
        plat: rawPlat || driverInfo?.plat || '-',
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

      if (!routingMap.has(groupKey)) {
        routingMap.set(groupKey, row);
      } else {
        const ext = routingMap.get(groupKey);
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
        if (generalType === 'FROZEN') distanceTotals.frozen += fDist;
        else distanceTotals.dry += fDist;

        if (category && basePlat) {
          const truckKey = `${category}_${generalType}_${basePlat}`;
          if (!seenTrucks.has(truckKey)) {
            seenTrucks.add(truckKey);
            if (!truckUsageCount[category]) truckUsageCount[category] = { Dry: 0, Frozen: 0 };
            if (generalType === 'FROZEN') truckUsageCount[category]['Frozen'] += 1;
            else truckUsageCount[category]['Dry'] += 1;
          }
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

  Array.from(uniqueTasksMap.values()).forEach((task) => {
    const dateKey =
      formatUTC7(task.startTime, 'YYYY-MM-DD') || formatUTC7(task.doneTime, 'YYYY-MM-DD');
    if (selectedDateString && dateKey !== selectedDateString) return;

    let rawEmail = null;
    if (Array.isArray(task.assignee) && task.assignee.length > 0) rawEmail = task.assignee[0];
    else if (typeof task.assignee === 'string') rawEmail = task.assignee;
    else if (task.assignedTo?.email) rawEmail = task.assignedTo.email;
    else if (task.doneBy) rawEmail = task.doneBy;

    const assigneeEmail = rawEmail ? String(rawEmail).trim().toLowerCase() : '';
    const driverInfo = emailMap.get(assigneeEmail);
    const driverName = driverInfo ? driverInfo.name : rawEmail || 'N/A';
    const taskW = Math.abs(Number(task.weightKg) || 0);
    const taskV = Math.abs(Number(task.volumeCbm) || 0);

    if (driverName !== 'N/A') {
      const taskPlat = getTaskPlat(task) || driverInfo?.plat || '';
      const basePlat = getBasePlate(taskPlat) || taskPlat;
      const groupKey = `${driverName}_${basePlat}`;

      if (!routingMap.has(groupKey)) {
        const masterData = driverData.find((d) => normalizeEmail(d.email) === assigneeEmail);
        routingMap.set(groupKey, {
          driver: driverName,
          plat: taskPlat || masterData?.plat || '-',
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

      const ext = routingMap.get(groupKey);
      ext.hasTrips = true;
      ext.rawWeight += taskW;
      ext.rawVolume += taskV;
      ext.weightPercentage =
        ext.maxWeight > 0 ? ((ext.rawWeight / ext.maxWeight) * 100).toFixed(1) : 0;
      ext.volumePercentage =
        ext.maxVolume > 0 ? ((ext.rawVolume / ext.maxVolume) * 100).toFixed(1) : 0;
    }
  });

  for (const [key, ext] of routingMap.entries()) {
    if (ext.rawWeight === 0 && ext.rawVolume === 0) routingMap.delete(key);
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
            const routePlat =
              getTaskPlat(r) || emailToDriverMap[normalizeEmail(r.assignee)]?.plat || '';
            const routeBasePlat = getBasePlate(routePlat) || routePlat;
            const hubTrips = (r.trips || []).filter((t) => t.isHub);
            if (hubTrips.length > 0) {
              const timesObj = {
                hubETD: formatDateUniversal(`${selectedDateString} ${hubTrips[0].etd}`, 'HH:mm'),
                hubETA: formatDateUniversal(
                  `${selectedDateString} ${hubTrips[hubTrips.length - 1].eta}`,
                  'HH:mm'
                ),
              };
              hubTimesMap.set(dName, timesObj);
              if (routeBasePlat) hubTimesMap.set(`${dName}_${routeBasePlat}`, timesObj);
            }
          });
        }
      });
  }

  const deliveryMap = new Map();
  const updateLonglatData = [];
  const PENDING_STATUSES = [...PENDING_SHEET_STATUSES_BASE];
  if (hasPendingGR) PENDING_STATUSES.push('PENDING GR');

  const [y, m, d] = selectedDateString.split('-');
  const formattedDeliveryDate = `${d}-${m}-${y}`;

  const baseSequence = routingActual({
    tasks: allTasks,
    drivers: driverData,
    dateStr: selectedDateString,
  });

  const allTaskDataForSequence = baseSequence.map((row) => {
    const task = row.rawTask;
    const driverName = row.driver;
    const statusLabel = row.statusLabel;
    const flow = row.flow;
    const cName = row.customerName;

    if (driverName !== 'N/A') {
      const groupKey = row.groupKey || `${driverName}_${getBasePlate(row.plat) || row.plat || ''}`;
      const stats = deliveryMap.get(groupKey) || {
        driver: driverName,
        plat: row.plat || '-',
        totalOutlet: 0,
        failedCount: 0,
        mismatchCustomers: [],
        missingDataCustomers: [],
        hasSplitTask: false,
      };
      stats.totalOutlet += 1;
      if (FAILED_STATUSES.includes(statusLabel) || isEmpty(statusLabel)) stats.failedCount += 1;
      if (task.isSplitTask === 'true' || task.isSplitTask === true) stats.hasSplitTask = true;

      const startDate = formatUTC7(task.startTime, 'YYYY-MM-DD');
      const doneDate = formatUTC7(task.doneTime, 'YYYY-MM-DD');
      if (startDate && doneDate && startDate !== doneDate) {
        stats.mismatchCustomers.push({ name: cName, date: doneDate });
      }
      if (!task.eta || !task.etd || !task.routePlannedOrder) {
        const pickupCName = `${task.title} (${cName})`;
        stats.missingDataCustomers.push({ name: flow === 'Pickup' ? pickupCName : cName });
      }
      deliveryMap.set(groupKey, stats);
    }

    if (task.klikLokasiClient) {
      updateLonglatData.push({
        customerName: cName,
        customerId: row.customerId,
        locationId: row.locationId,
        newLonglat: formatCoordinates(task.klikLokasiClient),
        distanceDiff: getDistance(task.longlat, task.klikLokasiClient),
      });
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

    return {
      ...row,
      isMigrated,
      fakturBatal: statusLabel === 'BATAL' ? cName : null,
      terkirimSebagian: statusLabel === 'TERIMA SEBAGIAN' ? cName : null,
      pending,
      pendingGR,
      deliveryDate: formattedDeliveryDate,
    };
  });

  const pendingSOData = allTaskDataForSequence.filter(
    (row) => PENDING_STATUSES.includes(row.statusLabel) || row.isMigrated
  );

  return { deliveryMap, hubTimesMap, allTaskDataForSequence, updateLonglatData, pendingSOData };
}
