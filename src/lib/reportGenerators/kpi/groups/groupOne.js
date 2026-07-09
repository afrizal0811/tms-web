import { getStorageType, normalizeEmail } from '@/lib/utils';

export function calculateGroupOne(resultsData, tasksData, driverMap) {
  const dryTrucks = new Set();
  const frzTrucks = new Set();
  let ttDry = 0;
  let ttFrz = 0;
  if (Array.isArray(resultsData)) {
    resultsData.forEach((item) => {
      if (item.result && Array.isArray(item.result.routing)) {
        item.result.routing.forEach((route) => {
          const validTrips = Array.isArray(route.trips)
            ? route.trips.filter((t) => t.isHub !== true)
            : [];
          const tripsCount =
            route.totalVisits !== undefined ? Number(route.totalVisits) : validTrips.length;
          if (tripsCount === 0) return;
          const email = normalizeEmail(route.assignee);
          const driverName = driverMap[email] || '';
          const category = getStorageType(driverName).toUpperCase();
          const truckId = route.assignee || route.vehicleName || route.vehicleId || '-';
          if (truckId) {
            if (category === 'DRY') {
              dryTrucks.add(truckId);
              ttDry += tripsCount;
            } else if (category === 'FROZEN') {
              frzTrucks.add(truckId);
              ttFrz += tripsCount;
            }
          }
        });
      }
    });
  }
  const countDry = dryTrucks.size;
  const countFrz = frzTrucks.size;
  const countTotal = countDry + countFrz;
  let rtDry = 0;
  let rtFrz = 0;
  if (Array.isArray(tasksData)) {
    tasksData.forEach((task) => {
      let isRedelivery = false;
      if (Array.isArray(task.statusDelivery) && task.statusDelivery.length > 0) {
        if (String(task.statusDelivery[0]).toUpperCase() === 'PENDING') isRedelivery = true;
      } else if (
        typeof task.statusDelivery === 'string' &&
        task.statusDelivery.toUpperCase() === 'PENDING'
      ) {
        isRedelivery = true;
      }
      if (
        !isRedelivery &&
        typeof task.statusGr === 'string' &&
        task.statusGr.toUpperCase() === 'PENDING'
      ) {
        isRedelivery = true;
      }
      if (isRedelivery) {
        let driverName = task.driverName || '';
        let category = task.typeStorage || '';
        if (driverName === '-') driverName = '';
        if (category === '-') category = '';
        if (!driverName) {
          const assignees = task.assignee;
          if (Array.isArray(assignees) && assignees.length > 0) {
            const rawAssignee = assignees[0];
            const email = normalizeEmail(rawAssignee);
            driverName = driverMap[email] || '';
            if (!driverName && typeof rawAssignee === 'string') driverName = rawAssignee;
          }
        }
        if (!category && driverName) category = getStorageType(driverName).toUpperCase();
        let finalCategory = '';
        if (category) {
          const catUp = category.toUpperCase();
          if (catUp.includes('DRY')) finalCategory = 'DRY';
          else if (catUp.includes('FRZ') || catUp.includes('FROZEN')) finalCategory = 'FROZEN';
        }
        if (finalCategory === 'DRY') rtDry++;
        else if (finalCategory === 'FROZEN') rtFrz++;
      }
    });
  }
  return { countDry, countFrz, countTotal, ttDry, ttFrz, rtDry, rtFrz };
}
