import { toastError } from './toastHelper';

/**
 * Helper internal untuk menangani fetch, parsing, dan error.
 */
async function apiFetch(url, errorMessage) {
  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || errorMessage);
    }

    // Untuk get-tasks, get-location-histories
    if (data && data.tasks && Array.isArray(data.tasks.data)) {
      return data.tasks.data;
    }
    // Untuk get-results-summary
    if (data && data.data && Array.isArray(data.data.data)) {
      return data.data.data;
    }
    // Untuk getUsers, getVehicles
    if (data && Array.isArray(data.data)) {
      return data.data;
    }
    // Untuk getHubs
    if (Array.isArray(data)) {
      return data;
    }

    if ((data && data.data === null) || (data && data.tasks === null)) {
      return [];
    }

    throw new Error(`Format data API tidak dikenal dari ${url}`);
  } catch (err) {
    toastError(err.message);
    throw err;
  }
}

export async function getHubs() {
  return await apiFetch('/api/get-hubs', 'Gagal mengambil data hubs');
}

export async function getUsers({ hubId, roleId, status }) {
  const params = new URLSearchParams();
  if (hubId) params.append('hubId', hubId);
  if (roleId) params.append('roleId', roleId);
  if (status) params.append('status', status);

  return await apiFetch(`/api/get-users?${params.toString()}`, 'Gagal mengambil data users');
}

/**
 * Mengambil data user berdasarkan email (q).
 */
export async function getUsersByEmail(email, hubId) {
  const params = new URLSearchParams();
  params.append('q', email);
  params.append('status', 'active');

  // Tambahkan hubId agar pencarian terbatas pada lokasi yang dipilih
  if (hubId) {
    params.append('hubId', hubId);
  }

  return await apiFetch(
    `/api/get-users?${params.toString()}`,
    'Email tidak ditemukan di lokasi ini atau akun tidak aktif'
  );
}

export async function getVehicles({ hubId, limit }) {
  const params = new URLSearchParams();
  if (hubId) params.append('hubId', hubId);
  if (limit) params.append('limit', limit);

  return await apiFetch(`/api/get-vehicles?${params.toString()}`, 'Gagal mengambil data vehicles');
}

export async function getResultsSummary({ dateFrom, dateTo, hubId, limit }) {
  const params = new URLSearchParams();
  if (dateFrom) params.append('dateFrom', dateFrom);
  if (dateTo) params.append('dateTo', dateTo);
  if (hubId) params.append('hubId', hubId);
  if (limit) params.append('limit', limit);

  return await apiFetch(
    `/api/get-results-summary?${params.toString()}`,
    'Gagal mengambil data results'
  );
}

export async function getTasks({ hubId, status, timeFrom, timeTo, timeBy, limit }) {
  const params = new URLSearchParams();
  if (hubId) params.append('hubId', hubId);
  if (status) params.append('status', status);
  if (timeFrom) params.append('timeFrom', timeFrom);
  if (timeTo) params.append('timeTo', timeTo);
  if (timeBy) params.append('timeBy', timeBy);
  if (limit) params.append('limit', limit);

  return await apiFetch(`/api/get-tasks?${params.toString()}`, 'Gagal mengambil data tasks');
}

export async function getLocationHistories({
  timeFrom,
  timeTo,
  limit,
  startFinish,
  fields,
  timeBy,
}) {
  const params = new URLSearchParams();
  if (timeFrom) params.append('timeFrom', timeFrom);
  if (timeTo) params.append('timeTo', timeTo);
  if (limit) params.append('limit', limit);
  if (startFinish) params.append('startFinish', startFinish);
  if (fields) params.append('fields', fields);
  if (timeBy) params.append('timeBy', timeBy);

  return await apiFetch(
    `/api/get-location-histories?${params.toString()}`,
    'Gagal mengambil data location histories'
  );
}
