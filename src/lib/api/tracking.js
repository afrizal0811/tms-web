import { apiFetch } from './base';

export const getTrackingData = () => {
  return apiFetch(`/api/tracking?t=${Date.now()}`, 'Gagal mengambil data tracking');
};

export const getMCEasyData = (endpoint, params = {}) => {
  const query = new URLSearchParams(params).toString();
  const fullEndpoint = query ? `${endpoint}?${query}` : endpoint;
  return apiFetch(
    `/api/mceasy?endpoint=${encodeURIComponent(fullEndpoint)}`,
    `Gagal mengambil data MCEasy: ${endpoint}`
  );
};
