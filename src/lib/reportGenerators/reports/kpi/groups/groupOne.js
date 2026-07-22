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
          const validTrips = Array.isArray(route.trips) ? route.trips.filter((t) => !t.isHub) : [];
          const tripsCount = Number(route.totalVisits ?? validTrips.length);

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
      const statusDelivery = Array.isArray(task.statusDelivery)
        ? task.statusDelivery[0]
        : task.statusDelivery;
      let isRedelivery = String(statusDelivery || '').toUpperCase() === 'PENDING';

      if (!isRedelivery) {
        isRedelivery = String(task.statusGr || '').toUpperCase() === 'PENDING';
      }

      if (isRedelivery) {
        let driverName = task.driverName === '-' ? '' : task.driverName || '';
        let category = task.typeStorage === '-' ? '' : task.typeStorage || '';

        if (!driverName && Array.isArray(task.assignee) && task.assignee.length > 0) {
          const rawAssignee = task.assignee[0];
          driverName =
            driverMap[normalizeEmail(rawAssignee)] ||
            (typeof rawAssignee === 'string' ? rawAssignee : '');
        }

        if (!category && driverName) {
          category = getStorageType(driverName).toUpperCase();
        }

        const catUp = (category || '').toUpperCase();
        if (catUp.includes('DRY')) {
          rtDry++;
        } else if (catUp.includes('FRZ') || catUp.includes('FROZEN')) {
          rtFrz++;
        }
      }
    });
  }

  return { countDry, countFrz, countTotal, ttDry, ttFrz, rtDry, rtFrz };
}
