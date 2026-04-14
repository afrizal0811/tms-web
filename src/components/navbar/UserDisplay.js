'use client';

import BaseModal from '@/components/BaseModal';
import VehicleTagMappingModal from '@/components/modal/VehicleTagMappingModal';
import { useLanguage } from '@/context/LanguageContext';
import { useVehicleTagCheck } from '@/lib/hooks/useVehicleTagCheck';
import { getLocalStorage, removeLocalStorage } from '@/lib/localStorageHandler';
import { toastError } from '@/lib/toastHelper';
import { capitalizeText } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export default function UserDisplay() {
  const { t, lang, switchLanguage } = useLanguage();
  const dropdownRef = useRef(null);
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState(lang);

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

  // MEMICU PENGECEKAN KENDARAAN SETIAP KALI REFRESH ATAU GANTI HALAMAN
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
        // KUNCI PERBAIKAN: Menyertakan fungsi kosong (empty callback) sebagai parameter onSuccess
        triggerCheck(hubId, () => {
          // Tidak perlu melakukan apa-apa setelah check/mapping selesai pada saat navigasi biasa
        });
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

  if (!userName) return null;

  return (
    <>
      <div className="relative inline-block text-left w-full lg:w-auto" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center justify-between lg:justify-start gap-2 text-sm font-medium transition-colors outline-none cursor-pointer w-full lg:w-auto ${isOpen ? 'text-sky-600' : 'text-slate-700 hover:text-slate-900'}`}
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
          <div className="mt-2 rounded-md ring-1 ring-black ring-opacity-5 focus:outline-none z-50 animate-in fade-in zoom-in-95 duration-100 relative w-full shadow-none border border-gray-100 bg-gray-50 lg:absolute lg:right-0 lg:w-48 lg:shadow-lg lg:border-none lg:bg-white">
            <div className="py-1">
              <button
                onClick={() => {
                  setSelectedLang(lang);
                  setIsOpen(false);
                  setIsLangModalOpen(true);
                }}
                className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 text-slate-700 hover:bg-sky-50 transition-colors cursor-pointer"
              >
                {t('navbar.language')}
              </button>

              <Link
                href="/settings"
                onClick={() => setIsOpen(false)}
                className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 text-slate-700 hover:bg-sky-50 transition-colors cursor-pointer"
              >
                {t('navbar.setting')}
              </Link>

              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer "
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
                className="px-4 py-2 bg-white text-slate-600 border border-slate-300 rounded hover:bg-slate-50 transition-colors font-medium text-sm cursor-pointer"
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
            <label className="text-sm font-medium text-slate-600">
              {t('navbar.modal.language_title')}
            </label>
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 cursor-pointer"
            >
              <option value="id">🇮🇩 Indonesia (ID)</option>
              <option value="en">🇬🇧 English (EN)</option>
            </select>
          </div>
        </BaseModal>
      </div>

      {/* RENDER MODAL SECARA GLOBAL DI NAVIGASI */}
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
