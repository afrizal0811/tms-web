import { getStorageType, normalizeEmail } from '@/lib/utils';
import { resolveRouteCategory } from '../../../helper/resolveRouteCategory';

const safeAdd = (a, b) => Number(a || 0) + Number(b || 0);
const safeNum = (n) => Number(n || 0);
const fmt = (n) => (isNaN(Number(n)) ? 0 : Number(Number(n).toFixed(1)));

export function calculateGroupFour(
  resultsData,
  historiesData,
  driverData,
  tasksData = [],
  driverMap = {}
) {
  const driverInfoMap = (Array.isArray(driverData) ? driverData : []).reduce((acc, d) => {
    const email = normalizeEmail(d.email);
    if (email) {
      acc[email] = {
        name: d.name || '',
        category: getStorageType(d).toUpperCase(),
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
      const category = driverInfoMap[email]?.category || getStorageType(driverName).toUpperCase();
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
      const plates = Array.from(
        new Set([
          ...Object.keys(item.totalDistance || {}),
          ...Object.keys(item.time || {}),
          ...Object.keys(item.hubTimes || {}),
        ])
      );

      plates.forEach((plat) => {
        const truckId = plat || '-';
        const foundDriver = (driverData || []).find(
          (d) =>
            d.plat &&
            d.plat.replace(/\s+/g, '').toLowerCase() === plat.replace(/\s+/g, '').toLowerCase()
        );
        const email = normalizeEmail(foundDriver?.email || '');
        const info = driverInfoMap[email];

        const route = { basePlat: plat, vehicleName: plat };
        const category = resolveRouteCategory(route, item, tasksData, driverData, driverMap);
        const routeTasks = (Array.isArray(tasksData) ? tasksData : []).filter(
          (t) => (t.basePlat || t.vehicleName || t.plat) === truckId
        );
        const taskWeight = routeTasks.reduce((s, t) => s + (Number(t.weightKg) || 0), 0);
        const taskVol = routeTasks.reduce((s, t) => s + (Number(t.volumeCbm) || 0), 0);
        const routeWeight = safeNum(taskWeight);
        const routeVolume = safeNum(taskVol);

        activeVehicles[truckId] = {
          maxWeight: safeNum(foundDriver?.maxWeight ?? info?.maxWeight ?? 0),
          maxVolume: safeNum(foundDriver?.maxVolume ?? info?.maxVolume ?? 0),
          category,
        };

        const finalSpentTime = Number(item.time?.[plat]?.spentTime) || 0;

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
