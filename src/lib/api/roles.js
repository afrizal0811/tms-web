import { apiFetch, API_BASE_URL } from './base';

export async function getRoles() {
  return await apiFetch(`${API_BASE_URL}/get-roles`, 'Gagal mengambil data roles');
}

export async function syncRolesData() {
  return await apiFetch(
    `${API_BASE_URL}/get-roles`,
    'Gagal sinkronisasi data roles dengan vendor',
    {
      method: 'POST',
    }
  );
}
