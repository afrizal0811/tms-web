'use client';

import { getLocalStorage, setLocalStorage } from '@/lib/localStorageHandler'; // KUNCI: Import helper storage kita
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const CURRENT_APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION;

export default function SystemUpdateModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);

      const userVersion = localStorage.getItem('tms_app_version');

      if (userVersion !== CURRENT_APP_VERSION) {
        setIsOpen(true);
        document.body.style.overflow = 'hidden';
      }
    }, 0);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = 'auto';
    };
  }, []);

  const handleApplyUpdate = async () => {
    // 1. AMBIL DATA PENTING SEBELUM DIHAPUS
    // storedUser akan berisi string JSON asli (belum terenkripsi)
    const { storedUser, storedLanguage } = getLocalStorage();

    // 2. BERSIHKAN LOCAL STORAGE TOTAL (Hapus key/sampah tak terpakai)
    localStorage.clear();
    sessionStorage.clear();

    // 3. KEMBALIKAN DATA PENTING (Memicu Enkripsi!)
    if (storedUser) {
      // Fungsi setLocalStorage buatan kita akan otomatis meng-enkripsi 'tms_user_session'
      setLocalStorage('tms_user_session', storedUser);
    }
    if (storedLanguage) {
      setLocalStorage('language', storedLanguage);
    }

    // 4. Set versi terbaru agar modal tidak muncul lagi
    localStorage.setItem('tms_app_version', CURRENT_APP_VERSION);

    // 5. Bersihkan cache browser (statis)
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      } catch (err) {
        console.error('Gagal menghapus cache browser', err);
      }
    }

    // 6. Reload halaman tanpa melempar user ke halaman login
    window.location.reload();
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md p-6 mx-4 bg-white rounded-xl shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="flex items-center justify-center w-16 h-16 bg-sky-100 rounded-full mb-4">
          <svg
            className="w-8 h-8 text-sky-600 animate-[spin_3s_linear_infinite]"
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

        <h3 className="text-xl font-bold text-slate-800 mb-2">Pembaruan Sistem</h3>

        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          Kami telah melakukan pembaruan keamanan dan optimasi sistem. Silakan muat ulang aplikasi
          untuk menerapkan perubahan dan memastikan performa tetap maksimal.
        </p>

        <button
          onClick={handleApplyUpdate}
          className="w-full px-4 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition-colors shadow-md flex items-center justify-center gap-2"
        >
          <span>Muat Ulang Aplikasi</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>
        </button>
      </div>
    </div>,
    document.body
  );
}
