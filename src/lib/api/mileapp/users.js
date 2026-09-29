import { getLocalStorage } from '@/lib/localStorageHandler';
import { apiFetch } from '../base';

export async function getUsers(query, allHub = false, roleId) {
  const { storedLocation } = getLocalStorage();

  const params = new URLSearchParams();
  if (!allHub && storedLocation) params.append('hubId', storedLocation);
  if (query) params.append('q', query);
  if (roleId) params.append('roleId', roleId);

  return await apiFetch(`/api/mileapp/users?${params.toString()}`, 'Gagal mengambil data users');
}
