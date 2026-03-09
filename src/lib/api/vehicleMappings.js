import { apiFetch } from './base';

// Ditambahkan parameter opsional hubId
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

// Fungsi Baru: Edit 1 Kendaraan
export async function updateVehicleMapping(plat, mappedType) {
  return await apiFetch('/api/vehicle-mappings', 'Gagal mengubah pemetaan kendaraan', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plat, mappedType }),
  });
}

// Fungsi Baru: Hapus 1 Kendaraan
export async function deleteVehicleMapping(plat) {
  return await apiFetch(
    `/api/vehicle-mappings?plat=${encodeURIComponent(plat)}`,
    'Gagal menghapus pemetaan kendaraan',
    {
      method: 'DELETE',
    }
  );
}
