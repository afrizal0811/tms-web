import { apiFetch } from './base';

export async function getRoles() {
  return await apiFetch('/api/get-roles', 'Gagal mengambil data roles');
}

export async function postRoles() {
  return await apiFetch('/api/get-roles', 'Gagal sinkronisasi data roles dengan vendor', {
    method: 'POST',
  });
}
