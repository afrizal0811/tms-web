import { getStorageType, normalizeEmail } from '@/lib/utils';

function calculateRouteTime(route) {
  const rawVisit = route.totalVisitTime;
  const rawTravel = route.totalTravelTime;
  const rawWait = route.totalWaitingTime;
  const rawSpent = route.totalSpentTime;

  const isMissing = rawVisit == null || rawTravel == null || rawWait == null || rawSpent == null;
  const usedMinutes =
    rawSpent != null ? rawSpent : (rawVisit || 0) + (rawTravel || 0) + (rawWait || 0);

  return {
    minutes: usedMinutes,
    isMissing,
    rawData: { visit: rawVisit, travel: rawTravel, wait: rawWait, spent: rawSpent },
  };
}

function resolveDriverName(route, email, truckId, driverMap) {
  if (driverMap && driverMap[email]) {
    const entry = driverMap[email];
    return typeof entry === 'object' ? entry.name || '' : entry;
  }
  if (truckId && truckId !== 'No Plat' && driverMap) {
    const cleanTruckId = truckId.replace(/\s/g, '').toUpperCase();
    const foundEntry = Object.values(driverMap).find(
      (d) => d && d.plat && d.plat.replace(/\s/g, '').toUpperCase() === cleanTruckId
    );
    if (foundEntry) return typeof foundEntry === 'object' ? foundEntry.name || '' : foundEntry;
  }
  return route.assignee || '';
}

function calculateTripTimes(trips) {
  let sumVisit = 0;
  let sumTravel = 0;
  let sumWait = 0;
  let countedHubWait = false;

  trips.forEach((t) => {
    const isHub = String(t.isHub).toLowerCase() === 'true';
    sumVisit += Number(t.visitTime) || 0;
    sumTravel += Number(t.travelTime) || 0;

    if (isHub) {
      if (!countedHubWait) {
        sumWait += Number(t.waitingTime) || 0;
        countedHubWait = true;
      }
    } else {
      sumWait += Number(t.waitingTime) || 0;
    }
  });

  return { sumVisit, sumTravel, sumWait };
}

export function calculateGroupTwo(resultsData, driverMap, driverData = []) {
  let totalMinutesDry = 0;
  let totalMinutesFrz = 0;
  const detailRows = [];
  const processedDrivers = new Set();
  const dataRoutingExists = true;

  if (Array.isArray(resultsData)) {
    resultsData.forEach((item) => {
      const routingName = item.description || item.code || item.name || 'Unknown Routing';
      const summary = item.summary || {};

      if (item.result && Array.isArray(item.result.routing)) {
        const isSingleVehicle = item.result.routing.length === 1;

        item.result.routing.forEach((route) => {
          if (!Array.isArray(route.trips) || route.trips.length === 0) return;

          const email = normalizeEmail(route.assignee);
          const truckId = route.vehicleName || route.vehicleId || 'No Plat';
          const driverName = resolveDriverName(route, email, truckId, driverMap);
          const category = getStorageType(driverName).toUpperCase();

          if (truckId) {
            const { sumVisit, sumTravel, sumWait } = calculateTripTimes(route.trips);

            const rawVisit = sumVisit > 0 ? sumVisit : Number(route.totalVisitTime) || 0;
            const rawTravel = sumTravel > 0 ? sumTravel : Number(route.totalTravelTime) || 0;
            const rawWait = sumWait > 0 ? sumWait : Number(route.totalWaitingTime) || 0;

            let rawSpent = Number(route.totalSpentTime) || 0;
            if (isSingleVehicle && rawSpent === 0 && summary.totalSpentTime) {
              rawSpent = Number(summary.totalSpentTime);
            }
            if (rawSpent === 0 && (rawVisit > 0 || rawTravel > 0 || rawWait > 0)) {
              rawSpent = rawVisit + rawTravel + rawWait;
            }

            const routeData = {
              ...route,
              totalVisitTime: rawVisit,
              totalTravelTime: rawTravel,
              totalWaitingTime: rawWait,
              totalSpentTime: rawSpent,
            };

            const { minutes, rawData } = calculateRouteTime(routeData);

            if (minutes > 0) {
              if (category === 'DRY') totalMinutesDry += minutes;
              else if (category === 'FROZEN') totalMinutesFrz += minutes;
            }

            detailRows.push({
              routing: routingName,
              plat: truckId,
              driver: driverName,
              category,
              visit: rawData.visit,
              travel: rawData.travel,
              wait: rawData.wait,
              spent: minutes,
              isVisitMissing: rawData.visit == null,
              isTravelMissing: rawData.travel == null,
              isWaitMissing: rawData.wait == null,
              isSpentMissing: rawData.spent == null,
            });

            if (driverName) {
              processedDrivers.add(driverName.toUpperCase().trim());
            }
          }
        });
      }
    });
  }

  if (Array.isArray(driverData)) {
    driverData.forEach((d) => {
      const dName = d.name || '';
      const dPlat = d.plat || '';

      if (!dPlat || dPlat === 'No Plat' || dPlat.trim() === '') return;

      if (dName && !processedDrivers.has(dName.toUpperCase().trim())) {
        detailRows.push({
          routing: '-',
          vehicle: dPlat,
          driver: dName,
          category: getStorageType(dName),
          visit: '',
          travel: '',
          wait: '',
          spent: '',
          isVisitMissing: true,
          isTravelMissing: true,
          isWaitMissing: true,
          isSpentMissing: true,
          isNoRoutingData: true,
        });
      }
    });
  }

  return {
    opsHoursDry: Math.floor(totalMinutesDry / 60),
    opsHoursFrz: Math.floor(totalMinutesFrz / 60),
    totalMinutesDry,
    totalMinutesFrz,
    detailRows,
    dataRoutingExists,
  };
}
