import { apiFetch } from '../base';

export const getOdometer = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiFetch(
    `/api/mceasy/odometer${query ? `?${query}` : ''}`,
    'Gagal mengambil data users MCEasy'
  );
};
