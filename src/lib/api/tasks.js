import { apiFetch } from './base';

export async function getResultsSummary({ dateFrom, dateTo, hubId, limit }) {
  const params = new URLSearchParams();
  if (dateFrom) params.append('dateFrom', dateFrom);
  if (dateTo) params.append('dateTo', dateTo);
  if (hubId) params.append('hubId', hubId);
  if (limit) params.append('limit', limit);

  return await apiFetch(
    `/api/get-results-summary?${params.toString()}`,
    'Gagal mengambil data results'
  );
}

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
