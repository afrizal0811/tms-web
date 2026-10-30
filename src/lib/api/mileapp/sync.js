import { getLocalStorage } from '@/lib/localStorageHandler';
import { apiFetch } from '../base';

export async function syncOperationalData({
  deliveryDate,
  hubId,
  force = false,
  entities,
  created_by,
  updated_by,
} = {}) {
  const { storedLocation, storedUser } = getLocalStorage();
  const targetHubId = hubId !== undefined ? hubId : storedLocation;
  const userName = updated_by || created_by || storedUser?.name || null;

  return await apiFetch('/api/mileapp/sync', 'Gagal sinkronisasi data operasional', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deliveryDate,
      hubId: targetHubId,
      force,
      entities,
      created_by: userName,
      updated_by: userName,
    }),
  });
}

export const syncMasterData = syncOperationalData;
