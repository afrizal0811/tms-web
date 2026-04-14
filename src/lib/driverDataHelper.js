import { getDrivers, getVehicleMappings, getVehicleTypes } from './api';
import { isEmpty } from './utils';

const driversCache = {};
let vehicleTypesPromise = null;
let vehicleMappingsPromise = null;

const resolveVehicleType = (rawTag, plate, mappingsObj) => {
  if (plate && mappingsObj[plate]) {
    return mappingsObj[plate];
  }

  if (!rawTag) return null;
  const parts = rawTag.split('-');
  let typeCandidate = parts.length > 1 ? parts[1].toUpperCase() : rawTag.toUpperCase();

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
    if (!vehicleMappingsPromise) vehicleMappingsPromise = getVehicleMappings();

    const [vehicleTypesObj, drivers, mappingsDB] = await Promise.all([
      vehicleTypesPromise,
      getOrFetchDriverData(hubId),
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
      const rawTag = v.type ? String(v.type).toUpperCase() : null;
      if (isEmpty(rawTag)) return;

      const plat = v.plat || '';
      if (isEmpty(plat) || processedPlates.has(plat)) return;

      const parts = rawTag.split('-');
      let specificType = parts.length > 1 ? parts[1] : rawTag;

      if (parts.length > 2 && parts[2] === 'LONG') {
        if (['CDE', 'CDD', 'FUSO'].includes(specificType)) specificType = `${specificType}-LONG`;
      }

      const isStandard = VEHICLE_TYPES.includes(specificType);
      const isMapped = !!mappingsObj[plat];

      if (!isStandard && !isMapped) {
        unmappedList.push({ plat: plat, fullTag: rawTag, tag: specificType });
        processedPlates.add(plat);
      }
    });

    return unmappedList;
  } catch (error) {
    return [];
  }
}

export async function getOrFetchDriverData(selectedLocation) {
  if (!selectedLocation) throw new Error('Lokasi Hub tidak ditemukan.');
  if (!driversCache[selectedLocation]) {
    driversCache[selectedLocation] = (async () => {
      try {
        const driversFromDB = await getDrivers(selectedLocation);
        return driversFromDB.map((d) => ({
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
      } catch (err) {
        delete driversCache[selectedLocation];
        throw err;
      }
    })();
  }

  return driversCache[selectedLocation];
}

export async function calculateMasterTruckStorage(drivers, mappingsObj, VEHICLE_TYPES) {
  const masterData = { Dry: { Total: 0 }, Frozen: { Total: 0 } };

  VEHICLE_TYPES.forEach((type) => {
    masterData.Dry[type] = 0;
    masterData.Frozen[type] = 0;
  });

  if (!Array.isArray(drivers)) return masterData;

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

    const resolvedType = resolveVehicleType(rawTag, plat, mappingsObj);
    const matchedType = VEHICLE_TYPES.find((vt) => resolvedType === vt);

    if (matchedType) {
      masterData[storageCategory][matchedType]++;
      masterData[storageCategory].Total++;
    }
  });

  return masterData;
}
