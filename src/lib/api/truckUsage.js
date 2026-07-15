import { apiFetch, API_BASE_URL } from './base';

export async function upsertTruckUsage(payload) {
  return await apiFetch(`${API_BASE_URL}/truck-usage`, 'Gagal menyimpan data penggunaan truk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function deleteTruckUsage(payload) {
  return await apiFetch(`${API_BASE_URL}/truck-usage`, 'Gagal menghapus data penggunaan truk', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
