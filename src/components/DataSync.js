'use client';

import SelectionLayout from '@/components/page/SelectionLayout';
import Spinner from '@/components/Spinner';
import { useLanguage } from '@/context/LanguageContext';
import { syncOperationalData } from '@/lib/api/mileapp';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { formatDateUniversal } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';

function getActiveWeekDays(baseDate = new Date()) {
  const d = new Date(baseDate);
  const diffToMonday = d.getDay() === 0 ? -6 : 1 - d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  return Array.from({ length: 6 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    return formatDateUniversal(day, 'YYYY-MM-DD');
  });
}

function withTimeout(promise, ms = 15000) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export default function DataSync({ children }) {
  const { t } = useLanguage();
  const tRef = useRef(t);
  tRef.current = t;

  const isSyncingRef = useRef(false);
  const hasRunRef = useRef(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncStartTime, setSyncStartTime] = useState(null);

  useEffect(() => {
    const runSync = async () => {
      if (typeof window === 'undefined' || isSyncingRef.current || hasRunRef.current) return;

      const { storedUser, storedLocation } = getLocalStorage();
      if (!storedUser || !storedLocation) return;

      hasRunRef.current = true;
      isSyncingRef.current = true;

      const now = new Date();
      const todayStr = formatDateUniversal(now, 'YYYY-MM-DD');
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = formatDateUniversal(yesterday, 'YYYY-MM-DD');

      const targetHubId = storedLocation;
      const syncKey = `tms_last_sync_date_${targetHubId}`;
      const isInitialSync = localStorage.getItem(syncKey) !== todayStr;

      if (isInitialSync) {
        setSyncStartTime(Date.now());
      }

      const translate = tRef.current;
      const setStatus = (key) => {
        if (isInitialSync) {
          setSyncStatus(`${translate('common.sync')} ${translate(key)}`);
        }
      };

      const sync = (entities, deliveryDate, timeoutMs) =>
        withTimeout(syncOperationalData({ deliveryDate, hubId: targetHubId, entities }), timeoutMs);

      try {
        setStatus('common.task');
        await Promise.allSettled(
          [yesterdayStr, todayStr].map((dStr) => sync(['tasks'], dStr, 20000))
        );

        if (isInitialSync) {
          setStatus('common.routing');
          await sync(['results'], todayStr, 15000).catch((err) =>
            console.warn('[DataSync] Routing sync error:', err.message)
          );
        }

        setStatus('common.driver_location');
        await Promise.allSettled(
          getActiveWeekDays(now).map((dStr) => sync(['location-histories'], dStr, 10000))
        );

        localStorage.setItem(syncKey, todayStr);
        localStorage.setItem('tms_last_sync_date', todayStr);

        if (!isInitialSync) {
          window.dispatchEvent(new CustomEvent('tms-pending-details-updated'));
        }
      } catch (err) {
        console.warn('[DataSync] Sync unexpected error:', err.message);
      } finally {
        if (isInitialSync) {
          setSyncStatus(null);
          setSyncStartTime(null);
        }
        isSyncingRef.current = false;
      }
    };

    runSync();

    const handleSessionUpdate = () => {
      if (hasRunRef.current) return;
      const { storedUser, storedLocation } = getLocalStorage();
      if (storedUser && storedLocation) {
        runSync();
      }
    };

    window.addEventListener('session_update', handleSessionUpdate);

    return () => {
      window.removeEventListener('session_update', handleSessionUpdate);
    };
  }, []);

  if (syncStatus) {
    return (
      <SelectionLayout>
        <div className="flex flex-col items-center justify-center gap-4 py-16 select-none animate-in fade-in duration-200">
          <Spinner size="w-16 h-16" showTimer={true} startTime={syncStartTime} />
          <p className="text-sm font-semibold text-slate-400 dark:text-slate-200 italic">
            {syncStatus}
          </p>
        </div>
      </SelectionLayout>
    );
  }

  return children || null;
}
