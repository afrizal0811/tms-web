// File: src/lib/api/vehicleMappings.js
import { apiFetch } from './base';

export async function getVehicleMappings(hubId = null) {
  const param = hubId ? `?hubId=${hubId}` : '';
  return await apiFetch(`/api/vehicle-mappings${param}`, 'Gagal mengambil data pemetaan kendaraan');
}

export async function saveVehicleMappings(mappingsArray) {
  return await apiFetch('/api/vehicle-mappings', 'Gagal menyimpan pemetaan kendaraan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mappingsArray),
  });
}

// === KUNCI PERBAIKAN: Menggunakan native fetch untuk membypass JSON parser apiFetch ===
export async function updateVehicleMapping(id, plat, mappedType) {
  const payload = { id, plat, mappedType };

  // 1. Coba gunakan metode PUT terlebih dahulu
  let res = await fetch('/api/vehicle-mappings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  // 2. Jika API menolak PUT (misal: 405 Method Not Allowed), coba gunakan PATCH
  if (!res.ok) {
    res = await fetch('/api/vehicle-mappings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  // 3. Jika API benar-benar gagal, lemparkan error
  if (!res.ok) {
    throw new Error('Gagal mengubah pemetaan kendaraan');
  }

  // 4. Langsung return true jika sukses tanpa mem-parsing JSON agar tidak error
  return true;
}

export async function deleteVehicleMapping(id, plat) {
  return await apiFetch(
    `/api/vehicle-mappings?plat=${encodeURIComponent(plat)}`,
    'Gagal menghapus pemetaan kendaraan',
    {
      method: 'DELETE',
    }
  );
}
