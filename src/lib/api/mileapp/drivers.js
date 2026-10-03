import { getLocalStorage } from '@/lib/localStorageHandler';
import { getBasePlate } from '../../utils';
import { apiFetch } from '../base';
import { getVehiclesStatuses } from '../mceasy';
import { fields } from './fields';

export async function getDrivers() {
  const { storedLocation } = getLocalStorage();
  const params = new URLSearchParams();
  if (storedLocation) params.append('hubId', storedLocation);
  return await apiFetch(
    `/api/mileapp/drivers?${params.toString()}`,
    'Gagal mengambil data drivers dari DB'
  );
}

export async function getDriverStatus() {
  const { storedLocation } = getLocalStorage();
  const params = new URLSearchParams();
  if (storedLocation) params.append('hubId', storedLocation);

  return await apiFetch(
    `/api/mileapp/drivers/status?${params.toString()}`,
    'Gagal mengambil status sync driver'
  );
}

export async function getLocationHistories({ timeFrom, timeTo }) {
  const { storedLocation } = getLocalStorage();
  const locationsFields = fields.locations.join(',');
  const params = new URLSearchParams();
  params.append('timeBy', 'createdTime');
  params.append('limit', 10000);
  params.append('startFinish', 'true');
  if (timeFrom) params.append('timeFrom', timeFrom);
  if (timeTo) params.append('timeTo', timeTo);
  if (locationsFields) params.append('fields', locationsFields);
  if (storedLocation) params.append('hubId', storedLocation);
  return await apiFetch(
    `/api/mileapp/drivers/location-histories?${params.toString()}`,
    'Gagal mengambil data location histories'
  );
}

export async function postDrivers(hubIds = []) {
  return await apiFetch('/api/mileapp/drivers', 'Gagal sinkronisasi data drivers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hubIds }),
  });
}

export async function patchDriverMceasy(activeHubId, storedLocationName, explicitMatches = null) {
  if (explicitMatches) {
    await apiFetch('/api/mileapp/drivers', 'Gagal update data MCEasy', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates: explicitMatches }),
    });
    return { success: true };
  }

  const targetLocation =
    storedLocationName?.toUpperCase() === 'GIIC' ? 'Cikarang' : storedLocationName;
  const [mceasyData, dbDrivers] = await Promise.all([
    getVehiclesStatuses({ location: targetLocation }),
    getDrivers(activeHubId),
  ]);

  const mismatched = [];
  const matched = [];

  dbDrivers.forEach((ma) => {
    const maCleanName = ma.name
      .replace(/^'[^']+'\s*/, '')
      .trim()
      .toLowerCase();
    const maBasePlat = getBasePlate(ma.plat)?.replace(/\s+/g, '')?.toUpperCase();

    let mcMatch = null;

    if (ma.vms_id) {
      mcMatch = mceasyData.find((mc) => String(mc.vehicleId || mc.id) === String(ma.vms_id));
    }

    if (!mcMatch) {
      mcMatch = mceasyData.find(
        (mc) => mc.licensePlate?.replace(/\s+/g, '')?.toUpperCase() === maBasePlat
      );
    }

    if (!mcMatch) {
      mcMatch = mceasyData.find(
        (mc) => mc.driver1?.fullname?.toLowerCase()?.trim() === maCleanName
      );
    }

    if (mcMatch) {
      const mcPlat = mcMatch.licensePlate?.replace(/\s+/g, '')?.toUpperCase();
      const mcName = mcMatch.driver1?.fullname?.toLowerCase()?.trim();

      if (mcPlat !== maBasePlat || mcName !== maCleanName) {
        const isPlatMismatch = mcPlat !== maBasePlat;
        mismatched.push({
          id: ma._id || ma.id,
          maName: ma.name,
          maNameClean: maCleanName,
          maPlat: ma.plat,
          maPlatBase: maBasePlat,
          mcName: mcMatch.driver1?.fullname || '-',
          mcPlat: mcMatch.licensePlate || '-',
          mcVehicleId: mcMatch.vehicleId || mcMatch.id,
          vmsDriverId: mcMatch.driverId,
          updatedPlat: isPlatMismatch ? ma.plat : undefined,
          isUpdated: isPlatMismatch,
        });
      } else {
        matched.push({
          id: ma._id || ma.id,
          imei: mcMatch.imei,
          vms_id: mcMatch.vehicleId || mcMatch.id,
          vms_driver_id: mcMatch.driverId,
        });
      }
    }
  });

  if (mismatched.length > 0) {
    return { success: false, mismatched, matched };
  }

  if (matched.length > 0) {
    await apiFetch('/api/mileapp/drivers', 'Gagal update data MCEasy', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates: matched }),
    });
  }

  return { success: true };
}
