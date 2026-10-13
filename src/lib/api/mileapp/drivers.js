import { getLocalStorage } from '@/lib/localStorageHandler';
import { getBasePlate } from '../../utils';
import { apiFetch } from '../base';
import { getVehiclesStatuses } from '../mceasy';
import { fields } from './fields';

export async function getDrivers(customHubId) {
  const { storedLocation } = getLocalStorage();
  const hubId = customHubId !== undefined ? customHubId : storedLocation;
  const params = new URLSearchParams();
  if (hubId && hubId !== 'all') params.append('hubId', hubId);
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

  const rawLoc = (storedLocationName || '').replace(/^Hub\s+/i, '').trim();
  const targetLocation = rawLoc.toUpperCase() === 'GIIC' ? 'Cikarang' : rawLoc;
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

      const driverKey = ma._id || ma.id;
      const vehicleKey = mcMatch.vehicleId || mcMatch.id;

      if (mcPlat !== maBasePlat || mcName !== maCleanName) {
        const isPlatMismatch = mcPlat !== maBasePlat;
        const alreadyInMismatched = mismatched.some(
          (m) =>
            m.id === driverKey ||
            (m.mcVehicleId && m.mcVehicleId === vehicleKey) ||
            (m.maPlatBase && m.maPlatBase === maBasePlat)
        );
        if (!alreadyInMismatched) {
          mismatched.push({
            id: driverKey,
            maName: ma.name,
            maNameClean: maCleanName,
            maPlat: ma.plat,
            maPlatBase: maBasePlat,
            mcName: mcMatch.driver1?.fullname || '-',
            mcPlat: mcMatch.licensePlate || '-',
            mcVehicleId: vehicleKey,
            vmsDriverId: mcMatch.driverId,
            updatedPlat: isPlatMismatch ? ma.plat : undefined,
            isUpdated: isPlatMismatch,
          });
        }
      } else {
        const alreadyInMatched = matched.some(
          (m) => m.id === driverKey || (m.vms_id && m.vms_id === vehicleKey)
        );
        if (!alreadyInMatched) {
          matched.push({
            id: driverKey,
            imei: mcMatch.imei,
            vms_id: vehicleKey,
            vms_driver_id: mcMatch.driverId,
          });
        }
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
