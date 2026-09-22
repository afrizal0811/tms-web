import { getDrivers, getVehicleMappings, getVehicleTypes } from './api/mileapp';
import { toastError } from './toast';
import { getBasePlate, getStorageType, isEmpty } from './utils';

let vehicleTypesPromise = null;
let vehicleMappingsPromise = null;

const resolveVehicleType = (rawTag, plate, mappingsObj) => {
  if (plate && mappingsObj[plate]) return mappingsObj[plate];

  const basePlat = getBasePlate(plate);
  if (basePlat && mappingsObj[basePlat]) return mappingsObj[basePlat];

  if (!rawTag) return null;
  const cleanTag = rawTag.replace(/["'\\]/g, '').trim();
  const parts = cleanTag.split('-');

  let typeCandidate = parts.length > 1 ? parts[1].toUpperCase() : cleanTag.toUpperCase();

  if (parts.length > 2 && parts[2].toUpperCase() === 'LONG') {
    if (['CDE', 'CDD', 'FUSO'].includes(typeCandidate)) {
      typeCandidate = `${typeCandidate}-LONG`;
    }
  }

  return typeCandidate;
};

export async function checkUnmappedVehicles(hubId) {
  if (!hubId) return [];

  try {
    if (!vehicleTypesPromise) vehicleTypesPromise = getVehicleTypes();
    vehicleMappingsPromise = getVehicleMappings();

    const [vehicleTypesObj, drivers, mappingsDB] = await Promise.all([
      vehicleTypesPromise,
      getDrivers(hubId),
      vehicleMappingsPromise,
    ]);

    const VEHICLE_TYPES = vehicleTypesObj.map((v) => v.name);

    const mappingsObj = mappingsDB.reduce((acc, curr) => {
      acc[curr.plat] = curr.mappedType;
      return acc;
    }, {});

    const unmappedList = [];
    const processedPlates = new Set();

    drivers.forEach((v) => {
      const rawTag = v._rawType ? String(v._rawType).toUpperCase() : null;
      if (isEmpty(rawTag)) return;

      const plat = v.plat || '';
      if (isEmpty(plat) || processedPlates.has(plat)) return;

      const cleanTag = rawTag.replace(/["'\\]/g, '').trim();
      const parts = cleanTag.split('-');
      let specificType = parts.length > 1 ? parts[1] : cleanTag;

      if (parts.length > 2 && parts[2] === 'LONG') {
        if (['CDE', 'CDD', 'FUSO'].includes(specificType)) specificType = `${specificType}-LONG`;
      }

      const isStandard = VEHICLE_TYPES.includes(specificType);
      const isMappedInDB = !!mappingsObj[plat];

      if (isStandard || isMappedInDB) {
        processedPlates.add(plat);
        return;
      }

      unmappedList.push({ plat, fullTag: rawTag, tag: specificType });
      processedPlates.add(plat);
    });

    return unmappedList;
  } catch (error) {
    toastError(error.message, error);
    return [];
  }
}

export async function masterTruckStorage(drivers, mappingsObj, VEHICLE_TYPES) {
  const masterData = { Dry: { Total: 0 }, Frozen: { Total: 0 } };

  VEHICLE_TYPES.forEach((type) => {
    masterData.Dry[type] = 0;
    masterData.Frozen[type] = 0;
  });

  if (!Array.isArray(drivers)) return masterData;

  drivers.forEach((d) => {
    const sourceTag = d._rawType || d.type;
    if (!d.plat || !sourceTag) return;
    const cleanTag = String(sourceTag)
      .toUpperCase()
      .replace(/["'\\]/g, '')
      .trim();
    const parts = cleanTag.split('-');
    let specificType = parts.length > 1 ? parts[1] : cleanTag;
    if (parts.length > 2 && parts[2] === 'LONG') {
      if (['CDE', 'CDD', 'FUSO'].includes(specificType)) specificType = `${specificType}-LONG`;
    }
    if (VEHICLE_TYPES.includes(specificType)) {
      mappingsObj[d.plat] = specificType;
      mappingsObj[getBasePlate(d.plat)] = specificType;
    }
  });

  drivers.forEach((d) => {
    const plat = d.plat || '';
    const rawTag = (d.type || '').toUpperCase();
    const platUpper = plat.toUpperCase();
    const storageField = (d.storage || '').toUpperCase();

    if (!plat || isEmpty(plat.trim()) || platUpper.includes('DEMO')) {
      return;
    }

    const storageCategory = getStorageType(storageField || rawTag);
    const resolvedType = resolveVehicleType(rawTag, plat, mappingsObj);
    const matchedType = VEHICLE_TYPES.find((vt) => resolvedType === vt);

    if (matchedType) {
      masterData[storageCategory][matchedType]++;
      masterData[storageCategory].Total++;
    }
  });

  return masterData;
}
