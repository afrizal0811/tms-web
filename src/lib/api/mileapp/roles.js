import { apiFetch } from '../base';

export async function getRoles() {
  return await apiFetch('/api/mileapp/roles', 'Gagal mengambil data roles');
}

export async function postRoles() {
  return await apiFetch('/api/mileapp/roles', 'Gagal sinkronisasi data roles dengan vendor', {
    method: 'POST',
  });
}
