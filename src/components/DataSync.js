'use client';

import {
  autoUpdateTasks,
  getResults,
  syncRoutingResults,
  syncTasks,
} from '@/lib/api/mileapp';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { formatDateUniversal, tomorrowDate } from '@/lib/utils';
import { useEffect, useRef } from 'react';

export default function DataSync() {
  const isSyncingTasksRef = useRef(false);
  const isSyncingRoutingRef = useRef(false);

  useEffect(() => {
    const syncRoutingIfMissing = async () => {
      if (typeof window === 'undefined' || isSyncingRoutingRef.current) return;

      const { storedUser, storedLocation } = getLocalStorage();
      if (!storedUser || !storedLocation) return;

      isSyncingRoutingRef.current = true;
      try {
        const todayStr = formatDateUniversal(new Date(), 'YYYY-MM-DD');
        const tomorrowStr = formatDateUniversal(tomorrowDate(true), 'YYYY-MM-DD');
        const datesToSync = Array.from(new Set([todayStr, tomorrowStr]));

        let shouldReload = false;

        for (const dStr of datesToSync) {
          try {
            const existingData = await getResults({ deliveryDate: dStr });
            const hasDataInDb = Array.isArray(existingData) && existingData.length > 0;

            if (hasDataInDb) {
              continue;
            }

            const routingRes = await syncRoutingResults({
              deliveryDate: dStr,
              hubId: storedLocation,
            });
            await syncTasks({
              deliveryDate: dStr,
              hubId: storedLocation,
            });

            const reloadKey = `tms_auto_reloaded_${dStr}`;
            const hasSyncedData = (routingRes?.syncedCount || 0) > 0;
            if (hasSyncedData && dStr === todayStr && !sessionStorage.getItem(reloadKey)) {
              sessionStorage.setItem(reloadKey, 'true');
              shouldReload = true;
            }
          } catch (err) {
            console.warn('[DataSync] Routing sync error:', err.message);
          }
        }

        if (shouldReload) {
          window.location.reload();
        }
      } finally {
        isSyncingRoutingRef.current = false;
      }
    };

    const runTaskAutoUpdate = async () => {
      if (typeof window === 'undefined' || isSyncingTasksRef.current) return;

      const { storedUser, storedLocation } = getLocalStorage();
      if (!storedUser || !storedLocation) return;

      isSyncingTasksRef.current = true;
      try {
        await autoUpdateTasks({ hubId: storedLocation });
      } catch (err) {
        console.warn('[DataSync] Task auto-update error:', err.message);
      } finally {
        isSyncingTasksRef.current = false;
      }
    };

    runTaskAutoUpdate();
    syncRoutingIfMissing();

    const handleSessionUpdate = () => {
      syncRoutingIfMissing();
      runTaskAutoUpdate();
    };

    window.addEventListener('session_update', handleSessionUpdate);

    return () => {
      window.removeEventListener('session_update', handleSessionUpdate);
    };
  }, []);

  return null;
}
