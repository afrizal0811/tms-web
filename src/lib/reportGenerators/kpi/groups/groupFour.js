import { normalizeEmail } from '@/lib/utils';
import { getVehicleCategory } from './help';

// Kalkulasi menggunakan presisi penuh untuk mencegah hilangnya angka pecahan kecil
const safeAdd = (a, b) => Number(a || 0) + Number(b || 0);
const safeNum = (n) => Number(n || 0);

export function calculateGroupFour(resultsData, historiesData, driverData) {
  const driverInfoMap = {};
  if (Array.isArray(driverData)) {
    driverData.forEach((d) => {
      const email = normalizeEmail(d.email);
      if (email) {
        driverInfoMap[email] = {
          name: d.name || '',
          maxWeight: safeNum(d.maxWeight),
          maxVolume: safeNum(d.maxVolume),
        };
      }
    });
  }

  let actDistDry = 0;
  let actDistFrz = 0;

  if (Array.isArray(historiesData)) {
    historiesData.forEach((h) => {
      const email = normalizeEmail(h.email);
      const info = driverInfoMap[email];
      const driverName = info ? info.name : '';
      const category = getVehicleCategory(driverName || h.email);
      const dist = safeNum(h.finish?.totalDistance ?? h.totalDistance ?? 0);
      if (category === 'DRY') actDistDry = safeAdd(actDistDry, dist);
      else if (category === 'FROZEN') actDistFrz = safeAdd(actDistFrz, dist);
    });
  }

  let capWeightDry = 0,
    capVolDry = 0,
    capWeightFrz = 0,
    capVolFrz = 0,
    actWeightDry = 0,
    actWeightFrz = 0,
    actVolDry = 0,
    actVolFrz = 0,
    estTimeDry = 0,
    estTimeFrz = 0;

  const activeVehicles = {};

  if (Array.isArray(resultsData)) {
    resultsData.forEach((item) => {
      const summary = item.summary || {};
      if (item.result && Array.isArray(item.result.routing)) {
        const isSingleVehicle = item.result.routing.length === 1;
        item.result.routing.forEach((route) => {
          const hasTrips = Array.isArray(route.trips) && route.trips.length > 0;

          if (!hasTrips) return;

          const email = normalizeEmail(route.assignee || '');
          let info = driverInfoMap[email];
          if (!info) {
            const foundByObj = Object.values(driverInfoMap).find(
              (d) => d.name.toUpperCase() === (route.assignee || '').toUpperCase()
            );
            if (foundByObj) info = foundByObj;
          }
          const driverName = info ? info.name : route.assignee;
          const category = getVehicleCategory(driverName);
          const truckId = (route.vehicleName || route.vehicleId || route.assignee || 'Unknown')
            .toUpperCase()
            .trim();

          let routeWeight = 0,
            routeVolume = 0;

          route.trips.forEach((trip) => {
            if (!trip.isHub) {
              routeWeight = safeAdd(routeWeight, trip.weight);
              routeVolume = safeAdd(routeVolume, trip.volume);
            }
          });

          if (routeWeight === 0 && route.totalWeight !== undefined)
            routeWeight = safeNum(route.totalWeight);
          if (routeVolume === 0 && route.totalVolume !== undefined)
            routeVolume = safeNum(route.totalVolume);

          const maxW = safeNum(
            route.vehicleMaxWeight !== undefined
              ? route.vehicleMaxWeight
              : route.maxWeight !== undefined
              ? route.maxWeight
              : info
              ? info.maxWeight
              : 0
          );
          const maxV = safeNum(
            route.vehicleMaxVolume !== undefined
              ? route.vehicleMaxVolume
              : route.maxVolume !== undefined
              ? route.maxVolume
              : info
              ? info.maxVolume
              : 0
          );

          activeVehicles[truckId] = {
            maxWeight: maxW,
            maxVolume: maxV,
            category: category,
          };

          let sumVisit = 0,
            sumTravel = 0,
            sumWait = 0;
          let countedHubWait = false;

          route.trips.forEach((t) => {
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

          const finalTravel =
            sumTravel > 0
              ? sumTravel
              : route.totalTravelTime !== undefined
              ? Number(route.totalTravelTime)
              : 0;
          const finalVisit =
            sumVisit > 0
              ? sumVisit
              : route.totalVisitTime !== undefined
              ? Number(route.totalVisitTime)
              : 0;
          const finalWait =
            sumWait > 0
              ? sumWait
              : route.totalWaitingTime !== undefined
              ? Number(route.totalWaitingTime)
              : 0;

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

  Object.keys(activeVehicles).forEach((truckId) => {
    const vehicle = activeVehicles[truckId];
    if (vehicle.category === 'DRY') {
      capWeightDry = safeAdd(capWeightDry, vehicle.maxWeight);
      capVolDry = safeAdd(capVolDry, vehicle.maxVolume);
    } else if (vehicle.category === 'FROZEN') {
      capWeightFrz = safeAdd(capWeightFrz, vehicle.maxWeight);
      capVolFrz = safeAdd(capVolFrz, vehicle.maxVolume);
    }
  });

  // Pembulatan 1 angka desimal hanya di hasil akhir
  const fmt = (n) => (isNaN(Number(n)) ? 0 : Number(Number(n).toFixed(1)));

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
