import { apiFetch } from '../base';

export async function postTruckUsage(payload) {
  return await apiFetch('/api/mileapp/truck-usage', 'Gagal menyimpan data penggunaan truk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function deleteTruckUsage(payload) {
  return await apiFetch('/api/mileapp/truck-usage', 'Gagal menghapus data penggunaan truk', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
