import { apiFetch } from './base';

export async function getVehicles({ hubId, limit }) {
  const params = new URLSearchParams();
  if (hubId) params.append('hubId', hubId);
  if (limit) params.append('limit', limit);

  return await apiFetch(`/api/get-vehicles?${params.toString()}`, 'Gagal mengambil data vehicles');
}

export async function getLocationHistories({
  timeFrom,
  timeTo,
  limit,
  startFinish,
  fields,
  timeBy,
}) {
  const params = new URLSearchParams();
  if (timeFrom) params.append('timeFrom', timeFrom);
  if (timeTo) params.append('timeTo', timeTo);
  if (limit) params.append('limit', limit);
  if (startFinish) params.append('startFinish', startFinish);
  if (fields) params.append('fields', fields);
  if (timeBy) params.append('timeBy', timeBy);

  return await apiFetch(
    `/api/get-location-histories?${params.toString()}`,
    'Gagal mengambil data location histories'
  );
}

export async function getBatchHistories(resultIds) {
  return await apiFetch('/api/get-batch-histories', 'Gagal mengambil data batch histories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resultIds }),
  });
}
