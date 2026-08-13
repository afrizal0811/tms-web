import { apiFetch } from './base';
import { fields } from './fields';

export async function getVehicles({ hubId, limit }) {
  const params = new URLSearchParams();
  if (hubId) params.append('hubId', hubId);
  if (limit) params.append('limit', limit);

  return await apiFetch(`/api/get-vehicles?${params.toString()}`, 'Gagal mengambil data vehicles');
}

export async function getLocationHistories({
  timeFrom,
  timeTo,
  limit = 10000,
  startFinish,
  timeBy,
}) {
  const locationsFields = fields.locations.join(',');
  const params = new URLSearchParams();
  
  if (timeFrom) params.append('timeFrom', timeFrom);
  if (timeTo) params.append('timeTo', timeTo);
  if (limit) params.append('limit', limit);
  if (startFinish) params.append('startFinish', startFinish);
  if (locationsFields) params.append('fields', locationsFields);
  if (timeBy) params.append('timeBy', timeBy);

  return await apiFetch(
    `/api/get-location-histories?${params.toString()}`,
    'Gagal mengambil data location histories'
  );
}
