// File: src/lib/api/trash.js
import { apiFetch } from './base';

export async function getTrash(limit = 1000) {
  const params = new URLSearchParams();
  params.append('limit', limit);

  return await apiFetch(`/api/get-trash?${params.toString()}`, 'Gagal mengambil data trash');
}
