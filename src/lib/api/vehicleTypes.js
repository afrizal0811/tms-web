import { apiFetch } from './base';

export async function getVehicleTypes() {
  return await apiFetch('/api/vehicle-types', 'Gagal mengambil data tipe kendaraan');
}

export async function createVehicleType(name) {
  return await apiFetch('/api/vehicle-types', 'Gagal menambah tipe kendaraan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
}

export async function updateVehicleType(id, name) {
  return await apiFetch('/api/vehicle-types', 'Gagal mengubah tipe kendaraan', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, name }),
  });
}

export async function deleteVehicleType(id) {
  return await apiFetch(`/api/vehicle-types?id=${id}`, 'Gagal menghapus tipe kendaraan', {
    method: 'DELETE',
  });
}
