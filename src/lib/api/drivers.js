import { apiFetch } from './base';

export async function getDrivers(hubId) {
  const params = new URLSearchParams();
  if (hubId) params.append('hubId', hubId);
  return await apiFetch(
    `/api/get-drivers?${params.toString()}`,
    'Gagal mengambil data drivers dari DB'
  );
}

export async function getDriverStatus() {
  return await apiFetch('/api/get-drivers/status', 'Gagal mengambil status sync driver');
}

export async function postDrivers(hubIds = []) {
  return await apiFetch('/api/get-drivers', 'Gagal sinkronisasi data drivers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hubIds }),
  });
}
