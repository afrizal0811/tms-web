// File: src/lib/api/reasons.js
import { apiFetch } from './base';

const LOCAL_API = process.env.NEXT_PUBLIC_LOCAL_URL || 'http://127.0.0.1:8000/api';

export async function getReasons() {
  return await apiFetch('/api/reasons', 'Gagal mengambil data reasons');
}

export async function createReason(reasons, pic) {
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
  return await apiFetch(`/api/reasons?id=${id}`, 'Gagal menghapus reason', {
    method: 'DELETE',
  });
}
