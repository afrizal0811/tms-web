'use client';

import BaseModal from '@/components/BaseModal';
import VehicleTagMappingModal from '@/components/modal/VehicleTagMappingModal';
import { useLanguage } from '@/context/LanguageContext';
import { useVehicleTagCheck } from '@/lib/hooks/useVehicleTagCheck';
import { getLocalStorage, removeLocalStorage } from '@/lib/localStorageHandler';
import { toastError } from '@/lib/toastHelper';
import { capitalizeText } from '@/lib/utils';
import { useTheme } from 'next-themes'; // Import useTheme
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export default function UserDropdown() {
  const { t, lang, switchLanguage } = useLanguage();
  const { theme, setTheme, resolvedTheme } = useTheme(); // Hook tema
  const dropdownRef = useRef(null);
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState(lang);
  const [mounted, setMounted] = useState(false); // State untuk mencegah hydration error

  const { isChecking, showModal, unmappedData, triggerCheck, handleMappingCompleted } =
    useVehicleTagCheck();

  const [userName, setUserName] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const { storedUser } = getLocalStorage();
        if (storedUser) {
          const user = JSON.parse(storedUser);
          return capitalizeText(user.name || '');
        }
      } catch (e) {
        toastError(t('common.toast.error', { err: e.message }));
      }
    }
    return '';
  });

  // Mencegah hydration mismatch error
  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (userName) {
      const { storedUser, storedLocation } = getLocalStorage();
      let hubId = storedLocation;
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed.activeHubId) hubId = parsed.activeHubId;
        } catch (e) {}
      }
      if (hubId) {
        triggerCheck(hubId, () => {});
      }
    }
  }, [pathname, userName, triggerCheck]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSaveLang = () => {
    switchLanguage(selectedLang);
    setIsLangModalOpen(false);
    window.location.reload();
  };

  const handleLogout = () => {
    removeLocalStorage('data');
    window.location.href = '/';
  };

  const isDarkMode = mounted && (theme === 'dark' || resolvedTheme === 'dark');

  if (!userName) return null;

  return (
    <>
      <div className="relative inline-block text-left w-full lg:w-auto" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center justify-between lg:justify-start gap-2 text-sm font-medium transition-colors outline-none cursor-pointer w-full lg:w-auto ${
            isOpen
              ? 'text-sky-600 dark:text-sky-400'
              : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <span>{userName}</span>
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {isOpen && (
          <div className="mt-2 rounded-md ring-1 ring-black dark:ring-slate-700 ring-opacity-5 dark:ring-opacity-100 focus:outline-none z-50 animate-in fade-in zoom-in-95 duration-100 relative w-full shadow-none border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 lg:absolute lg:right-0 lg:w-56 lg:shadow-lg lg:border-none lg:bg-white lg:dark:bg-slate-800">
            <div className="py-1">
              {/* --- BARIS DARK MODE SWITCH --- */}
              <div className="flex items-center justify-between px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 border-b border-gray-100 dark:border-slate-700/50 mb-1">
                <span className="font-medium">
                  {isDarkMode ? t('common.dark_mode') : t('common.light_mode')}
                </span>
                <button
                  onClick={() => setTheme(isDarkMode ? 'light' : 'dark')}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isDarkMode ? 'bg-sky-600' : 'bg-gray-200 dark:bg-slate-600'
                  }`}
                >
                  <span
                    className={`pointer-events-none relative h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                      isDarkMode ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  >
                    {isDarkMode ? (
                      <span className="text-[10px]">🌙</span>
                    ) : (
                      <span className="text-[10px]">🌞</span>
                    )}
                  </span>
                </button>
              </div>

              <button
                onClick={() => {
                  setSelectedLang(lang);
                  setIsOpen(false);
                  setIsLangModalOpen(true);
                }}
                className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                {t('navbar.language')}
              </button>

              <Link
                href="/settings"
                onClick={() => setIsOpen(false)}
                className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                {t('navbar.setting')}
              </Link>

              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-slate-700/50 hover:text-red-700 dark:hover:text-red-300 transition-colors cursor-pointer"
              >
                {t('navbar.logout')}
              </button>
            </div>
          </div>
        )}

        <BaseModal
          isOpen={isLangModalOpen}
          onClose={() => setIsLangModalOpen(false)}
          title={t('navbar.language')}
          maxWidth="max-w-md"
          footer={
            <div className="flex justify-end gap-3 w-full">
              <button
                onClick={() => setIsLangModalOpen(false)}
                className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium text-sm cursor-pointer"
              >
                {t('navbar.modal.btn_cancel')}
              </button>
              <button
                onClick={handleSaveLang}
                className="px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 transition-colors font-medium text-sm cursor-pointer"
              >
                {t('navbar.modal.btn_save')}
              </button>
            </div>
          }
        >
          <div className="flex flex-col gap-2 pt-2">
            <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
              {t('navbar.modal.language_title')}
            </label>
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 cursor-pointer"
            >
              <option value="id">🇮🇩 Indonesia (ID)</option>
              <option value="en">🇬🇧 English (EN)</option>
            </select>
          </div>
        </BaseModal>
      </div>

      {showModal && (
        <VehicleTagMappingModal
          onCompleted={handleMappingCompleted}
          t={t}
          unmappedData={unmappedData}
        />
      )}
    </>
  );
}
