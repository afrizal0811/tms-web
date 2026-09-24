import { getLocalStorage } from '@/lib/localStorageHandler';
import { apiFetch } from '../base';

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

// vehicle mapping
export async function getVehicleMappings(hubId = null) {
  const params = new URLSearchParams();
  if (hubId) params.append('hubId', hubId);

  const queryString = params.toString() ? `?${params.toString()}` : '';
  return await apiFetch(
    `/api/mileapp/vehicles/mappings${queryString}`,
    'Gagal mengambil data pemetaan kendaraan'
  );
}

export async function postVehicleMappings(mappingsArray) {
  return await apiFetch('/api/mileapp/vehicles/mappings', 'Gagal menyimpan pemetaan kendaraan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mappingsArray),
  });
}

export async function updateVehicleMapping(id, plat, mappedType) {
  const payload = { id, plat, mappedType };
  const options = {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  };
  let res = await fetch('/api/mileapp/vehicles/mappings', { method: 'PUT', ...options });
  if (!res.ok) {
    res = await fetch('/api/mileapp/vehicles/mappings', { method: 'PATCH', ...options });
  }
  if (!res.ok) {
    throw new Error('Gagal mengubah pemetaan kendaraan');
  }
  return true;
}

export async function deleteVehicleMapping(id) {
  const params = new URLSearchParams();
  if (id) params.append('id', id);

  return await apiFetch(
    `/api/mileapp/vehicles/mappings?${params.toString()}`,
    'Gagal menghapus pemetaan kendaraan',
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
