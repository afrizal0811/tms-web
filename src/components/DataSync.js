'use client';

import { syncOperationalData } from '@/lib/api/mileapp';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { formatDateUniversal } from '@/lib/utils';
import { useEffect, useRef } from 'react';

function getActiveWeekDays(baseDate = new Date()) {
  const d = new Date(baseDate);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const days = [];
  for (let i = 0; i < 6; i++) {
    const curr = new Date(monday);
    curr.setDate(monday.getDate() + i);
    days.push(formatDateUniversal(curr, 'YYYY-MM-DD'));
  }
  return days;
}

export default function DataSync() {
  const isSyncingRef = useRef(false);

  useEffect(() => {
    const runAutoSync = async () => {
      if (typeof window === 'undefined' || isSyncingRef.current) return;

      const { storedUser, storedLocation } = getLocalStorage();
      if (!storedUser || !storedLocation) return;

      isSyncingRef.current = true;
      try {
        const todayStr = formatDateUniversal(new Date(), 'YYYY-MM-DD');
        let shouldReload = false;

        try {
          const res = await syncOperationalData({
            deliveryDate: todayStr,
            hubId: storedLocation,
            entities: ['results', 'tasks'],
          });

          const reloadKey = `tms_auto_reloaded_${todayStr}`;
          const hasInserted =
            (res?.results?.insertedCount || 0) > 0 || (res?.tasks?.insertedCount || 0) > 0;

          if (hasInserted && !sessionStorage.getItem(reloadKey)) {
            sessionStorage.setItem(reloadKey, 'true');
            shouldReload = true;
          }
        } catch (err) {
          console.warn('[DataSync] Routing & tasks auto-sync error:', err.message);
        }

        const activeWeekDays = getActiveWeekDays(new Date());
        for (const dStr of activeWeekDays) {
          try {
            await syncOperationalData({
              deliveryDate: dStr,
              hubId: storedLocation,
              entities: ['location-histories'],
            });
          } catch (err) {
            console.warn(`[DataSync] Location history auto-sync error for ${dStr}:`, err.message);
          }
        }

        if (shouldReload) {
          window.location.reload();
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

    return () => {
      window.removeEventListener('session_update', handleSessionUpdate);
    };
  }, []);

  return null;
}
