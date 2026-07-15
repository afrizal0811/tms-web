// File: src/lib/api/vehicleMappings.js
import { apiFetch, API_BASE_URL } from './base';

export async function getVehicleMappings(hubId = null) {
  const param = hubId ? `?hubId=${hubId}` : '';
  return await apiFetch(
    `${API_BASE_URL}/vehicle-mappings${param}`,
    'Gagal mengambil data pemetaan kendaraan'
  );
}

export async function saveVehicleMappings(mappingsArray) {
  return await apiFetch(`${API_BASE_URL}/vehicle-mappings`, 'Gagal menyimpan pemetaan kendaraan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mappingsArray),
  });
}

export async function updateVehicleMapping(id, plat, mappedType) {
  const payload = { id, plat, mappedType };

  let res = await fetch(`${API_BASE_URL}/vehicle-mappings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    res = await fetch(`${API_BASE_URL}/vehicle-mappings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  if (!res.ok) {
    throw new Error('Gagal mengubah pemetaan kendaraan');
  }

  return true;
}

export async function deleteVehicleMapping(id, plat) {
  return await apiFetch(
    `${API_BASE_URL}/vehicle-mappings?plat=${encodeURIComponent(plat)}`,
    'Gagal menghapus pemetaan kendaraan',
    {
      method: 'DELETE',
    }
  );
}
