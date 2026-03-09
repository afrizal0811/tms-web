import { getDrivers, getVehicleTypes } from './api';
import { getLocalStorage, setLocalStorage } from './localStorageHandler';
import { toastError, toastWarning } from './toastHelper';
import { isEmpty } from './utils';

const resolveVehicleType = (rawTag, plate, hubId, tagMap) => {
  if (!rawTag) return null;
  const parts = rawTag.split('-');
  let typeCandidate = parts.length > 1 ? parts[1].toUpperCase() : rawTag.toUpperCase();

  if (parts.length > 2 && parts[2].toUpperCase() === 'LONG') {
    if (['CDE', 'CDD', 'FUSO'].includes(typeCandidate)) {
      typeCandidate = `${typeCandidate}-LONG`;
    }
  }

  if (tagMap && hubId && plate) {
    const hubMap = tagMap[hubId];
    if (hubMap && hubMap[plate]) {
      const mappedValue = hubMap[plate][typeCandidate];
      if (mappedValue) return mappedValue;
    }
  }

  return typeCandidate;
};

const updateMasterTruckStorage = async (drivers, hubId) => {
  if (typeof window === 'undefined' || !Array.isArray(drivers)) return;

  let tagMap = {};
  try {
    const { storedVehicleTag: storedMap } = getLocalStorage();
    if (storedMap) tagMap = JSON.parse(storedMap);
  } catch (e) {
    return e;
  }

  const vehicleTypesObj = await getVehicleTypes();
  const VEHICLE_TYPES = vehicleTypesObj.map((v) => v.name);

  const masterData = { Dry: { Total: 0 }, Frozen: { Total: 0 } };

  VEHICLE_TYPES.forEach((type) => {
    masterData.Dry[type] = 0;
    masterData.Frozen[type] = 0;
  });

  drivers.forEach((d) => {
    const plat = d.plat || '';
    const name = (d.name || '').toUpperCase();
    const rawTag = (d.type || '').toUpperCase();
    const platUpper = plat.toUpperCase();

    if (!plat || isEmpty(plat.trim()) || platUpper.includes('DEMO') || platUpper.includes('SEWA'))
      return;

    let storageCategory = null;
    if (name.includes('DRY')) storageCategory = 'Dry';
    else if (name.includes('FRZ')) storageCategory = 'Frozen';

    if (!storageCategory) return;

    const resolvedType = resolveVehicleType(rawTag, plat, hubId, tagMap);
    const matchedType = VEHICLE_TYPES.find((vt) => resolvedType === vt);

    if (matchedType) {
      masterData[storageCategory][matchedType]++;
      masterData[storageCategory].Total++;
    }
  });

  setLocalStorage('masterTruck', JSON.stringify(masterData));
};

export async function checkUnmappedVehicles(hubId) {
  if (!hubId) return [];

  let tagMap = {};
  if (typeof window !== 'undefined') {
    try {
      const { storedVehicleTag: storedMap } = getLocalStorage();
      if (storedMap) tagMap = JSON.parse(storedMap);
    } catch (e) {
      toastError(e);
    }
  }
  try {
    const vehicleTypesObj = await getVehicleTypes();
    const VEHICLE_TYPES = vehicleTypesObj.map((v) => v.name);
    const drivers = await getDrivers(hubId);
    const unmappedList = [];

    drivers.forEach((v) => {
      const rawTag = v.type ? String(v.type).toUpperCase() : null;
      if (isEmpty(rawTag)) return;

      const plat = v.plat || '';
      if (isEmpty(plat)) return;

      const parts = rawTag.split('-');
      let specificType = parts.length > 1 ? parts[1] : rawTag;

      if (parts.length > 2 && parts[2] === 'LONG') {
        if (['CDE', 'CDD', 'FUSO'].includes(specificType)) specificType = `${specificType}-LONG`;
      }

      const isStandard = VEHICLE_TYPES.includes(specificType);
      const isMapped = tagMap[hubId] && tagMap[hubId][plat] && tagMap[hubId][plat][specificType];

      if (!isStandard && !isMapped) {
        unmappedList.push({ plat: plat, fullTag: rawTag, tag: specificType, hubId: hubId });
      }
    });

    return unmappedList;
  } catch (error) {
    return error;
  }
}

export async function getOrFetchDriverData(selectedLocation) {
  if (!selectedLocation) throw new Error('Lokasi Hub tidak ditemukan.');

  try {
    const driversFromDB = await getDrivers(selectedLocation);
    const mappedDrivers = driversFromDB.map((d) => ({
      _id: d.id,
      email: d.email,
      name: d.name,
      plat: d.plat,
      type: d.type,
      maxWeight: d.maxWeight,
      maxVolume: d.maxVolume,
      storage: d.storage,
      workingTime: {
        startTime: d.startTime,
        endTime: d.endTime,
        multiday: d.multiday,
      },
    }));
    await updateMasterTruckStorage(mappedDrivers, selectedLocation);
    return mappedDrivers;
  } catch (err) {
    throw err;
  }
}