// File: src/lib/api/trash.js
import { apiFetch } from '../base';

export async function getTrash() {
  const params = new URLSearchParams();
  params.append('limit', 10000);

  return await apiFetch(
    `/api/mileapp/trash?${params.toString()}`,
    'Gagal mengambil data trash'
  );
}
