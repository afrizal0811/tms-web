import { getDrivers, getVehicleMappings, getVehicleTypes } from './api';
import {
  formatTimestampToDDMMYYYY_UTC7,
  formatTimestampToQuotedHHMM_UTC7,
  getUTC7DateString,
  isEmpty,
  normalizeEmail,
} from './utils';

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

export function driverTimeStamps(apiData, selectedDateStr) {
  const timeMap = new Map();
  const tasksData = apiData?.tasks?.data || [];
  if (!Array.isArray(tasksData) || isEmpty(tasksData)) return timeMap;

  const [y, m, d] = selectedDateStr.split('-');
  const targetDateFormatted = `${d}-${m}-${y}`;

  tasksData.forEach((item) => {
    const trackedTime = Math.abs(item.trackedTime || 0);
    const totalDistance = item.finish?.totalDistance || 0;

    if (trackedTime < 10 || totalDistance <= 5) return;

    const startTime = item.startTime;
    const startDateFormatted = formatTimestampToDDMMYYYY_UTC7(startTime);

    if (startDateFormatted !== targetDateFormatted) return;

    const email = normalizeEmail(item.email);
    if (!email) return;

    const rawStart = formatTimestampToQuotedHHMM_UTC7(startTime);
    const startDisplay = rawStart ? rawStart.replace("'", '') : '-';

    const finishTime = item.finish?.finishTime;
    const rawFinish = formatTimestampToQuotedHHMM_UTC7(finishTime);
    let finishDisplay = rawFinish ? rawFinish.replace("'", '') : '-';

    if (startTime && finishTime) {
      const sDate = new Date(getUTC7DateString(startTime));
      const fDate = new Date(getUTC7DateString(finishTime));
      const d1 = new Date(sDate.getFullYear(), sDate.getMonth(), sDate.getDate());
      const d2 = new Date(fDate.getFullYear(), fDate.getMonth(), fDate.getDate());

      const diffTime = d2 - d1;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 0) {
        finishDisplay = `${finishDisplay} (+${diffDays})`;
      }
    }
    if (!timeMap.has(email)) {
      timeMap.set(email, {
        jamBerangkat: startDisplay,
        jamKembali: finishDisplay,
        _rawStart: new Date(startTime),
        _rawFinish: finishTime ? new Date(finishTime) : null,
      });
    } else {
      const current = timeMap.get(email);
      const newStart = new Date(startTime);
      const newFinish = finishTime ? new Date(finishTime) : null;
      if (newStart < current._rawStart) {
        current._rawStart = newStart;
        current.jamBerangkat = startDisplay;
      }
      if (newFinish && (!current._rawFinish || newFinish > current._rawFinish)) {
        current._rawFinish = newFinish;
        const d1 = new Date(
          current._rawStart.getFullYear(),
          current._rawStart.getMonth(),
          current._rawStart.getDate()
        );
        const d2 = new Date(newFinish.getFullYear(), newFinish.getMonth(), newFinish.getDate());
        const diffDays = Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));

        const updatedRawFinish = formatTimestampToQuotedHHMM_UTC7(finishTime).replace("'", '');
        current.jamKembali =
          diffDays > 0 ? `${updatedRawFinish} (H+${diffDays})` : updatedRawFinish;
      }

      timeMap.set(email, current);
    }
  });
  return timeMap;
}
