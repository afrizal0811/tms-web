'use client';

import { useLanguage } from '@/context/LanguageContext';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastWarning } from '@/lib/toast';
import { formatDateUniversal } from '@/lib/utils';
import { useEffect, useRef } from 'react';

const CACHE_NAME = 'tms-pending-cache';
const CACHE_KEY = 'https://tms-web/cache/last-pending-toast-date';

async function getPendingToastDateFromCache() {
  if (typeof window === 'undefined' || !('caches' in window)) return null;
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(CACHE_KEY);
    if (!response) return null;
    const data = await response.json();
    return data?.date || null;
  } catch {
    return null;
  }
}

async function setPendingToastDateToCache(dateStr) {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = new Response(JSON.stringify({ date: dateStr }), {
      headers: { 'Content-Type': 'application/json' },
    });
    await cache.put(CACHE_KEY, response);
  } catch {}
}

export default function PendingReasonNotifier() {
  const { t } = useLanguage();
  const isCheckingRef = useRef(false);

  useEffect(() => {
    const checkNotification = async () => {
      if (typeof window === 'undefined') return;
      if (isCheckingRef.current) return;

      const { storedUser, storedLocation } = getLocalStorage();
      if (!storedUser || !storedLocation) return;

      const userPaths = storedUser?.paths || [];
      const hasSummaryAccess =
        userPaths.length === 0 ||
        userPaths.some((p) => '/summary'.startsWith(p) || p.startsWith('/summary'));

      if (!hasSummaryAccess) return;

      const todayStr = formatDateUniversal(new Date(), 'YYYY-MM-DD');
      const lastShownDate = await getPendingToastDateFromCache();

      if (lastShownDate === todayStr) {
        return;
      }

      isCheckingRef.current = true;

      try {
        const res = await fetch(
          `/api/mileapp/pending-details/check?hubId=${encodeURIComponent(storedLocation)}`
        );
        if (!res.ok) {
          isCheckingRef.current = false;
          return;
        }

        const data = await res.json();
        const count = data.count || 0;

        await setPendingToastDateToCache(todayStr);

        if (count > 0) {
          const template =
            t('summary.tabs.pending_reasons.toast_uncompleted', { count }) ||
            'Terdapat {count} data pending yang perlu dilengkapi!';
          const message = template.replace('{count}', count);
          toastWarning(message);
        }
      } catch (err) {
        console.error('Error checking pending reasons:', err);
      } finally {
        isCheckingRef.current = false;
      }
    };

    checkNotification();

    const handleSessionUpdate = () => {
      checkNotification();
    };

    window.addEventListener('session_update', handleSessionUpdate);
    return () => window.removeEventListener('session_update', handleSessionUpdate);
  }, [t]);

  return null;
}
