import { getBasePlate, getStorageType } from '@/lib/utils';
import { resolveRouteCategory } from '../../../helper/resolveRouteCategory';

export function calculateGroupTwo(resultsData, driverMap, driverData = [], tasksData = []) {
  const detailRows = [];
  const processedDrivers = new Set();
  const dataRoutingExists = true;

  if (Array.isArray(resultsData)) {
    resultsData.forEach((item) => {
      const routingName = item.description || item.code || item.name || 'Unknown Routing';
      const plates = Array.from(
        new Set([
          ...Object.keys(item.totalDistance || {}),
          ...Object.keys(item.time || {}),
          ...Object.keys(item.hubTimes || {}),
        ])
      );

      plates.forEach((plat) => {
        const truckId = plat || 'No Plat';
        const route = { basePlat: plat, vehicleName: plat };
        const category = resolveRouteCategory(route, item, tasksData, driverData, driverMap);

        const foundDriver = (driverData || []).find(
          (d) =>
            d.plat &&
            d.plat.replace(/\s+/g, '').toLowerCase() === plat.replace(/\s+/g, '').toLowerCase()
        );
        const driverName = foundDriver?.name || '';

        const tObj = item.time?.[plat] || {};
        const rawVisit = Number(tObj.visitTime) || 0;
        const rawTravel = Number(tObj.travelTime) || 0;
        const rawWait = Number(tObj.waitingTime) || 0;
        const rawSpent = Number(tObj.spentTime) || (rawVisit + rawTravel + rawWait);

        detailRows.push({
          routing: routingName,
          plat: truckId,
          driver: driverName,
          category,
          visit: rawVisit,
          travel: rawTravel,
          wait: rawWait,
          spent: rawSpent,
        });

        if (driverName) {
          processedDrivers.add(driverName.toUpperCase().trim());
        }
      });
    });
  }

  if (Array.isArray(driverData)) {
    driverData.forEach((d) => {
      const dName = d.name || '';
      const dPlat = d.plat || '';

      if (!dPlat || dPlat === 'No Plat' || dPlat.trim() === '') return;

      if (dName && !processedDrivers.has(dName.toUpperCase().trim())) {
        processedDrivers.add(dName.toUpperCase().trim());
        detailRows.push({
          routing: '-',
          vehicle: dPlat,
          driver: dName,
          category: getStorageType(d),
          visit: '',
          travel: '',
          wait: '',
          spent: '',
          isNoRoutingData: true,
        });
      }
    });
  }

  let totalMinutesDry = 0;
  let totalMinutesFrz = 0;
  const seen = new Set();

  detailRows.forEach((row) => {
    if (!row.isNoRoutingData) {
      const spentTimeHHMM = `${Math.floor(row.spent / 60)}:${String(row.spent % 60).padStart(2, '0')}`;
      const key = `${row.routing}|${getBasePlate((row.plat || '').toUpperCase().trim())}|${row.driver}|${row.visit}|${row.travel}|${row.wait}|${row.spent}|${spentTimeHHMM}`;
      if (!seen.has(key)) {
        seen.add(key);
        if (row.category === 'DRY') totalMinutesDry += row.spent;
        else if (row.category === 'FROZEN') totalMinutesFrz += row.spent;
      }
    }
  });

  return {
    opsHoursDry: Math.round(totalMinutesDry / 60),
    opsHoursFrz: Math.round(totalMinutesFrz / 60),
    totalMinutesDry,
    totalMinutesFrz,
    detailRows,
    dataRoutingExists,
  };
}
