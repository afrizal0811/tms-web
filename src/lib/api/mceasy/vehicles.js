import { apiFetch } from '../base';

export const getVehiclesStatuses = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiFetch(
    `/api/mceasy/vehicles/statuses${query ? `?${query}` : ''}`,
    'Gagal mengambil data vehicles MCEasy'
  );
};

export const patchVehicle = async (id, payloadStr) => {
  const res = await fetch(`/api/mceasy/vehicles/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: payloadStr,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    let errMsg = errData.detail || errData.message || 'Gagal update kendaraan MCEasy';
    if (typeof errMsg === 'string') errMsg = errMsg.replace(/Error:\s*\\?"?|\\?"?$/g, '').trim();
    throw new Error(errMsg);
  }
  return res.json();
};
