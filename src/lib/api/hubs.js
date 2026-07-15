import { apiFetch, API_BASE_URL } from './base';

export async function getHubs() {
  return await apiFetch(`${API_BASE_URL}/get-hubs`, 'Gagal mengambil data hubs');
}

export async function syncHubsData() {
  return await apiFetch(`${API_BASE_URL}/get-hubs`, 'Gagal sinkronisasi data hubs dengan vendor', {
    method: 'POST',
  });
}

export async function updateHubSettings(id, data) {
  return await apiFetch(`${API_BASE_URL}/get-hubs`, 'Gagal memperbarui pengaturan cabang', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data }),
  });
}
