import { getStorageType, isEmpty } from './utils';

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
