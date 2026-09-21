import { getDrivers, getVehicleMappings, getVehicleTypes } from './api/mileapp';
import { toastError } from './toast';
import { formatUTC7, getBasePlate, getStorageType, isEmpty, normalizeEmail } from './utils';

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
    const startDateFormatted = formatUTC7(startTime, 'DD-MM-YYYY');

    if (startDateFormatted !== targetDateFormatted) return;

    const email = normalizeEmail(item.email);
    if (!email) return;

    const startDisplay = formatUTC7(startTime, 'HH:mm') || '-';

    const finishTime = item.finish?.finishTime;
    let finishDisplay = formatUTC7(finishTime, 'HH:mm') || '-';

    if (startTime && finishTime) {
      const sDate = new Date(formatUTC7(startTime, 'YYYY-MM-DD'));
      const fDate = new Date(formatUTC7(finishTime, 'YYYY-MM-DD'));
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

        const updatedRawFinish = formatUTC7(finishTime, 'HH:mm');
        current.jamKembali =
          diffDays > 0 ? `${updatedRawFinish} (H+${diffDays})` : updatedRawFinish;
      }

      timeMap.set(email, current);
    }
  });
  return timeMap;
}
