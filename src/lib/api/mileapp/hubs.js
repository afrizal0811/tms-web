import { apiFetch } from '../base';
import { getLocalStorage } from '@/lib/localStorageHandler';

export async function getHubs() {
  const { storedLocation } = getLocalStorage();
  const params = new URLSearchParams();
  if (storedLocation) params.append('hubId', storedLocation);

  return await apiFetch(`/api/mileapp/hubs?${params.toString()}`, 'Gagal mengambil data hubs');
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
