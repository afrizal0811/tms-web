'use client';

import { useLanguage } from '@/context/LanguageContext';
import { useCallback, useState } from 'react';
import { getDrivers, getVehicleTypes } from '../api/mileapp';
import { getLocalStorage } from '../localStorageHandler';
import { toastError } from '../toast';
import { getBasePlate, isEmpty } from '../utils';

async function checkUnmappedVehicles() {
  try {
    const { storedLocation, storedUser } = getLocalStorage();
    if (!storedLocation || !storedUser) return [];

    const [vehicleTypesObj, drivers] = await Promise.all([getVehicleTypes(), getDrivers()]);
    if (!vehicleTypesObj?.allTypes || !Array.isArray(drivers)) return [];
    const VEHICLE_TYPES = vehicleTypesObj.allTypes.map((v) => v.name);
    const unmappedList = [];
    const processedPlates = new Set();

    drivers.forEach((v) => {
      const rawTag = v._rawType ? String(v._rawType).toUpperCase() : null;
      if (isEmpty(rawTag)) return;

      const rawPlat = v.plat || '';
      if (isEmpty(rawPlat)) return;

      const basePlat = getBasePlate(rawPlat);
      if (isEmpty(basePlat) || processedPlates.has(basePlat)) return;

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
        processedPlates.add(basePlat);
        return;
      }

      unmappedList.push({ plat: basePlat, fullTag: rawTag, tag: specificType });
      processedPlates.add(basePlat);
    });

    return unmappedList;
  } catch (error) {
    toastError(error.message, error);
    return [];
  }
}

export function useVehicleTagCheck() {
  const [showModal, setShowModal] = useState(false);
  const [unmappedData, setUnmappedData] = useState([]);
  const [onSuccessCallback, setOnSuccessCallback] = useState(null);
  const { t } = useLanguage();

  const triggerCheck = useCallback(
    async (onSuccess) => {
      try {
        const issues = await checkUnmappedVehicles();
        if (issues && issues.length > 0) {
          setUnmappedData(issues);
          setOnSuccessCallback(() => onSuccess);
          setShowModal(true);
        } else {
          if (typeof onSuccess === 'function') onSuccess();
        }
      } catch (e) {
        toastError(t('common.toast.error', { err: e.message }), e);
        if (typeof onSuccess === 'function') onSuccess();
      }
    },
    [t]
  );

  const handleMappingCompleted = useCallback(() => {
    setShowModal(false);
    setUnmappedData([]);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tms-vehicle-mapping-completed'));
    }
    if (typeof onSuccessCallback === 'function') {
      onSuccessCallback();
      setOnSuccessCallback(null);
    }
  }, [onSuccessCallback]);

  return {
    showModal,
    unmappedData,
    triggerCheck,
    handleMappingCompleted,
  };
}
