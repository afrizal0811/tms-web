'use client';

import BaseModal from '@/components/BaseModal';
import { useLanguage } from '@/context/LanguageContext';
import { getRoles } from '@/lib/api';
import { getLocalStorage, removeLocalStorage } from '@/lib/localStorageHandler';
import { toastError } from '@/lib/toastHelper';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

export default function UserDisplay() {
  const { t, lang, switchLanguage } = useLanguage();
  const dropdownRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [canSync, setCanSync] = useState(false);
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState(lang);

  const [userName, setUserName] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const { storedUser } = getLocalStorage();
        if (storedUser) {
          const user = JSON.parse(storedUser);
          return user.name || '';
        }
      } catch (e) {
        toastError(t('home.toast.error', { err: e.message }));
      }
    }
    return '';
  });

  useEffect(() => {
    const checkSyncPermission = async () => {
      try {
        const { storedUser } = getLocalStorage();
        if (storedUser) {
          const user = JSON.parse(storedUser);
          const roles = await getRoles();
          const superadminRole = roles.find((r) => r.name.toLowerCase() === 'superadmin');
          const ownerRole = roles.find((r) => r.name.toLowerCase() === 'owner');

          if (
            (superadminRole && user.roleId === superadminRole._id) ||
            (ownerRole && user.roleId === ownerRole._id)
          ) {
            setCanSync(true);
          }
        }
      } catch (error) {
        console.error(error);
      }
    };
    checkSyncPermission();
  }, []);

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
    removeLocalStorage('tms_user_session');
    window.location.href = '/';
  };

  if (!userName) return null;

  return (
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
                />
              </svg>
              {t('common.language') || 'Pengaturan Bahasa'}
            </button>

            {canSync && (
              <Link
                href="/settings"
                onClick={() => setIsOpen(false)}
                className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 text-slate-700 hover:bg-sky-50 transition-colors cursor-pointer border-t border-gray-100"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Pengaturan
              </Link>
            )}

            {/* TOMBOL LOGOUT */}
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer border-t border-gray-100 font-medium"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                />
              </svg>
              Keluar Akun
            </button>
          </div>
        </div>
      )}

      <BaseModal
        isOpen={isLangModalOpen}
        onClose={() => setIsLangModalOpen(false)}
        title={t('common.language') || 'Pengaturan Bahasa'}
        maxWidth="max-w-md"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <button
              onClick={() => setIsLangModalOpen(false)}
              className="px-4 py-2 bg-white text-slate-600 border border-slate-300 rounded hover:bg-slate-50 transition-colors font-medium text-sm cursor-pointer"
            >
              Batal
            </button>
            <button
              onClick={handleSaveLang}
              className="px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 transition-colors font-medium text-sm cursor-pointer"
            >
              Simpan
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-2 pt-2">
          <label className="text-sm font-medium text-slate-600">
            Pilih Bahasa / Select Language
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
  );
}
