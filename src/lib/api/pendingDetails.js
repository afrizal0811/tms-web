import { apiFetch, API_BASE_URL } from './base';

export async function getPendingDetails(startDate, endDate) {
  return await apiFetch(
    `${API_BASE_URL}/pending-details?startDate=${startDate}&endDate=${endDate}`,
    'Gagal mengambil data detail pending'
  );
}

export async function upsertPendingDetail(data) {
  return await apiFetch(`${API_BASE_URL}/pending-details`, 'Gagal menyimpan detail pending', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function deletePendingDetail(taskId) {
  return await apiFetch(
    `${API_BASE_URL}/pending-details?taskId=${taskId}`,
    'Gagal menghapus detail pending',
    {
      method: 'DELETE',
    }
  );
}
