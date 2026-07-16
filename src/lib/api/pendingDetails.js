import { apiFetch } from './base';

export async function getPendingDetails(startDate, endDate) {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  return await apiFetch(
    `/api/pending-details?${params.toString()}`,
    'Gagal mengambil data detail pending'
  );
}

export async function postPendingDetail(data) {
  return await apiFetch('/api/pending-details', 'Gagal menyimpan detail pending', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function deletePendingDetail(taskId) {
  const params = new URLSearchParams();
  if (taskId) params.append('taskId', taskId);

  return await apiFetch(`/api/pending-details?${params.toString()}`, 'Gagal menghapus detail pending', {
    method: 'DELETE',
  });
}