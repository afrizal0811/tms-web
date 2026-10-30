import { getLocalStorage } from '@/lib/localStorageHandler';
import { getBasePlate } from '../../utils';
import { apiFetch } from '../base';
import {
  getVehiclesStatuses,
  getUsers as getMceasyUsers,
  patchVehicle as patchMceasyVehicle,
} from '../mceasy';

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

export async function getLocationHistories({
  timeFrom,
  timeTo,
  date,
  dateFrom,
  dateTo,
  deliveryDate,
  hubId,
} = {}) {
  const { storedLocation } = getLocalStorage();
  const targetHubId = hubId !== undefined ? hubId : storedLocation;
  const params = new URLSearchParams();
  if (date || deliveryDate) params.append('date', date || deliveryDate);
  if (dateFrom) params.append('dateFrom', dateFrom);
  if (dateTo) params.append('dateTo', dateTo);
  if (timeFrom) params.append('timeFrom', timeFrom);
  if (timeTo) params.append('timeTo', timeTo);
  if (targetHubId && targetHubId !== 'all') params.append('hubId', targetHubId);
  return await apiFetch(
    `/api/mileapp/drivers/location-histories?${params.toString()}`,
    'Gagal mengambil data location histories'
  );
}

export async function syncLocationHistories({
  deliveryDate,
  hubId,
  timeFrom,
  timeTo,
  items,
  created_by,
  updated_by,
} = {}) {
  const { storedLocation, storedUser } = getLocalStorage();
  const targetHubId = hubId || storedLocation;
  const userName = updated_by || created_by || storedUser?.name || null;

  return await apiFetch(
    '/api/mileapp/drivers/location-histories',
    'Gagal sinkronisasi data riwayat lokasi pengemudi',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deliveryDate,
        hubId: targetHubId,
        timeFrom,
        timeTo,
        items,
        created_by: userName,
        updated_by: userName,
      }),
    }
  );
}

export async function postDrivers(hubIds = [], customUpdateBy) {
  const { storedUser } = getLocalStorage();
  const updateBy = customUpdateBy !== undefined ? customUpdateBy : storedUser?.name;
  return await apiFetch('/api/mileapp/drivers', 'Gagal sinkronisasi data drivers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hubIds, updateBy }),
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
  const [mceasyData, dbDrivers, mceasyUsersRes] = await Promise.all([
    getVehiclesStatuses({ location: targetLocation }),
    getDrivers(activeHubId),
    getMceasyUsers({ 'position-name': 'Driver', limit: 10000, show: 10000 }).catch(() => []),
  ]);

  const rawUsers = mceasyUsersRes?.data || mceasyUsersRes || [];
  const mceasyUsers = Array.isArray(rawUsers) ? rawUsers : [];

  const mismatched = [];
  const matched = [];
  const autoMceasyUpdates = [];

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

      const isPlatMatch = mcPlat === maBasePlat;
      const isDriverMatch = mcName === maCleanName;

      if (isPlatMatch && isDriverMatch) {
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
      } else if (!isDriverMatch && isPlatMatch) {
        const matchingUsers = mceasyUsers.filter(
          (u) => (u.fullname || u.name || '')?.toLowerCase()?.trim() === maCleanName
        );
        let foundVmsDriver = null;
        if (matchingUsers.length === 1) {
          foundVmsDriver = matchingUsers[0];
        } else if (matchingUsers.length > 1) {
          foundVmsDriver =
            matchingUsers.find(
              (u) =>
                u.email &&
                ma.email &&
                u.email.toLowerCase().trim() === ma.email.toLowerCase().trim()
            ) || matchingUsers[0];
        }

        if (foundVmsDriver) {
          const newDriverId = foundVmsDriver.userId || foundVmsDriver.id;
          const alreadyInAuto = autoMceasyUpdates.some((u) => u.mcVehicleId === vehicleKey);
          if (!alreadyInAuto) {
            autoMceasyUpdates.push({
              mcVehicleId: vehicleKey,
              mcPlat: mcMatch.licensePlate,
              updatedDriverId: newDriverId,
            });
          }
          const alreadyInMatched = matched.some(
            (m) => m.id === driverKey || (m.vms_id && m.vms_id === vehicleKey)
          );
          if (!alreadyInMatched) {
            matched.push({
              id: driverKey,
              imei: mcMatch.imei,
              vms_id: vehicleKey,
              vms_driver_id: newDriverId,
            });
          }
        } else {
          const alreadyInMismatched = mismatched.some(
            (m) =>
              m.id === driverKey ||
              (m.mcVehicleId && m.mcVehicleId === vehicleKey) ||
              (m.maPlatBase && m.maPlatBase === maBasePlat)
          );
          if (!alreadyInMismatched) {
            mismatched.push({
              id: driverKey,
              imei: mcMatch.imei,
              maName: ma.name,
              maNameClean: maCleanName,
              maPlat: ma.plat,
              maPlatBase: maBasePlat,
              mcName: mcMatch.driver1?.fullname || '-',
              mcPlat: mcMatch.licensePlate || '-',
              mcVehicleId: vehicleKey,
              vmsDriverId: mcMatch.driverId,
              updatedPlat: undefined,
              isUpdated: false,
            });
          }
        }
      } else if (isDriverMatch && !isPlatMatch) {
        const alreadyInAuto = autoMceasyUpdates.some((u) => u.mcVehicleId === vehicleKey);
        if (!alreadyInAuto) {
          autoMceasyUpdates.push({
            mcVehicleId: vehicleKey,
            mcPlat: mcMatch.licensePlate,
            updatedPlat: ma.plat,
          });
        }
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
      } else {
        const alreadyInMismatched = mismatched.some(
          (m) =>
            m.id === driverKey ||
            (m.mcVehicleId && m.mcVehicleId === vehicleKey) ||
            (m.maPlatBase && m.maPlatBase === maBasePlat)
        );
        if (!alreadyInMismatched) {
          mismatched.push({
            id: driverKey,
            imei: mcMatch.imei,
            maName: ma.name,
            maNameClean: maCleanName,
            maPlat: ma.plat,
            maPlatBase: maBasePlat,
            mcName: mcMatch.driver1?.fullname || '-',
            mcPlat: mcMatch.licensePlate || '-',
            mcVehicleId: vehicleKey,
            vmsDriverId: mcMatch.driverId,
            updatedPlat: ma.plat,
            isUpdated: true,
          });
        }
      }
    }
  });

  if (autoMceasyUpdates.length > 0) {
    const targetDriverIds = new Set(
      autoMceasyUpdates
        .map((u) => u.updatedDriverId)
        .filter((id) => id && id !== '-')
        .map((id) => String(id))
    );

    const vehiclesToClear = new Set();
    autoMceasyUpdates.forEach((u) => {
      if (u.mcVehicleId && u.updatedDriverId !== undefined) {
        vehiclesToClear.add(u.mcVehicleId);
      }
    });

    mceasyData.forEach((mc) => {
      const vId = mc.vehicleId || mc.id;
      if (vId && mc.driverId && targetDriverIds.has(String(mc.driverId))) {
        vehiclesToClear.add(vId);
      }
    });

    for (const vehicleId of vehiclesToClear) {
      try {
        const clearPayload = new URLSearchParams();
        clearPayload.append('driver1Id', '-');
        await patchMceasyVehicle(vehicleId, clearPayload.toString());
      } catch (err) {
        console.warn(`[Auto-Sync McEasy] Gagal unassign kendaraan ${vehicleId}:`, err.message);
      }
    }

    for (const update of autoMceasyUpdates) {
      try {
        const payload = new URLSearchParams();
        if (update.updatedDriverId !== undefined) {
          payload.append('driver1Id', update.updatedDriverId);
        }
        if (update.updatedPlat) {
          payload.append('licensePlate', update.updatedPlat);
        }
        await patchMceasyVehicle(update.mcVehicleId, payload.toString());
      } catch (err) {
        console.error(
          `[Auto-Sync McEasy] Gagal update kendaraan ${update.mcVehicleId}:`,
          err.message
        );
      }
    }
  }

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

  return { success: true, matched };
}
