// File: lib/api/results.js

import { formatDateUniversal } from '../utils';
import { apiFetch } from './base';

function getCutOffTime(dateObj, hasPartialRouting = false) {
  const isSaturday = dateObj.getDay() === 6;
  return {
    startTime: hasPartialRouting ? '07:00:00' : isSaturday ? '04:00:00' : '08:00:00',
    endTime: isSaturday ? '11:59:59' : '15:59:59',
  };
}

export async function getResultsSummary({
  dateFrom,
  dateTo,
  routingDateObj,
  deliveryDateObj,
  hubId,
  hasPartialRouting = false,
  limit = 10000,
}) {
  let finalDateFrom = dateFrom;
  let finalDateTo = dateTo;

  if (routingDateObj && deliveryDateObj) {
    const { startTime } = getCutOffTime(routingDateObj, hasPartialRouting);
    const { endTime } = getCutOffTime(deliveryDateObj, hasPartialRouting);

    const startStr = formatDateUniversal(routingDateObj, 'YYYY-MM-DD');
    const endStr = formatDateUniversal(deliveryDateObj, 'YYYY-MM-DD');

    finalDateFrom = `${startStr} ${startTime}`;
    finalDateTo = `${endStr} ${endTime}`;
  }

  const params = new URLSearchParams();
  if (finalDateFrom) params.append('dateFrom', finalDateFrom);
  if (finalDateTo) params.append('dateTo', finalDateTo);
  if (hubId) params.append('hubId', hubId);
  if (limit) params.append('limit', limit);

  const results = await apiFetch(
    `/api/get-results-summary?${params.toString()}`,
    'Gagal mengambil data results'
  );

  return (results || []).filter((item) => item.dispatchStatus?.toLowerCase() === 'done');
}

export async function getResult(id) {
  if (!id) {
    throw new Error('ID result harus disertakan');
  }

  const params = new URLSearchParams();
  params.append('id', id);

  const result = await apiFetch(
    `/api/get-result?${params.toString()}`,
    `Gagal mengambil data result dengan ID ${id}`
  );

  return result;
}

export async function getResultHistories(resultIds) {
  return await apiFetch('/api/get-result-histories', 'Gagal mengambil data batch histories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resultIds }),
  });
}
