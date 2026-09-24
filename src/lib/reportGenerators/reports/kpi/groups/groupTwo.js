import { getBasePlate, getStorageType } from '@/lib/utils';

export function calculateGroupTwo(resultsData, driverMap, driverData = []) {
  const detailRows = [];
  const processedDrivers = new Set();
  const dataRoutingExists = true;

  if (Array.isArray(resultsData)) {
    resultsData.forEach((item) => {
      const routingName = item.description || item.code || item.name || 'Unknown Routing';
      if (item.result && Array.isArray(item.result.routing)) {
        item.result.routing.forEach((route) => {
          if (!Array.isArray(route.trips) || route.trips.length === 0) return;

          const truckId = route.basePlat || route.vehicleName || 'No Plat';
          const driverName = route.driverName || '';
          const category = getStorageType(driverName).toUpperCase();

          if (truckId) {
            const rawVisit = Number(route.totalVisitTime) || 0;
            const rawTravel = Number(route.totalTravelTime) || 0;
            const rawWait = Number(route.totalWaitingTime) || 0;
            const rawSpent = Number(route.totalSpentTime) || 0;

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
