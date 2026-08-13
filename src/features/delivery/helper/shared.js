import { getLocalStorage } from '@/lib/localStorageHandler';
import {
  checkInvalidSo,
  checkInvalidSoList,
  formatDateUniversal,
  isEmpty,
  normalizeEmail,
  parseCustomerString,
  standardizeSo,
} from '@/lib/utils';

export const getDriverName = (route, driverData) => {
  if (!route) return '';
  const email = normalizeEmail(route.assignee);
  return driverData?.[email]?.name || '-';
};

export const isTripRedelivery = (trip) => {
  const flowLower = (trip.flow || '').toLowerCase();
  const visitLower = (trip.visitName || '').toLowerCase();
  return (
    flowLower.includes('re delivery') ||
    flowLower.includes('redelivery') ||
    visitLower.includes('re delivery') ||
    visitLower.includes('redelivery') ||
    trip.isReDelivery
  );
};

export const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const getLocationName = () => {
  const { storedLocationAcronym, storedLocationName } = getLocalStorage();
  return storedLocationAcronym || storedLocationName || 'Hub';
};

export const sortRoutingResultsByCreatedTime = (routingResults) =>
  [...routingResults].sort((a, b) => {
    const timeA = new Date(a.createdTime || 0).getTime();
    const timeB = new Date(b.createdTime || 0).getTime();
    return timeA - timeB;
  });

export const abortIfNoRoutingResults = (routingResults, t, setIsDownloading) => {
  if (routingResults && routingResults.length > 0) return false;
  toastError(t('common.toast.error', { err: 'Data routing tidak ditemukan' }));
  setIsDownloading(false);
  return true;
};

export const buildEnrichedTripsMap = (filteredVehicleRoutes) => {
  const enrichedTripsMap = new Map();
  (filteredVehicleRoutes || []).forEach((r) => {
    (r.trips || []).forEach((trip) => {
      if (!trip.isHub) {
        const key = trip.visitId || trip.orderId;
        if (key) enrichedTripsMap.set(key, trip);
      }
    });
  });
  return enrichedTripsMap;
};

export const getUniqueFileName = (prefix, suffix, ext, seen) => {
  let name = `${prefix} - ${suffix}${ext}`;
  let count = 1;
  while (seen.has(name)) {
    name = `${prefix}_${count++} - ${suffix}${ext}`;
  }
  seen.add(name);
  return name;
};

export const resolveDedupedTrip = (rawTrip, enrichedTripsMap, vehicleSeenSOs) => {
  if (rawTrip.isHub) return rawTrip;

  const key = rawTrip.visitId || rawTrip.orderId;
  const trip = enrichedTripsMap.has(key) ? enrichedTripsMap.get(key) : rawTrip;

  if (isTripRedelivery(trip)) return trip;

  const parsedCust = parseCustomerString(trip.visitName);
  const rawInvoice = parsedCust.invoiceNumber || trip.orderId || '';
  if (!rawInvoice) return null;

  const rawSOs = rawInvoice
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const newSOs = [];
  let hasNewSO = false;

  rawSOs.forEach((rawSo) => {
    const stdSo = standardizeSo(rawSo);
    if (!vehicleSeenSOs.has(stdSo)) {
      vehicleSeenSOs.add(stdSo);
      newSOs.push(rawSo);
      hasNewSO = true;
    }
  });

  if (!hasNewSO) return null;

  if (trip.soWarehouseMapping) {
    return {
      ...trip,
      orderId: newSOs.join(', '),
      orderIdOverride: newSOs.join(', '),
      soWarehouseMapping: trip.soWarehouseMapping.filter((m) =>
        newSOs.some((n) => standardizeSo(n) === standardizeSo(m.so) || n === m.so)
      ),
    };
  }
  return { ...trip, orderId: newSOs.join(', '), orderIdOverride: newSOs.join(', ') };
};

export const sanitizeName = (name) => name.replace(/[\\/:*?\[\]]/g, '');