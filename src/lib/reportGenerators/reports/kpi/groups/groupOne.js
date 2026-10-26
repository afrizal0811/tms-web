import { normalizeDeliveryStatus } from '@/lib/deliveryStatus';
import { getStorageType, normalizeEmail } from '@/lib/utils';
import { resolveRouteCategory } from '../../../helper/resolveRouteCategory';

export function calculateGroupOne(resultsData, tasksData, driverMap, driverData = []) {
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

          let driverName = route.driverName || '';
          if (!driverName && route.assignee) {
            const rawAssignee =
              typeof route.assignee === 'string'
                ? route.assignee.split(',')[0].trim()
                : route.assignee;
            driverName = driverMap[normalizeEmail(rawAssignee)] || rawAssignee;
          }

          const category = resolveRouteCategory(route, item, tasksData, driverData, driverMap);
          const truckId = route.basePlat || route.vehicleName || '-';

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
  const pendingTasks = [];

  if (Array.isArray(tasksData)) {
    tasksData.forEach((task) => {
      let isRedelivery = normalizeDeliveryStatus(task.statusDelivery) === 'PENDING';

      if (!isRedelivery) {
        let statusGr = '';
        if (task.statusGr) {
          statusGr =
            typeof task.statusGr === 'string' ? task.statusGr.split(',')[0].trim() : task.statusGr;
        }
        isRedelivery = normalizeDeliveryStatus(statusGr) === 'PENDING';
      }

      if (isRedelivery) {
        pendingTasks.push(task);
        let driverName = task.driverName === '-' ? '' : task.driverName || '';
        let category = task.typeStorage === '-' ? '' : task.typeStorage || '';

        if (!driverName && task.assignee) {
          const rawAssignee =
            typeof task.assignee === 'string' ? task.assignee.split(',')[0].trim() : task.assignee;
          driverName = driverMap[normalizeEmail(rawAssignee)] || rawAssignee;
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

  let rtRouting = null;
  let rtDriver = null;
  let rtSales = null;
  let rtCustomer = null;
  let rtOther = null;

  const hasPendingDetails = pendingTasks.some(
    (t) =>
      t.pendingDetail &&
      Boolean(
        (t.pendingDetail.pic && t.pendingDetail.pic.trim() !== '' && t.pendingDetail.pic !== '-') ||
          (t.pendingDetail.groupReason &&
            t.pendingDetail.groupReason.trim() !== '' &&
            t.pendingDetail.groupReason !== '-') ||
          (t.pendingDetail.detailReason &&
            t.pendingDetail.detailReason.trim() !== '' &&
            t.pendingDetail.detailReason !== '-') ||
          (t.pendingDetail.internalExternal &&
            t.pendingDetail.internalExternal.trim() !== '' &&
            t.pendingDetail.internalExternal !== '-')
      )
  );

  if (hasPendingDetails) {
    rtRouting = 0;
    rtDriver = 0;
    rtSales = 0;
    rtCustomer = 0;
    rtOther = 0;

    pendingTasks.forEach((task) => {
      const rawPic = task.pendingDetail?.pic;
      const pic = typeof rawPic === 'string' ? rawPic.trim().toLowerCase() : '';

      if (pic === 'expedition') {
        rtRouting++;
      } else if (pic === 'driver') {
        rtDriver++;
      } else if (pic === 'sales') {
        rtSales++;
      } else if (pic === 'customer') {
        rtCustomer++;
      } else if (pic.includes('back office') || pic.includes('warehouse') || pic === 'other') {
        rtOther++;
      }
    });
  }

  const hasIncompletePendingDetail = pendingTasks.some((t) => {
    const pd = t.pendingDetail;
    const hasDetail = Boolean(
      pd &&
        ((pd.detailReason && pd.detailReason.trim() !== '' && pd.detailReason !== '-') ||
          (pd.groupReason && pd.groupReason.trim() !== '' && pd.groupReason !== '-') ||
          (pd.pic && pd.pic.trim() !== '' && pd.pic !== '-') ||
          (pd.internalExternal && pd.internalExternal.trim() !== '' && pd.internalExternal !== '-'))
    );
    return !hasDetail;
  });

  return {
    countDry,
    countFrz,
    countTotal,
    ttDry,
    ttFrz,
    rtDry,
    rtFrz,
    rtRouting,
    rtDriver,
    rtSales,
    rtCustomer,
    rtOther,
    hasIncompletePendingDetail,
  };
}
