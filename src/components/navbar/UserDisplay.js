// File: src/components/navbar/UserDisplay.js
'use client';

import BaseModal from '@/components/BaseModal';
import { useLanguage } from '@/context/LanguageContext';
import { getHubs, getRoles, syncHubsData, syncRolesData } from '@/lib/apiService';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError, toastInfo } from '@/lib/toastHelper';
import { useEffect, useRef, useState } from 'react';

// KUNCI EFISIENSI: Array Konfigurasi.
// Kalau besok mau nambah tabel baru, cukup tambah 1 baris di sini!
const SYNC_CONFIG = [
  { id: 'hubs', title: 'Data Cabang (Hubs)', syncLabel: 'Sync Hubs' },
  { id: 'roles', title: 'Data Peran (Roles)', syncLabel: 'Sync Roles' },
  // { id: 'users', title: 'Data Pengguna (Users)', syncLabel: 'Sync Users' }, <-- Contoh nambah nanti
];

export default function UserDisplay() {
  const { t, lang, switchLanguage } = useLanguage();
  const dropdownRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [canSync, setCanSync] = useState(false);

  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState(lang);

  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [needsRefresh, setNeedsRefresh] = useState(false);

  // KUNCI EFISIENSI: Semua data digabung ke dalam 1 Object State
  const [lastUpdated, setLastUpdated] = useState({});
  const [syncLoading, setSyncLoading] = useState({ all: false });

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

  // Cek izin akses
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
        console.error('Gagal memverifikasi izin sinkronisasi:', error);
      }
    };
    checkSyncPermission();
  }, []);

  // Fetch waktu "Last Updated"
  useEffect(() => {
    if (isSyncModalOpen) {
      const fetchLastUpdated = async () => {
        try {
          const [hubs, roles] = await Promise.all([getHubs(), getRoles()]);

          // Masukkan semua waktu ke dalam 1 objek dengan rapi
          setLastUpdated({
            hubs:
              hubs.length > 0 && hubs[0].updatedAt
                ? new Date(hubs[0].updatedAt).toLocaleString('id-ID')
                : '-',
            roles:
              roles.length > 0 && roles[0].updatedAt
                ? new Date(roles[0].updatedAt).toLocaleString('id-ID')
                : '-',
          });
        } catch (error) {
          console.error('Gagal memuat tanggal terakhir update:', error);
        }
      };
      fetchLastUpdated();
    }
  }, [isSyncModalOpen, needsRefresh]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSaveLang = () => {
    switchLanguage(selectedLang);
    setIsLangModalOpen(false);
    window.location.reload();
  };

  const handleCloseSyncModal = () => {
    setIsSyncModalOpen(false);
    if (needsRefresh) window.location.reload();
  };

  // Fungsi dinamis untuk mengeksekusi sinkronisasi apapun
  const executeSync = async (type) => {
    // Nyalakan loading khusus untuk ID yang ditekan (atau 'all')
    setSyncLoading((prev) => ({ ...prev, [type]: true }));

    try {
      if (type === 'hubs') {
        await syncHubsData();
      } else if (type === 'roles') {
        await syncRolesData();
      } else if (type === 'all') {
        await Promise.all([syncHubsData(), syncRolesData()]);
      }

      toastInfo(`✅ Sinkronisasi ${type === 'all' ? 'semua data' : type} berhasil!`);
      setNeedsRefresh(true);
    } catch (error) {
      console.error(error);
    } finally {
      // Matikan loading
      setSyncLoading((prev) => ({ ...prev, [type]: false }));
    }
  };

  if (!userName) return null;

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
            <button
              onClick={() => {
                setSelectedLang(lang);
                setIsOpen(false);
                setIsLangModalOpen(true);
              }}
              className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 text-slate-700 hover:bg-sky-50 transition-colors cursor-pointer"
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
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsSyncModalOpen(true);
                }}
                className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 text-slate-700 hover:bg-sky-50 transition-colors cursor-pointer border-t border-gray-100"
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
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                  />
                </svg>
                Sinkronisasi Data
              </button>
            )}
          </div>
        </div>
      )}

      {/* MODAL PENGATURAN BAHASA */}
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

      {/* MODAL SINKRONISASI DATA */}
      <BaseModal
        isOpen={isSyncModalOpen}
        onClose={handleCloseSyncModal}
        title="Sinkronisasi Database"
        maxWidth="max-w-xl"
        footer={
          <div className="flex justify-between w-full items-center">
            <button
              onClick={handleCloseSyncModal}
              className="px-4 py-2 bg-white text-slate-600 border border-slate-300 rounded hover:bg-slate-50 transition-colors font-medium text-sm cursor-pointer"
            >
              Tutup
            </button>
            <button
              onClick={() => executeSync('all')}
              // Tombol akan nonaktif jika 'all' loading, atau ADA SATU PUN item yang sedang loading
              disabled={syncLoading.all || Object.values(syncLoading).some((val) => val === true)}
              className="px-6 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 transition-colors font-medium text-sm disabled:bg-gray-400 flex items-center gap-2 cursor-pointer"
            >
              {syncLoading.all && (
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              )}
              {syncLoading.all ? 'Menyelaraskan...' : 'Sync Semua'}
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-4 pt-2 pb-4">
          <p className="text-sm text-slate-600 mb-2">
            Pilih data yang ingin Anda perbarui dari sistem Vendor ke dalam database lokal Anda.
          </p>

          {/* KUNCI EFISIENSI: Rendering otomatis menggunakan array SYNC_CONFIG */}
          {SYNC_CONFIG.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <div>
                <div className="font-bold text-slate-800">{item.title}</div>
                <div className="text-xs text-slate-500 mt-1">
                  Terakhir diperbarui: {lastUpdated[item.id] || 'Memuat...'}
                </div>
              </div>
              <button
                onClick={() => executeSync(item.id)}
                disabled={syncLoading[item.id] || syncLoading.all}
                className="px-4 py-1.5 text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 rounded font-medium disabled:opacity-50 transition-colors cursor-pointer flex items-center min-w-[120px] justify-center gap-2"
              >
                {syncLoading[item.id] ? 'Loading...' : item.syncLabel}
              </button>
            </div>
          ))}
        </div>
      </BaseModal>
    </div>
  );
}
