import { apiFetch } from './base';

export async function getUsers({ hubId, roleId, status }) {
  const params = new URLSearchParams();
  if (hubId) params.append('hubId', hubId);
  if (roleId) params.append('roleId', roleId);
  if (status) params.append('status', status);

  return await apiFetch(`/api/get-users?${params.toString()}`, 'Gagal mengambil data users');
}

export async function getUser(email, hubId) {
  const params = new URLSearchParams();
  params.append('q', email);
  params.append('status', 'active');

  if (hubId) {
    params.append('hubId', hubId);
  }

  return await apiFetch(
    `/api/get-users?${params.toString()}`,
    'Email tidak ditemukan di lokasi ini atau akun tidak aktif'
  );
}
