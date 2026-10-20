import { apiFetch } from '../base';
import { getLocalStorage } from '@/lib/localStorageHandler';

export async function getRoles() {
  return await apiFetch('/api/mileapp/roles', 'Gagal mengambil data roles');
}

export async function postRoles(customUpdateBy) {
  const { storedUser } = getLocalStorage();
  const updateBy = customUpdateBy !== undefined ? customUpdateBy : storedUser?.name;
  return await apiFetch('/api/mileapp/roles', 'Gagal sinkronisasi data roles dengan vendor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ updateBy }),
  });
}

export async function patchRolePaths(id, paths) {
  return await apiFetch('/api/mileapp/roles', 'Gagal update hak akses role', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, paths }),
  });
}
