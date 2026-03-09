import { apiFetch } from './base';

export async function getVehicleMappings() {
  return await apiFetch('/api/vehicle-mappings', 'Gagal mengambil data pemetaan kendaraan');
}

export async function saveVehicleMappings(mappingsArray) {
  return await apiFetch('/api/vehicle-mappings', 'Gagal menyimpan pemetaan kendaraan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mappingsArray),
  });
}
