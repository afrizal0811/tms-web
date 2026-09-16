import { apiFetch } from '../base';

export async function getRoles() {
  return await apiFetch('/api/mileapp/roles', 'Gagal mengambil data roles');
}

export async function postRoles() {
  return await apiFetch('/api/mileapp/roles', 'Gagal sinkronisasi data roles dengan vendor', {
    method: 'POST',
  });
}

export async function patchRolePaths(id, paths) {
  return await apiFetch('/api/mileapp/roles', 'Gagal update hak akses role', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, paths }),
  });
}
