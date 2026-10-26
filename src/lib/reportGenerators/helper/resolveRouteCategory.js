import { getBasePlate, getStorageType, normalizeEmail } from '@/lib/utils';

export function resolveRouteCategory(
  route,
  item,
  tasksData = [],
  driverData = [],
  driverMap = {}
) {
  const routingCat = getStorageType(item?.description || item?.code || item?.name);
  if (routingCat === 'Dry' || routingCat === 'Frozen') {
    return routingCat.toUpperCase();
  }

  if (Array.isArray(tasksData) && Array.isArray(route?.trips)) {
    for (const trip of route.trips) {
      if (trip.isHub) continue;
      let id = trip.visitId;
      if (id && typeof id === 'string' && id.startsWith('taskId-')) {
        id = id.replace('taskId-', '');
      }
      if (id) {
        const foundTask = tasksData.find(
          (t) => String(t._id || t.id || t.taskId) === String(id)
        );
        if (foundTask) {
          const tCat = getStorageType(foundTask.typeStorage || foundTask.storage);
          if (tCat === 'Dry' || tCat === 'Frozen') {
            return tCat.toUpperCase();
          }
        }
      }
    }
  }

  const email = normalizeEmail(
    typeof route?.assignee === 'string' ? route.assignee.split(',')[0].trim() : route?.assignee
  );
  const plat = (route?.basePlat || route?.vehicleName || '')
    .replace(/\s+/g, '')
    .toLowerCase();

  if (Array.isArray(driverData)) {
    const foundDriver =
      driverData.find((d) => email && normalizeEmail(d.email) === email) ||
      driverData.find(
        (d) =>
          plat &&
          (((d.plat || '').replace(/\s+/g, '').toLowerCase() === plat) ||
            (getBasePlate(d.basePlat || d.plat || '').replace(/\s+/g, '').toLowerCase() === plat))
      );

    if (foundDriver) {
      const dCat = getStorageType(foundDriver.storage || foundDriver.type);
      if (dCat === 'Dry' || dCat === 'Frozen') {
        return dCat.toUpperCase();
      }
    }
  }

  let driverName = route?.driverName || '';
  if (!driverName && email && driverMap) {
    driverName = driverMap[email] || '';
  }
  const fallbackCat = getStorageType(driverName);
  return fallbackCat === 'Dry' || fallbackCat === 'Frozen' ? fallbackCat.toUpperCase() : '-';
}
