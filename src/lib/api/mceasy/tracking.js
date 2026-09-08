import { apiFetch } from '../base';

export const getTrackingData = () => {
  return apiFetch(`/api/mceasy/tracking?t=${Date.now()}`, 'Gagal mengambil data tracking webhook');
};
