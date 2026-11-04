import { getLocalStorage } from '@/lib/localStorageHandler';
import { apiFetch } from '../base';

// vehicles
export async function getVehicles(customHubId) {
  const { storedLocation } = getLocalStorage();
  const hubId = customHubId !== undefined ? customHubId : storedLocation;
  const params = new URLSearchParams();
  if (hubId && hubId !== 'all') params.append('hubId', hubId);
  return await apiFetch(
    `/api/mileapp/vehicles?${params.toString()}`,
    'Gagal mengambil data kendaraan dari database'
  );
}

export async function postVehicles(hubIds = [], customUpdateBy) {
  const { storedUser } = getLocalStorage();
  const updateBy = customUpdateBy !== undefined ? customUpdateBy : storedUser?.name;
  return await apiFetch('/api/mileapp/vehicles', 'Gagal sinkronisasi data kendaraan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hubIds, updateBy }),
  });
}

export async function updateVehicle(payload) {
  const { storedUser } = getLocalStorage();
  return await apiFetch('/api/mileapp/vehicles', 'Gagal mengubah data kendaraan', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      updateBy: storedUser?.name,
      ...payload,
    }),
  });
}

export async function patchVehicles(updates, customUpdateBy) {
  const { storedUser } = getLocalStorage();
  const updateBy = customUpdateBy !== undefined ? customUpdateBy : storedUser?.name;
  return await apiFetch('/api/mileapp/vehicles', 'Gagal update kendaraan', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ updates, updateBy }),
  });
}

export async function deleteVehicle({ id, vehicle_id, hubId }) {
  const params = new URLSearchParams();
  if (id) params.append('id', id);
  if (vehicle_id) params.append('vehicle_id', vehicle_id);
  if (hubId) params.append('hubId', hubId);
  return await apiFetch(`/api/mileapp/vehicles?${params.toString()}`, 'Gagal menghapus kendaraan', {
    method: 'DELETE',
  });
}

export async function patchVehicleMceasy(activeHubId, storedLocationName, explicitMatches = null) {
  if (explicitMatches) {
    await patchVehicles(explicitMatches);
    return { success: true };
  }

  const { getVehiclesStatuses } = await import('../mceasy');
  const { getBasePlate } = await import('../../utils');

  const rawLoc = (storedLocationName || '').replace(/^Hub\s+/i, '').trim();
  const targetLocation = rawLoc.toUpperCase() === 'GIIC' ? 'Cikarang' : rawLoc;
  const [mceasyData, dbVehicles] = await Promise.all([
    getVehiclesStatuses({ location: targetLocation }),
    getVehicles(activeHubId),
  ]);

  const mismatched = [];
  const matched = [];

  const list = Array.isArray(dbVehicles) ? dbVehicles : [];
  const mcList = Array.isArray(mceasyData) ? mceasyData : [];

  list.forEach((v) => {
    const vBasePlat = getBasePlate(v.license_number)?.replace(/\s+/g, '')?.toUpperCase();
    let mcMatch = null;
    if (v.vms_id) {
      mcMatch = mcList.find((mc) => String(mc.vehicleId || mc.id) === String(v.vms_id));
    }
    if (!mcMatch) {
      mcMatch = mcList.find(
        (mc) => mc.licensePlate?.replace(/\s+/g, '')?.toUpperCase() === vBasePlat
      );
    }

    if (mcMatch) {
      const mcPlat = mcMatch.licensePlate?.replace(/\s+/g, '')?.toUpperCase();
      const vehicleKey = mcMatch.vehicleId || mcMatch.id;
      const isPlatMatch = mcPlat === vBasePlat;

      if (isPlatMatch) {
        matched.push({
          id: v.id,
          vehicle_id: v.vehicle_id,
          imei: mcMatch.imei,
          vms_id: vehicleKey,
        });
      } else {
        mismatched.push({
          id: v.id,
          vehicle_id: v.vehicle_id,
          imei: mcMatch.imei,
          maPlat: v.license_number,
          maPlatBase: vBasePlat,
          mcPlat: mcMatch.licensePlate || '-',
          mcVehicleId: vehicleKey,
        });
      }
    }
  });

  return { success: mismatched.length === 0, matched, mismatched };
}

export async function configureVehicles(items, hubId) {
  const { storedUser, storedLocation } = getLocalStorage();
  const targetHubId = hubId || storedLocation;
  return await apiFetch('/api/mileapp/vehicles', 'Gagal menyimpan konfigurasi kendaraan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items,
      hubId: targetHubId,
      updateBy: storedUser?.name,
    }),
  });
}

export async function getVehicleStatus() {
  const { storedLocation } = getLocalStorage();
  const params = new URLSearchParams();
  params.append('status', 'true');
  if (storedLocation) params.append('hubId', storedLocation);

  return await apiFetch(
    `/api/mileapp/vehicles?${params.toString()}`,
    'Gagal mengambil status sync kendaraan'
  );
}

// vehicle type
export async function createVehicleType(name) {
  return await apiFetch('/api/mileapp/vehicles/types', 'Gagal menambah tipe kendaraan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
}

export async function getVehicleTypes() {
  const { storedLocation } = getLocalStorage();
  const params = new URLSearchParams();
  if (storedLocation) params.append('hubId', storedLocation);

  return await apiFetch(
    `/api/mileapp/vehicles/types?${params.toString()}`,
    'Gagal memproses perhitungan types truck storage'
  );
}

export async function updateVehicleType(id, name) {
  return await apiFetch('/api/mileapp/vehicles/types', 'Gagal mengubah tipe kendaraan', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, name }),
  });
}

export async function deleteVehicleType(id) {
  const params = new URLSearchParams();
  if (id) params.append('id', id);

  return await apiFetch(
    `/api/mileapp/vehicles/types?${params.toString()}`,
    'Gagal menghapus tipe kendaraan',
    {
      method: 'DELETE',
    }
  );
}

// vehicle non tms
export async function getTruckNonTms({ startDate, endDate }) {
  const { storedLocation } = getLocalStorage();
  const params = new URLSearchParams();
  if (storedLocation) params.append('hubId', storedLocation);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  return await apiFetch(
    `/api/mileapp/vehicles/non-tms?${params.toString()}`,
    'Gagal mengambil data truck usage'
  );
}

export async function postTruckNonTms(payload) {
  return await apiFetch('/api/mileapp/vehicles/non-tms', 'Gagal menyimpan data penggunaan truk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function deleteTruckNonTms(payload) {
  return await apiFetch('/api/mileapp/vehicles/non-tms', 'Gagal menghapus data penggunaan truk', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
