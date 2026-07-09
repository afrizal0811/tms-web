import { apiFetch } from './base';

export async function getTasks({ hubId, status, timeFrom, timeTo, timeBy, limit }) {
  const params = new URLSearchParams();
  if (hubId) params.append('hubId', hubId);
  if (status) params.append('status', status);
  if (timeFrom) params.append('timeFrom', timeFrom);
  if (timeTo) params.append('timeTo', timeTo);
  if (timeBy) params.append('timeBy', timeBy);
  if (limit) params.append('limit', limit);

  return await apiFetch(`/api/get-tasks?${params.toString()}`, 'Gagal mengambil data tasks');
}