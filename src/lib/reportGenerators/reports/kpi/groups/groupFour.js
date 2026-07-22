import { getStorageType, normalizeEmail } from '@/lib/utils';

const safeAdd = (a, b) => Number(a || 0) + Number(b || 0);
const safeNum = (n) => Number(n || 0);
const fmt = (n) => (isNaN(Number(n)) ? 0 : Number(Number(n).toFixed(1)));

export function calculateGroupFour(resultsData, historiesData, driverData) {
  const driverInfoMap = (Array.isArray(driverData) ? driverData : []).reduce((acc, d) => {
    const email = normalizeEmail(d.email);
    if (email) {
      acc[email] = {
        name: d.name || '',
        maxWeight: safeNum(d.maxWeight),
        maxVolume: safeNum(d.maxVolume),
      };
    }
    return acc;
  }, {});

  let actDistDry = 0,
    actDistFrz = 0;

  if (Array.isArray(historiesData)) {
    historiesData.forEach((h) => {
      const email = normalizeEmail(h.email);
      const driverName = driverInfoMap[email]?.name || '';
      const category = getStorageType(driverName).toUpperCase();
      const dist = safeNum(h.finish?.totalDistance ?? h.totalDistance ?? 0);

      if (category === 'DRY') actDistDry = safeAdd(actDistDry, dist);
      else if (category === 'FROZEN') actDistFrz = safeAdd(actDistFrz, dist);
    });
  }

  let capWeightDry = 0,
    capVolDry = 0,
    capWeightFrz = 0,
    capVolFrz = 0;
  let actWeightDry = 0,
    actWeightFrz = 0,
    actVolDry = 0,
    actVolFrz = 0;
  let estTimeDry = 0,
    estTimeFrz = 0;
  const activeVehicles = {};

  if (Array.isArray(resultsData)) {
    resultsData.forEach((item) => {
      const summary = item.summary || {};
      if (item.result && Array.isArray(item.result.routing)) {
        const isSingleVehicle = item.result.routing.length === 1;

        item.result.routing.forEach((route) => {
          if (!Array.isArray(route.trips) || route.trips.length === 0) return;

          const email = normalizeEmail(route.assignee || '');
          let info = driverInfoMap[email];
          if (!info) {
            info = Object.values(driverInfoMap).find(
              (d) => d.name.toUpperCase() === (route.assignee || '').toUpperCase()
            );
          }

          const driverName = info ? info.name : route.assignee;
          const category = getStorageType(driverName).toUpperCase();
          const truckId = (route.vehicleName || route.vehicleId || route.assignee || 'Unknown')
            .toUpperCase()
            .trim();

          let routeWeight = 0,
            routeVolume = 0;
          let sumVisit = 0,
            sumTravel = 0,
            sumWait = 0;
          let countedHubWait = false;

          route.trips.forEach((trip) => {
            if (!trip.isHub) {
              routeWeight = safeAdd(routeWeight, trip.weight);
              routeVolume = safeAdd(routeVolume, trip.volume);
            }
            const isHub = String(trip.isHub).toLowerCase() === 'true';
            sumVisit += Number(trip.visitTime) || 0;
            sumTravel += Number(trip.travelTime) || 0;

            if (!isHub || !countedHubWait) {
              sumWait += Number(trip.waitingTime) || 0;
              if (isHub) countedHubWait = true;
            }
          });

          if (routeWeight === 0 && route.totalWeight !== undefined)
            routeWeight = safeNum(route.totalWeight);
          if (routeVolume === 0 && route.totalVolume !== undefined)
            routeVolume = safeNum(route.totalVolume);

          activeVehicles[truckId] = {
            maxWeight: safeNum(route.vehicleMaxWeight ?? route.maxWeight ?? info?.maxWeight ?? 0),
            maxVolume: safeNum(route.vehicleMaxVolume ?? route.maxVolume ?? info?.maxVolume ?? 0),
            category,
          };

          const finalTravel = sumTravel > 0 ? sumTravel : Number(route.totalTravelTime || 0);
          const finalVisit = sumVisit > 0 ? sumVisit : Number(route.totalVisitTime || 0);
          const finalWait = sumWait > 0 ? sumWait : Number(route.totalWaitingTime || 0);
          const manualSpentTime = finalTravel + finalVisit + finalWait;

          let finalSpentTime = Number(route.totalSpentTime) || 0;
          if (finalSpentTime === 0 && isSingleVehicle && summary.totalSpentTime)
            finalSpentTime = Number(summary.totalSpentTime);
          if (finalSpentTime === 0) finalSpentTime = manualSpentTime;

          if (category === 'DRY') {
            actWeightDry = safeAdd(actWeightDry, routeWeight);
            actVolDry = safeAdd(actVolDry, routeVolume);
            estTimeDry += finalSpentTime;
          } else if (category === 'FROZEN') {
            actWeightFrz = safeAdd(actWeightFrz, routeWeight);
            actVolFrz = safeAdd(actVolFrz, routeVolume);
            estTimeFrz += finalSpentTime;
          }
        });
      }
    });
  }

  Object.values(activeVehicles).forEach((vehicle) => {
    if (vehicle.category === 'DRY') {
      capWeightDry = safeAdd(capWeightDry, vehicle.maxWeight);
      capVolDry = safeAdd(capVolDry, vehicle.maxVolume);
    } else if (vehicle.category === 'FROZEN') {
      capWeightFrz = safeAdd(capWeightFrz, vehicle.maxWeight);
      capVolFrz = safeAdd(capVolFrz, vehicle.maxVolume);
    }
  });

  return {
    actDistDryKm: fmt(actDistDry),
    actDistFrzKm: fmt(actDistFrz),
    actDistTotalKm: fmt(actDistDry + actDistFrz),
    capWeightDry: fmt(capWeightDry),
    actWeightDry: fmt(actWeightDry),
    capVolDry: fmt(capVolDry),
    actVolDry: fmt(actVolDry),
    capWeightFrz: fmt(capWeightFrz),
    actWeightFrz: fmt(actWeightFrz),
    capVolFrz: fmt(capVolFrz),
    actVolFrz: fmt(actVolFrz),
    estTimeDry,
    estTimeFrz,
  };
}
