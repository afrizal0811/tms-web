// File: src/lib/api/pendingDetails.js
import { apiFetch } from './base';

export async function getPendingDetails(startDate, endDate) {
  return await apiFetch(
    `/api/pending-details?startDate=${startDate}&endDate=${endDate}`,
    'Gagal mengambil data detail pending'
  );
}

export async function upsertPendingDetail(data) {
  return await apiFetch('/api/pending-details', 'Gagal menyimpan detail pending', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

// TAMBAHKAN FUNGSI INI
export async function deletePendingDetail(taskId) {
  return await apiFetch(`/api/pending-details?taskId=${taskId}`, 'Gagal menghapus detail pending', {
    method: 'DELETE',
  });
}
