import { apiFetch } from '../base';

export async function getHubs() {
  return await apiFetch('/api/mileapp/hubs', 'Gagal mengambil data hubs');
}

export async function postHubs() {
  return await apiFetch('/api/mileapp/hubs', 'Gagal sinkronisasi data hubs dengan vendor', {
    method: 'POST',
  });
}

export async function patchHubs(id, data) {
  return await apiFetch('/api/mileapp/hubs', 'Gagal memperbarui pengaturan cabang', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data }),
  });
}
