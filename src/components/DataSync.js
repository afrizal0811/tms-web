'use client';

import SelectionLayout from '@/components/page/SelectionLayout';
import Spinner from '@/components/Spinner';
import VehicleModal from '@/components/modal/VehicleModal';
import { useLanguage } from '@/context/LanguageContext';
import {
  getHubs,
  getVehicles,
  patchDriverMceasy,
  patchVehicleMceasy,
  postDriverList,
  postVehicles,
  syncOperationalData,
} from '@/lib/api/mileapp';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { formatDateUniversal, getBasePlate } from '@/lib/utils';
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
  const [unmappedVehicles, setUnmappedVehicles] = useState([]);

  const checkUncompletedVehicles = async (hubId) => {
    if (!hubId || hubId === 'all') return;
    try {
      const vehicles = await getVehicles(hubId);
      if (!Array.isArray(vehicles)) return;

      const unmappedMap = new Map();
      vehicles.forEach((v) => {
        const hasStorage = Boolean(v.storage && String(v.storage).trim() !== '');
        const rawType = v._rawType || (v.type ? v.type.replace(/^(Dry|Frozen)-/i, '') : '');
        const hasType = Boolean(rawType && String(rawType).trim() !== '');

        if (hasStorage && hasType) return;

        const base = v.base_plate || getBasePlate(v.license_number || v.plat);
        if (!base) return;

        const existing = unmappedMap.get(base);
        if (!existing) {
          unmappedMap.set(base, {
            base_plate: base,
            license_number: base,
            vehicle_ids: v.vehicle_id ? [v.vehicle_id] : [],
            storage: v.storage || '',
            type: rawType || '',
          });
        } else if (v.vehicle_id && !existing.vehicle_ids.includes(v.vehicle_id)) {
          existing.vehicle_ids.push(v.vehicle_id);
        }
      });

      setUnmappedVehicles(Array.from(unmappedMap.values()));
    } catch (err) {
      console.warn('[DataSync] Check uncompleted vehicles error:', err.message);
    }
  };

  useEffect(() => {
    const { storedLocation } = getLocalStorage();
    if (storedLocation && storedLocation !== 'all') {
      checkUncompletedVehicles(storedLocation);
    }
  }, []);

  useEffect(() => {
    const runSync = async () => {
      if (typeof window === 'undefined' || isSyncingRef.current || hasRunRef.current) return;

      const { storedUser, storedLocation, storedLocationName } = getLocalStorage();
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

          setStatus('common.driver');
          await postDriverList([targetHubId]).catch((err) =>
            console.warn('[DataSync] Driver sync error:', err.message)
          );

          setStatus('common.vehicle');
          await postVehicles([targetHubId]).catch((err) =>
            console.warn('[DataSync] Vehicle sync error:', err.message)
          );

          try {
            const hubsRes = await getHubs();
            const currentHub = hubsRes?.allHub?.find((h) => String(h._id) === String(targetHubId));
            if (currentHub?.hasVms) {
              await Promise.allSettled([
                patchVehicleMceasy(targetHubId, storedLocationName),
                patchDriverMceasy(targetHubId, storedLocationName),
              ]);
            }
          } catch (err) {
            console.warn('[DataSync] Hub/VMS check error:', err.message);
          }
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
        await checkUncompletedVehicles(targetHubId);
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

    const handleSyncVehiclesCompleted = () => {
      const { storedLocation } = getLocalStorage();
      if (storedLocation) checkUncompletedVehicles(storedLocation);
    };

    window.addEventListener('session_update', handleSessionUpdate);
    window.addEventListener('tms-sync-vehicles-completed', handleSyncVehiclesCompleted);

    return () => {
      window.removeEventListener('session_update', handleSessionUpdate);
      window.removeEventListener('tms-sync-vehicles-completed', handleSyncVehiclesCompleted);
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

  return (
    <>
      {unmappedVehicles.length > 0 && (
        <VehicleModal
          isOpen={true}
          unmappedData={unmappedVehicles}
          onCompleted={async () => {
            const { storedLocation } = getLocalStorage();
            await checkUncompletedVehicles(storedLocation);
            window.dispatchEvent(new CustomEvent('tms-vehicle-configured'));
          }}
          t={t}
        />
      )}
      {children || null}
    </>
  );
}
