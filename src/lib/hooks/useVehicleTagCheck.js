// File: lib/hooks/useVehicleTagCheck.js
'use client';

import { checkUnmappedVehicles } from '@/lib/driverDataHelper';
import { useCallback, useState } from 'react';
import { toastError } from '../toastHelper';
import { useLanguage } from '@/context/LanguageContext';

export function useVehicleTagCheck() {
  const [isChecking, setIsChecking] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [unmappedData, setUnmappedData] = useState([]);
  const [onSuccessCallback, setOnSuccessCallback] = useState(null);
  const { t } = useLanguage();

  const triggerCheck = useCallback(async (hubId, onSuccess) => {
    if (!hubId) return;

    setIsChecking(true);
    try {
      const issues = await checkUnmappedVehicles(hubId);
      if (issues && issues.length > 0) {
        setUnmappedData(issues);
        setOnSuccessCallback(() => onSuccess);
        setShowModal(true);
      } else {
        onSuccess();
      }
    } catch (error) {
      toastError(t('common.error', { err: error.message }));
      onSuccess();
    } finally {
      setIsChecking(false);
    }
  }, [t]);

  const handleMappingCompleted = useCallback(() => {
    setShowModal(false);
    setUnmappedData([]);
    if (onSuccessCallback) {
      onSuccessCallback();
      setOnSuccessCallback(null); 
    }
  }, [onSuccessCallback]);

  return {
    isChecking,
    showModal,
    unmappedData,
    triggerCheck, 
    handleMappingCompleted, 
  };
}
