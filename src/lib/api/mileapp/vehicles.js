import { apiFetch } from '../base';


export async function createVehicleType(name) {
  return await apiFetch('/api/mileapp/vehicles/types', 'Gagal menambah tipe kendaraan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
}

export async function getVehicleMappings(hubId = null) {
  const params = new URLSearchParams();
  if (hubId) params.append('hubId', hubId);

  const queryString = params.toString() ? `?${params.toString()}` : '';
  return await apiFetch(
    `/api/mileapp/vehicles/mappings${queryString}`,
    'Gagal mengambil data pemetaan kendaraan'
  );
}

export async function getVehicleTypes() {
  return await apiFetch('/api/mileapp/vehicles/types', 'Gagal mengambil data tipe kendaraan');
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

export async function updateVehicleType(id, name) {
  return await apiFetch('/api/mileapp/vehicles/types', 'Gagal mengubah tipe kendaraan', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, name }),
  });
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
