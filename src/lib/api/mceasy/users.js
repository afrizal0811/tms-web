import { apiFetch } from '../base';

export const getUsers = (params = {}) => {
  const defaultParams = {
    show: 10000,
    'is-active': true,
    'order-by': 'fullname:asc',
  };
  const mergedParams = { ...defaultParams, ...params };
  const query = new URLSearchParams(mergedParams).toString();
  return apiFetch(
    `/api/mceasy/users${query ? `?${query}` : ''}`,
    'Gagal mengambil data users MCEasy'
  );
};
