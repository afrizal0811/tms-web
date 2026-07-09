// File: groupTwo.js
import { getStorageType, normalizeEmail } from '@/lib/utils';

function calculateRouteTime(route) {
  const rawVisit = route.totalVisitTime;
  const rawTravel = route.totalTravelTime;
  const rawWait = route.totalWaitingTime;
  const rawSpent = route.totalSpentTime;
  const isVisitMissing = rawVisit === undefined || rawVisit === null;
  const isTravelMissing = rawTravel === undefined || rawTravel === null;
  const isWaitMissing = rawWait === undefined || rawWait === null;
  const isSpentMissing = rawSpent === undefined || rawSpent === null;
  let usedMinutes = 0;
  if (!isSpentMissing) {
    usedMinutes = rawSpent;
  } else {
    usedMinutes = (rawVisit || 0) + (rawTravel || 0) + (rawWait || 0);
  }
  return {
    minutes: usedMinutes,
    isMissing: isVisitMissing || isTravelMissing || isWaitMissing || isSpentMissing,
    rawData: { visit: rawVisit, travel: rawTravel, wait: rawWait, spent: rawSpent },
  };
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

          let driverName = '';
          if (driverMap && driverMap[email]) {
            const entry = driverMap[email];
            driverName = typeof entry === 'object' ? entry.name || '' : entry;
          }
          if (!driverName && truckId && truckId !== 'No Plat' && driverMap) {
            const cleanTruckId = truckId.replace(/\s/g, '').toUpperCase();
            const foundEntry = Object.values(driverMap).find((d) => {
              if (d && d.plat) return d.plat.replace(/\s/g, '').toUpperCase() === cleanTruckId;
              return false;
            });
            if (foundEntry)
              driverName = typeof foundEntry === 'object' ? foundEntry.name || '' : foundEntry;
          }
          if (!driverName) driverName = route.assignee || '';

          const category = getStorageType(driverName).toUpperCase();

          if (truckId) {
            let routeData = { ...route };

            let sumVisit = 0;
            let sumTravel = 0;
            let sumWait = 0;
            let countedHubWait = false;

            routeData.trips.forEach((t) => {
              const isHub = t.isHub === true || String(t.isHub).toLowerCase() === 'true';

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

            let rawVisit =
              sumVisit > 0
                ? sumVisit
                : routeData.totalVisitTime !== undefined
                  ? Number(routeData.totalVisitTime)
                  : 0;
            let rawTravel =
              sumTravel > 0
                ? sumTravel
                : routeData.totalTravelTime !== undefined
                  ? Number(routeData.totalTravelTime)
                  : 0;
            let rawWait =
              sumWait > 0
                ? sumWait
                : routeData.totalWaitingTime !== undefined
                  ? Number(routeData.totalWaitingTime)
                  : 0;

            let rawSpent = Number(routeData.totalSpentTime) || 0;

            if (isSingleVehicle) {
              if (rawSpent === 0 && summary.totalSpentTime) {
                rawSpent = Number(summary.totalSpentTime);
              }
            }

            if (rawSpent === 0 && (rawVisit > 0 || rawTravel > 0 || rawWait > 0)) {
              rawSpent = rawVisit + rawTravel + rawWait;
            }

            routeData.totalVisitTime = rawVisit;
            routeData.totalTravelTime = rawTravel;
            routeData.totalWaitingTime = rawWait;
            routeData.totalSpentTime = rawSpent;

            const { minutes, rawData } = calculateRouteTime(routeData);

            if (minutes > 0) {
              if (category === 'DRY') {
                totalMinutesDry += minutes;
              } else if (category === 'FROZEN') {
                totalMinutesFrz += minutes;
              }
            }

            detailRows.push({
              routing: routingName,
              plat: truckId,
              driver: driverName,
              category: category,
              visit: rawData.visit,
              travel: rawData.travel,
              wait: rawData.wait,
              spent: minutes,
              isVisitMissing: rawData.visit === undefined || rawData.visit === null,
              isTravelMissing: rawData.travel === undefined || rawData.travel === null,
              isWaitMissing: rawData.wait === undefined || rawData.wait === null,
              isSpentMissing: rawData.spent === undefined || rawData.spent === null,
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

      if (!dPlat || dPlat === 'No Plat' || dPlat.trim() === '') {
        return;
      }

      const dNameUpper = dName.toUpperCase().trim();

      if (dName && !processedDrivers.has(dNameUpper)) {
        const cat = getStorageType(dName);
        detailRows.push({
          routing: '-',
          vehicle: dPlat,
          driver: dName,
          category: cat,
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

  const opsHoursDry = Math.floor(totalMinutesDry / 60);
  const opsHoursFrz = Math.floor(totalMinutesFrz / 60);

  return {
    opsHoursDry,
    opsHoursFrz,
    totalMinutesDry,
    totalMinutesFrz,
    detailRows,
    dataRoutingExists,
  };
}
