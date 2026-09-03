import { apiFetch } from './base';

export async function getUsers(hubId, query, roleId) {
  const params = new URLSearchParams();
  if (hubId) params.append('hubId', hubId);
  if (query) params.append('q', query);
  if (roleId) params.append('roleId', roleId);

  return await apiFetch(`/api/get-users?${params.toString()}`, 'Gagal mengambil data users');
}
