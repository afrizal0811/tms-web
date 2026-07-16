import { apiFetch } from './base';
import { fieldsApi } from './fieldsApi';

export async function getHubs() {
  const params = new URLSearchParams();

  if (fieldsApi.hub && fieldsApi.hub.length > 0) {
    params.append('fields', fieldsApi.hub.join(','));
  }

  return await apiFetch(`/api/get-hubs?${params.toString()}`, 'Gagal mengambil data hubs');
}

export async function postHubs() {
  return await apiFetch('/api/get-hubs', 'Gagal sinkronisasi data hubs dengan vendor', {
    method: 'POST',
  });
}

export async function patchHubs(id, data) {
  return await apiFetch('/api/get-hubs', 'Gagal memperbarui pengaturan cabang', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data }),
  });
}
