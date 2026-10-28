'use client';

import { syncRoutingResults } from '@/lib/api/mileapp';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError } from '@/lib/toast';
import { formatDateUniversal, tomorrowDate } from '@/lib/utils';
import { useEffect, useRef } from 'react';

export default function RoutingSync() {
  const isSyncingRef = useRef(false);

  useEffect(() => {
    const runAutoSync = async () => {
      if (typeof window === 'undefined' || isSyncingRef.current) return;

      const { storedUser, storedLocation } = getLocalStorage();
      if (!storedUser || !storedLocation) return;

      const today = new Date();
      const todayStr = formatDateUniversal(today, 'YYYY-MM-DD');
      const tomorrowStr = formatDateUniversal(tomorrowDate(true), 'YYYY-MM-DD');
      const datesToSync = Array.from(new Set([todayStr, tomorrowStr]));

      isSyncingRef.current = true;
      try {
        for (const dStr of datesToSync) {
          try {
            await syncRoutingResults({
              deliveryDate: dStr,
              hubId: storedLocation,
            });
          } catch (err) {
            toastError(err.message || 'Gagal sinkronisasi data routing otomatis', err);
          }
        }
      } finally {
        isSyncingRef.current = false;
      }
    };

    runAutoSync();

    const handleSessionUpdate = () => {
      runAutoSync();
    };

    window.addEventListener('session_update', handleSessionUpdate);
    const intervalId = setInterval(runAutoSync, 15 * 60 * 1000);

    return () => {
      window.removeEventListener('session_update', handleSessionUpdate);
      clearInterval(intervalId);
    };
  }, []);

  return null;
}

