import { getLocalStorage } from '@/lib/localStorageHandler';
import { apiFetch } from '../base';
import { fields } from './fields';

export async function getTasks({ status, timeFrom, timeTo, isNeedFields = true, isShowAll = false }) {
  const { storedLocation } = getLocalStorage();
  const tasksFields = fields.tasks.join(',');
  const params = new URLSearchParams();
  params.append('timeBy', 'startTime');
  params.append('limit', 10000);
  if (!isShowAll && storedLocation) params.append('hubId', storedLocation);
  if (status) params.append('status', status);
  if (timeFrom) params.append('timeFrom', timeFrom);
  if (timeTo) params.append('timeTo', timeTo);
  if (isNeedFields && tasksFields) params.append('fields', tasksFields);

  return await apiFetch(`/api/mileapp/tasks?${params.toString()}`, 'Gagal mengambil data tasks');
}

export async function getTask(id) {
  if (!id) {
    throw new Error('ID task harus disertakan');
  }

  const result = await apiFetch(
    `/api/mileapp/tasks/${id}`,
    `Gagal mengambil data task dengan ID ${id}`
  );

  return result;
}
