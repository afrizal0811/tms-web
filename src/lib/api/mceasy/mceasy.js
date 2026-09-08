import { apiFetch } from '../base';

export const getTrackingData = () => {
  return apiFetch(`/api/mceasy/tracking?t=${Date.now()}`, 'Gagal mengambil data tracking webhook');
};

export const getMceasyData = (endpoint, params = {}) => {
  const customLocation = params.location;
  if (customLocation) delete params.location;

  const query = new URLSearchParams(params).toString();
  const fullEndpoint = query ? `${endpoint}?${query}` : endpoint;

  const targetParams = new URLSearchParams({ endpoint: fullEndpoint });
  if (customLocation) targetParams.append('location', customLocation);

  return apiFetch(
    `/api/mceasy?${targetParams.toString()}`,
    `Gagal mengambil data MCEasy: ${endpoint}`
  );
};
