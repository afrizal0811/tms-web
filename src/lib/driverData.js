import { getDrivers, getVehicleTypes } from './api/mileapp';
import { toastError } from './toast';
import { getStorageType, isEmpty } from './utils';

let vehicleTypesPromise = null;

export async function checkUnmappedVehicles(hubId) {
  if (!hubId) return [];

  try {
    if (!vehicleTypesPromise) vehicleTypesPromise = getVehicleTypes();

    const [vehicleTypesObj, drivers] = await Promise.all([vehicleTypesPromise, getDrivers(hubId)]);

    const VEHICLE_TYPES = vehicleTypesObj.map((v) => v.name);

    const unmappedList = [];
    const processedPlates = new Set();

    drivers.forEach((v) => {
      const rawTag = v._rawType ? String(v._rawType).toUpperCase() : null;
      if (isEmpty(rawTag)) return;

      const plat = v.plat || '';
      if (isEmpty(plat) || processedPlates.has(plat)) return;

      const parseType = (tag) => {
        if (!tag) return '';
        const clean = String(tag)
          .toUpperCase()
          .replace(/["'\\]/g, '')
          .trim();
        const p = clean.split('-');
        let spec = p.length > 1 ? p[1] : clean;
        if (p.length > 2 && p[2] === 'LONG' && ['CDE', 'CDD', 'FUSO'].includes(spec)) {
          spec = `${spec}-LONG`;
        }
        return spec;
      };

      const specificType = parseType(rawTag);
      const mappedType = parseType(v.type);

      const isStandard = VEHICLE_TYPES.includes(specificType);
      const isMappedInDB = VEHICLE_TYPES.includes(mappedType);

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

export async function masterTruckStorage(drivers, VEHICLE_TYPES) {
  const masterData = { Dry: { Total: 0 }, Frozen: { Total: 0 } };

  VEHICLE_TYPES.forEach((type) => {
    masterData.Dry[type] = 0;
    masterData.Frozen[type] = 0;
  });

  if (!Array.isArray(drivers)) return masterData;

  drivers.forEach((d) => {
    const plat = d.plat || '';
    const platUpper = plat.toUpperCase();

    if (!plat || isEmpty(plat.trim()) || platUpper.includes('DEMO')) {
      return;
    }

    const storageCategory = getStorageType(d.storage || d.type || '');

    let resolvedType = d.type;
    if (resolvedType && resolvedType.includes('-')) {
      const parts = resolvedType.split('-');
      resolvedType = parts.length > 1 ? parts[1].toUpperCase() : resolvedType.toUpperCase();
      if (parts.length > 2 && parts[2].toUpperCase() === 'LONG') {
        if (['CDE', 'CDD', 'FUSO'].includes(resolvedType)) {
          resolvedType = `${resolvedType}-LONG`;
        }
      }
    }

    const matchedType = VEHICLE_TYPES.find((vt) => resolvedType === vt);

    if (matchedType) {
      masterData[storageCategory][matchedType]++;
      masterData[storageCategory].Total++;
    }
  });

  return masterData;
}
