// File: src/components/navbar/UserDisplay.js
'use client';

import { useLanguage } from '@/context/LanguageContext';
import { getRoles } from '@/lib/apiService'; // <-- Panggil pelayan untuk cek role
import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError } from '@/lib/toastHelper';
import { useEffect, useRef, useState } from 'react';
import SyncDataButton from './SyncDataButton';

export default function UserDisplay() {
  const { t, lang, switchLanguage } = useLanguage();
  const dropdownRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  // KUNCI: State khusus untuk menyimpan izin melihat tombol sinkronisasi
  const [canSync, setCanSync] = useState(false);

  const [userName, setUserName] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const { storedUser: userStr } = getLocalStorage();
        if (userStr) {
          const user = JSON.parse(userStr);
          return user.name || '';
        }
      } catch (e) {
        toastError(t('home.toast.error', { err: e.message }));
      }
    }
    return '';
  });

  // Pengecekan Izin Akses (Otorisasi)
  useEffect(() => {
    const checkSyncPermission = async () => {
      try {
        const { storedUser } = getLocalStorage();
        if (storedUser) {
          const user = JSON.parse(storedUser);

          // 1. Ambil data semua peran dari database lokal
          const roles = await getRoles();

          // 2. Cari mana yang merupakan Superadmin dan Owner
          const superadminRole = roles.find((r) => r.name.toLowerCase() === 'superadmin');
          const ownerRole = roles.find((r) => r.name.toLowerCase() === 'owner');

          // 3. Cocokkan ID pengguna dengan ID Superadmin atau Owner
          if (
            (superadminRole && user.roleId === superadminRole._id) ||
            (ownerRole && user.roleId === ownerRole._id)
          ) {
            setCanSync(true); // Izinkan jika cocok!
          }
        }
      } catch (error) {
        console.error('Gagal memverifikasi izin sinkronisasi:', error);
      }
    };

    checkSyncPermission();
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!userName) return null;

  const languages = [
    { code: 'id', label: 'Indonesia', flag: '🇮🇩' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
  ];

  return (
    <div className="relative inline-block text-left w-full lg:w-auto" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between lg:justify-start gap-2 text-sm font-medium transition-colors outline-none cursor-pointer w-full lg:w-auto ${
          isOpen ? 'text-sky-600' : 'text-slate-700 hover:text-slate-900'
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
        <div className="mt-2 rounded-md ring-1 ring-black ring-opacity-5 focus:outline-none z-50 animate-in fade-in zoom-in-95 duration-100 relative w-full shadow-none border border-gray-100 bg-gray-50 lg:absolute lg:right-0 lg:w-48 lg:shadow-lg lg:border-none lg:bg-white">
          <div className="py-1">
            <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-gray-200 lg:border-gray-100 mb-1">
              {t('common.language') || 'Language'}
            </div>
            {languages.map((item) => (
              <button
                key={item.code}
                onClick={() => {
                  switchLanguage(item.code);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between group hover:bg-sky-50 transition-colors cursor-pointer ${
                  lang === item.code
                    ? 'text-sky-700 font-medium bg-sky-100/50 lg:bg-sky-50/50'
                    : 'text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{item.flag}</span>
                  <span>{item.label}</span>
                </div>
                {lang === item.code && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4 text-sky-600"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}

            {/* Tombol dan label Database HANYA akan muncul jika canSync = true */}
            {canSync && (
              <>
                <div className="border-t border-gray-200 lg:border-gray-100 my-1"></div>
                <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-gray-200 lg:border-gray-100 mb-1">
                  Database
                </div>
                <SyncDataButton onClose={() => setIsOpen(false)} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
