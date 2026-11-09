import { getLocalStorage } from '@/lib/localStorageHandler';
import { apiFetch } from '../base';

export async function getReasons() {
  return await apiFetch('/api/mileapp/reasons', 'Gagal mengambil data reasons');
}

export async function postReason(reasons, pic, category, customUpdateBy) {
  const { storedUser } = getLocalStorage();
  const updateBy = customUpdateBy !== undefined ? customUpdateBy : storedUser?.name || 'System';
  return await apiFetch('/api/mileapp/reasons', 'Gagal menambah reason', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reasons, pic, category, updateBy }),
  });
}

export async function updateReason(id, reasons, pic, category, customUpdateBy) {
  const { storedUser } = getLocalStorage();
  const updateBy = customUpdateBy !== undefined ? customUpdateBy : storedUser?.name || 'System';
  return await apiFetch('/api/mileapp/reasons', 'Gagal mengubah reason', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, reasons, pic, category, updateBy }),
  });
}

export async function deleteReason(id) {
  const params = new URLSearchParams();
  if (id) params.append('id', id);

  return await apiFetch(`/api/mileapp/reasons?${params.toString()}`, 'Gagal menghapus reason', {
    method: 'DELETE',
  });
}
