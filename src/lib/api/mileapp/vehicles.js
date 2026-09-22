import { getLocalStorage } from '@/lib/localStorageHandler';
import { apiFetch } from '../base';
import { fields } from './fields';

export async function getLocationHistories({ timeFrom, timeTo }) {
  const { storedLocation } = getLocalStorage();
  const locationsFields = fields.locations.join(',');
  const params = new URLSearchParams();
  params.append('timeBy', 'createdTime');
  params.append('limit', 10000);
  params.append('startFinish', 'true');
  if (timeFrom) params.append('timeFrom', timeFrom);
  if (timeTo) params.append('timeTo', timeTo);
  if (locationsFields) params.append('fields', locationsFields);
  if (storedLocation) params.append('hubId', storedLocation);
  return await apiFetch(
    `/api/mileapp/vehicles/location-histories?${params.toString()}`,
    'Gagal mengambil data location histories'
  );
}
