import { apiFetch } from '../base';
import { fields } from './fields';

export async function getVehicles({ hubId, limit }) {
  const params = new URLSearchParams();
  if (hubId) params.append('hubId', hubId);
  if (limit) params.append('limit', limit);

  return await apiFetch(
    `/api/mileapp/vehicles?${params.toString()}`,
    'Gagal mengambil data vehicles'
  );
}

export async function getLocationHistories({ timeFrom, timeTo }) {
  const locationsFields = fields.locations.join(',');
  const params = new URLSearchParams();
  params.append('timeBy', 'createdTime');
  params.append('limit', 10000);
  params.append('startFinish', 'true');
  if (timeFrom) params.append('timeFrom', timeFrom);
  if (timeTo) params.append('timeTo', timeTo);
  if (locationsFields) params.append('fields', locationsFields);

  return await apiFetch(
    `/api/mileapp/location-histories?${params.toString()}`,
    'Gagal mengambil data location histories'
  );
}
