import { getUsers, getVehicles } from './apiService';
import { ROLE_ID, VEHICLE_TYPES } from './constants';
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
      if (mappedValue) {
        return mappedValue;
      }
    }
  }

  return typeCandidate;
};

const updateMasterTruckStorage = (drivers, hubId) => {
  if (typeof window === 'undefined' || !Array.isArray(drivers)) return;

  let tagMap = {};
  try {
    const { storedVehicleTag: storedMap } = getLocalStorage();
    if (storedMap) tagMap = JSON.parse(storedMap);
  } catch (e) {
    return e;
  }

  const masterData = {
    Dry: { Total: 0 },
    Frozen: { Total: 0 },
  };

  VEHICLE_TYPES.forEach((type) => {
    masterData.Dry[type] = 0;
    masterData.Frozen[type] = 0;
  });

  drivers.forEach((d) => {
    const plat = d.plat || '';
    const name = (d.name || '').toUpperCase();
    const rawTag = (d.type || '').toUpperCase();
    const platUpper = plat.toUpperCase();

    if (!plat || isEmpty(plat.trim()) || platUpper.includes('DEMO') || platUpper.includes('SEWA')) {
      return;
    }

    let storageCategory = null;
    if (name.includes('DRY')) {
      storageCategory = 'Dry';
    } else if (name.includes('FRZ')) {
      storageCategory = 'Frozen';
    }

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
    const res = await getVehicles({ hubId: hubId, limit: 1000 });
    const vehicles = Array.isArray(res) ? res : res.data || [];

    const unmappedList = [];

    vehicles.forEach((v) => {
      const tags = v.tags || v.vehicleTags || [];
      if (isEmpty(tags)) return;

      const rawTag = String(tags[0]).toUpperCase();
      const plat = v.name || v.plateNumber;
      const parts = rawTag.split('-');
      let specificType = parts.length > 1 ? parts[1] : rawTag;

      if (parts.length > 2 && parts[2] === 'LONG') {
        if (['CDE', 'CDD', 'FUSO'].includes(specificType)) {
          specificType = `${specificType}-LONG`;
        }
      }
      const isStandard = VEHICLE_TYPES.includes(specificType);
      const isMapped = tagMap[hubId] && tagMap[hubId][plat] && tagMap[hubId][plat][specificType];

      if (!isStandard && !isMapped) {
        unmappedList.push({
          plat: plat,
          fullTag: rawTag,
          tag: specificType,
          hubId: hubId,
        });
      }
    });

    return unmappedList;
  } catch (error) {
    return error;
  }
}

export async function getOrFetchDriverData(selectedLocation, forceRefresh = false) {
  if (!selectedLocation) {
    throw new Error('Lokasi Hub tidak ditemukan.');
  }

  if (!forceRefresh) {
    try {
      const { storedDrivers: storedDrivers } = getLocalStorage();
      if (storedDrivers) {
        const parsed = JSON.parse(storedDrivers);
        updateMasterTruckStorage(parsed, selectedLocation);
        return parsed;
      }
    } catch (e) {
      toastWarning(`Gagal membaca cache driver: ${e.message}. Mengambil data baru.`);
    }
  }

  try {
    const rolesToFetch = [ROLE_ID.driver, ROLE_ID.driverJkt];
    const driverPromises = rolesToFetch.map((roleId) =>
      getUsers({ hubId: selectedLocation, roleId: roleId, status: 'active' })
    );
    const vehiclePromise = getVehicles({ hubId: selectedLocation, limit: 500 });

    const [driverResponses, vehicleResult] = await Promise.all([
      Promise.all(driverPromises),
      vehiclePromise,
    ]);
    const rawDrivers = driverResponses.flat();
    const uniqueDrivers = Array.from(new Map(rawDrivers.map((item) => [item._id, item])).values());

    const processedDrivers = uniqueDrivers.map((driver) => ({
      _id: driver._id,
      name: driver.name,
      email: driver.email,
    }));

    // Proses Vehicle Map dengan Optional Chaining supaya aman
    const vehicleMap = vehicleResult.reduce((acc, vehicle) => {
    console.log('vehicle :', vehicle);
      if (vehicle.assignee) {
        acc[vehicle.assignee] = {
          plat: vehicle.name,
          type: vehicle.tags && vehicle.tags.length > 0 ? vehicle.tags[0] : null,
          storage: vehicle.tags && vehicle.tags.length > 0 ? vehicle.tags[0].split('-')[0] : null,
          maxWeight: vehicle.capacity?.weight?.max || null,
          maxVolume: vehicle.capacity?.volume?.max || null,
          startWorking: vehicle.workingTime?.startTime || null,
          endWorking: vehicle.workingTime?.endTime || null,
          multiday: vehicle.workingTime?.multiday || null,
        };
      }
      return acc;
    }, {});

    const mergedDriverData = processedDrivers.map((driver) => {
      const vehicleInfo = vehicleMap[driver.email];
      return {
        email: driver.email,
        name: driver.name,
        plat: vehicleInfo ? vehicleInfo.plat : null,
        type: vehicleInfo ? vehicleInfo.type : null,
        maxWeight: vehicleInfo ? parseFloat(vehicleInfo.maxWeight) : null,
        maxVolume: vehicleInfo ? parseFloat(vehicleInfo.maxVolume) : null,
        storage: vehicleInfo ? vehicleInfo.storage : null,
        workingTime: {
          startTime: vehicleInfo ? vehicleInfo.startWorking : null,
          endTime: vehicleInfo ? vehicleInfo.endWorking : null,
          multiday: vehicleInfo ? vehicleInfo.multiday : null,
        },
      };
    });

    setLocalStorage('driverData', JSON.stringify(mergedDriverData));
    updateMasterTruckStorage(mergedDriverData, selectedLocation);

    return mergedDriverData;
  } catch (err) {
    throw err;
  }
}
