import { apiFetch } from './base';

export async function getHubs() {
  return await apiFetch('/api/get-hubs', 'Gagal mengambil data hubs');
}

export async function syncHubsData() {
  return await apiFetch('/api/get-hubs', 'Gagal sinkronisasi data hubs dengan vendor', {
    method: 'POST',
  });
}
