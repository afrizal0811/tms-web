import { apiFetch } from './base';

export async function getReasons() {
  return await apiFetch('/api/reasons', 'Gagal mengambil data reasons');
}

export async function postReason(reasons, pic) {
  return await apiFetch('/api/reasons', 'Gagal menambah reason', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reasons, pic }),
  });
}

export async function updateReason(id, reasons, pic) {
  return await apiFetch('/api/reasons', 'Gagal mengubah reason', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, reasons, pic }),
  });
}

export async function deleteReason(id) {
  const params = new URLSearchParams();
  if (id) params.append('id', id);

  return await apiFetch(`/api/reasons?${params.toString()}`, 'Gagal menghapus reason', {
    method: 'DELETE',
  });
}
