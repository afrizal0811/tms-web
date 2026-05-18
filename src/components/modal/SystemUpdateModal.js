'use client';

import { useLanguage } from '@/context/LanguageContext';
import { getLocalStorage, setLocalStorage } from '@/lib/localStorageHandler';
import { toastError } from '@/lib/toastHelper';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const CURRENT_APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION;

export default function SystemUpdateModal() {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
      const { storedUser, appVersion } = getLocalStorage();
      if (storedUser) {
        if (appVersion !== CURRENT_APP_VERSION) {
          setIsOpen(true);
          document.body.style.overflow = 'hidden';
        }
      }
    }, 0);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = 'auto';
    };
  }, []);

  const handleApplyUpdate = async () => {
    const { storedSession, storedLanguage } = getLocalStorage();
    localStorage.clear();
    sessionStorage.clear();

    if (storedSession) {
      const newData = {
        user: storedSession.user || null,
        superadminRoleId: storedSession.superadminRoleId || null,
        colPrefs: storedSession.colPrefs || null,
      };
      setLocalStorage('data', JSON.stringify(newData));
    }

    if (storedLanguage) {
      setLocalStorage('language', storedLanguage);
    }

    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      } catch (err) {
        toastError(t('common.toast.error', { err: err.message }));
      }
    }

    window.location.reload();
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md p-6 mx-4 bg-white rounded-xl shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="flex items-center justify-center w-16 h-16 bg-sky-100 rounded-full mb-4">
          <svg
            className="w-8 h-8 text-sky-600 animate-[spin_3s_linear_infinite_reverse]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </div>

        <h3 className="text-xl font-bold text-slate-800 mb-2">{t('update.title')}</h3>

        <p className="text-sm text-slate-600 mb-6 leading-relaxed">{t('update.text')}</p>

        <button
          onClick={handleApplyUpdate}
          className="w-full px-4 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer"
        >
          {t('update.btn_update')}
        </button>
      </div>
    </div>,
    document.body
  );
}
