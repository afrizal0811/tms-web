import { apiFetch } from '../base';

export async function processKpiData(payload) {
  return await apiFetch('/api/mileapp/kpi', 'Gagal memproses data KPI', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function getKpiData(params = {}) {
  const q = new URLSearchParams();
  if (params.hubId) q.append('hubId', params.hubId);
  if (params.date) q.append('date', params.date);
  if (params.dateFrom) q.append('dateFrom', params.dateFrom);
  if (params.dateTo) q.append('dateTo', params.dateTo);

  return await apiFetch(
    `/api/mileapp/kpi?${q.toString()}`,
    'Gagal mengambil data KPI dari database'
  );
}

