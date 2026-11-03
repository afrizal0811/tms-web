'use client';

import SelectionLayout from '@/components/page/SelectionLayout';
import Spinner from '@/components/Spinner';
import { syncOperationalData } from '@/lib/api/mileapp';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { formatDateUniversal } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
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

function withTimeout(promise, ms = 15000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    ),
  ]);
}

export default function DataSync({ children }) {
  const { t } = useLanguage();
  const isSyncingRef = useRef(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncStartTime, setSyncStartTime] = useState(null);

  useEffect(() => {
    const runAutoSync = async (forceSync = false) => {
      if (typeof window === 'undefined' || isSyncingRef.current) return;

      const { storedUser, storedLocation } = getLocalStorage();
      if (!storedUser || !storedLocation) return;

      const todayStr = formatDateUniversal(new Date(), 'YYYY-MM-DD');
      const targetHubId = storedLocation;
      const syncKey = `tms_last_sync_date_${targetHubId}`;

      if (!forceSync && localStorage.getItem(syncKey) === todayStr) {
        return;
      }

      isSyncingRef.current = true;
      setSyncStartTime(Date.now());

      try {
        try {
          setSyncStatus(`${t('common.sync')} ${t('common.task')}`);
          await withTimeout(
            syncOperationalData({
              deliveryDate: todayStr,
              hubId: targetHubId,
              entities: ['tasks'],
            }),
            20000
          );
        } catch (err) {
          console.warn('[DataSync] Task auto-sync error:', err.message);
        }

        try {
          setSyncStatus(`${t('common.sync')} ${t('common.routing')}`);
          await withTimeout(
            syncOperationalData({
              deliveryDate: todayStr,
              hubId: targetHubId,
              entities: ['results'],
            }),
            15000
          );
        } catch (err) {
          console.warn('[DataSync] Routing auto-sync error:', err.message);
        }

        try {
          setSyncStatus(`${t('common.sync')} ${t('common.driver_location')}`);
          const activeWeekDays = getActiveWeekDays(new Date());
          await Promise.allSettled(
            activeWeekDays.map((dStr) =>
              withTimeout(
                syncOperationalData({
                  deliveryDate: dStr,
                  hubId: targetHubId,
                  entities: ['location-histories'],
                }),
                10000
              )
            )
          );
        } catch (err) {
          console.warn('[DataSync] Location histories auto-sync error:', err.message);
        }

        localStorage.setItem(syncKey, todayStr);
        localStorage.setItem('tms_last_sync_date', todayStr);
      } catch (err) {
        console.warn('[DataSync] Auto-sync unexpected error:', err.message);
      } finally {
        setSyncStatus(null);
        setSyncStartTime(null);
        isSyncingRef.current = false;
      }
    };

    runAutoSync();

    const handleSessionUpdate = () => {
      runAutoSync();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        runAutoSync();
      }
    };

    window.addEventListener('session_update', handleSessionUpdate);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('session_update', handleSessionUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [t]);

  if (syncStatus) {
    return (
      <SelectionLayout>
        <div className="flex flex-col items-center justify-center gap-4 py-16 select-none animate-in fade-in duration-200">
          <Spinner size="w-16 h-16" showTimer={true} startTime={syncStartTime} />
          <p className="text-sm font-semibold text-slate-400 dark:text-slate-200 italic">{syncStatus}</p>
        </div>
      </SelectionLayout>
    );
  }

  return children || null;
}
