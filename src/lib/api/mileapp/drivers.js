import { getLocalStorage } from '@/lib/localStorageHandler';
import { apiFetch } from '../base';
import { getVehiclesStatuses, getUsers as getMceasyUsers } from '../mceasy';

export async function getDrivers(customHubId) {
  const { storedLocation } = getLocalStorage();
  const hubId = customHubId !== undefined ? customHubId : storedLocation;
  const params = new URLSearchParams();
  if (hubId && hubId !== 'all') params.append('hubId', hubId);
  return await apiFetch(`/api/mileapp/drivers?${params.toString()}`, 'Gagal mengambil data driver');
}

export async function postDrivers(hubIds = [], customUpdateBy) {
  const { storedUser } = getLocalStorage();
  const updateBy = customUpdateBy !== undefined ? customUpdateBy : storedUser?.name;
  return await apiFetch('/api/mileapp/drivers', 'Gagal sinkronisasi data driver', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hubIds, updateBy }),
  });
}

export async function patchDrivers(updates, customUpdateBy) {
  const { storedUser } = getLocalStorage();
  const updateBy = customUpdateBy !== undefined ? customUpdateBy : storedUser?.name;
  return await apiFetch('/api/mileapp/drivers', 'Gagal update data driver', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ updates, updateBy }),
  });
}

export async function deleteDriver(id) {
  const params = new URLSearchParams();
  if (id) params.append('id', id);
  return await apiFetch(`/api/mileapp/drivers?${params.toString()}`, 'Gagal menghapus driver', {
    method: 'DELETE',
  });
}

export const getDriverList = getDrivers;
export const postDriverList = postDrivers;
export const patchDriverList = patchDrivers;
export const deleteDriverList = deleteDriver;

export async function getDriverStatus() {
  const { storedLocation } = getLocalStorage();
  const params = new URLSearchParams();
  if (storedLocation) params.append('hubId', storedLocation);

  return await apiFetch(
    `/api/mileapp/drivers/status?${params.toString()}`,
    'Gagal mengambil status sync driver'
  );
}

export async function getLocationHistories({
  timeFrom,
  timeTo,
  date,
  dateFrom,
  dateTo,
  deliveryDate,
  hubId,
} = {}) {
  const { storedLocation } = getLocalStorage();
  const targetHubId = hubId !== undefined ? hubId : storedLocation;
  const params = new URLSearchParams();
  if (date || deliveryDate) params.append('date', date || deliveryDate);
  if (dateFrom) params.append('dateFrom', dateFrom);
  if (dateTo) params.append('dateTo', dateTo);
  if (timeFrom) params.append('timeFrom', timeFrom);
  if (timeTo) params.append('timeTo', timeTo);
  if (targetHubId && targetHubId !== 'all') params.append('hubId', targetHubId);
  return await apiFetch(
    `/api/mileapp/drivers/location-histories?${params.toString()}`,
    'Gagal mengambil data location histories'
  );
}

export async function syncLocationHistories({
  deliveryDate,
  hubId,
  timeFrom,
  timeTo,
  items,
  created_by,
  updated_by,
} = {}) {
  const { storedLocation, storedUser } = getLocalStorage();
  const targetHubId = hubId || storedLocation;
  const userName = updated_by || created_by || storedUser?.name || null;

  return await apiFetch(
    '/api/mileapp/drivers/location-histories',
    'Gagal sinkronisasi data riwayat lokasi pengemudi',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deliveryDate,
        hubId: targetHubId,
        timeFrom,
        timeTo,
        items,
        created_by: userName,
        updated_by: userName,
      }),
    }
  );
}

export async function patchDriverMceasy(activeHubId, storedLocationName, explicitMatches = null) {
  if (explicitMatches) {
    await apiFetch('/api/mileapp/drivers', 'Gagal update data MCEasy', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates: explicitMatches }),
    });
    return { success: true };
  }

  const rawLoc = (storedLocationName || '').replace(/^Hub\s+/i, '').trim();
  const targetLocation = rawLoc.toUpperCase() === 'GIIC' ? 'Cikarang' : rawLoc;
  const [mceasyVehicles, dbDrivers, mceasyUsersRes] = await Promise.all([
    getVehiclesStatuses({ location: targetLocation }).catch(() => []),
    getDrivers(activeHubId),
    getMceasyUsers({ 'position-name': 'Driver', limit: 10000, show: 10000 }).catch(() => []),
  ]);

  const rawUsers = mceasyUsersRes?.data || mceasyUsersRes || [];
  const mceasyUsers = Array.isArray(rawUsers) ? rawUsers : [];
  const mcVehicles = Array.isArray(mceasyVehicles) ? mceasyVehicles : [];
  const driversList = Array.isArray(dbDrivers) ? dbDrivers : [];

  const matched = [];

  driversList.forEach((driver) => {
    const driverEmail = (driver.email || '').toLowerCase().trim();
    const cleanDriverName = (driver.name || '')
      .replace(/^'[^']+'\s*/, '')
      .replace(/^(dry|frozen)[\s\-_]*/i, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    let matchedUser = null;

    if (driverEmail) {
      matchedUser = mceasyUsers.find((u) => (u.email || '').toLowerCase().trim() === driverEmail);
    }

    if (!matchedUser && cleanDriverName) {
      matchedUser = mceasyUsers.find((u) => {
        const uName = (u.fullname || u.name || '').replace(/\s+/g, ' ').trim().toLowerCase();
        return uName === cleanDriverName;
      });
    }

    let vmsId = matchedUser?.userId || matchedUser?.id || null;

    if (!vmsId && cleanDriverName) {
      const mcVehMatch = mcVehicles.find((mv) => {
        const d1Name = (mv.driver1?.fullname || '').replace(/\s+/g, ' ').trim().toLowerCase();
        return d1Name === cleanDriverName;
      });
      if (mcVehMatch?.driverId) {
        vmsId = mcVehMatch.driverId;
      }
    }

    if (vmsId && String(vmsId) !== String(driver.vms_id || '')) {
      matched.push({
        id: driver.id,
        vms_id: String(vmsId),
      });
    }
  });

  if (matched.length > 0) {
    await apiFetch('/api/mileapp/drivers', 'Gagal update data MCEasy driver', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates: matched }),
    });
  }

  return { success: true, matched };
}
