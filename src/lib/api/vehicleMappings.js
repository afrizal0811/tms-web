import { apiFetch } from './base';

export async function getVehicleMappings(hubId = null) {
  const params = new URLSearchParams();
  if (hubId) params.append('hubId', hubId);

  const queryString = params.toString() ? `?${params.toString()}` : '';
  return await apiFetch(
    `/api/vehicle-mappings${queryString}`,
    'Gagal mengambil data pemetaan kendaraan'
  );
}

export async function postVehicleMappings(mappingsArray) {
  return await apiFetch('/api/vehicle-mappings', 'Gagal menyimpan pemetaan kendaraan', {
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
  let res = await fetch('/api/vehicle-mappings', { method: 'PUT', ...options });
  if (!res.ok) {
    res = await fetch('/api/vehicle-mappings', { method: 'PATCH', ...options });
  }
  if (!res.ok) {
    throw new Error('Gagal mengubah pemetaan kendaraan');
  }
  return true;
}

export async function deleteVehicleMapping(id, plat) {
  const params = new URLSearchParams();
  if (plat) params.append('plat', plat);

  return await apiFetch(
    `/api/vehicle-mappings?${params.toString()}`,
    'Gagal menghapus pemetaan kendaraan',
    {
      method: 'DELETE',
    }
  );
}
