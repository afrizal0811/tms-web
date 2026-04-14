import { apiFetch } from './base';

export async function getHubs() {
  return await apiFetch('/api/get-hubs', 'Gagal mengambil data hubs');
}

export async function syncHubsData() {
  return await apiFetch('/api/get-hubs', 'Gagal sinkronisasi data hubs dengan vendor', {
    method: 'POST',
  });
}

export async function updateHubAcronym(id, acronym) {
  return await apiFetch('/api/get-hubs', 'Gagal memperbarui akronim cabang', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, acronym }),
  });
}
