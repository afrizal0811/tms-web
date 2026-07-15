import { apiFetch, API_BASE_URL } from './base';

export async function getDrivers(hubId) {
  const params = new URLSearchParams();
  if (hubId) params.append('hubId', hubId);

  // WAJIB pakai API_BASE_URL agar menembak ke Laravel
  return await apiFetch(
    `${API_BASE_URL}/get-drivers?${params.toString()}`,
    'Gagal mengambil data drivers dari DB'
  );
}

export async function syncDriversData(hubIds = []) {
  return await apiFetch(`${API_BASE_URL}/get-drivers`, 'Gagal sinkronisasi data drivers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hubIds }),
  });
}

export async function getDriversSyncStatus() {
  return await apiFetch(`${API_BASE_URL}/get-drivers/status`, 'Gagal mengambil status sync driver');
}
