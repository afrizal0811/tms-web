'use client';

import SelectionLayout from '@/components/SelectionLayout';
import Spinner from '@/components/Spinner';
import { useLanguage } from '@/context/LanguageContext';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError } from '@/lib/toastHelper';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SessionGuard({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  // State untuk melacak apakah sesi sudah diverifikasi
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    // 1. Jika kita ada di halaman Home ('/'),
    // kita tidak perlu cek apa-apa. Langsung loloskan.
    if (pathname === '/') {
      //eslint-disable-next-line
      setIsVerified(true);
      return;
    }

    // 2. Jika kita di halaman LAIN (misal /laporan, /vehicles):
    // Cek localStorage.
    try {
      const {
        storedUser: user,
        storedLocation: location,
        storedLocationName: locationName,
      } = getLocalStorage();

      // 3. Jika salah satu data penting tidak ada, redirect paksa.
      if (!user || !location || !locationName) {
        toastError(t('home.toast.no_session'));
        router.push('/'); // <-- Redirect ke Halaman "Selamat Datang"
      } else {
        // 4. Jika semua data ada, loloskan.
        setIsVerified(true);
      }
    } catch (e) {
      // (Jaga-jaga jika localStorage tidak bisa diakses)
       toastError(t('home.toast.error', { err: e.message }));
      router.push('/');
    }

    // Efek ini berjalan setiap kali halaman (pathname) berubah
  }, [pathname, router, t]);

  // Selagi 'useEffect' di atas sedang memeriksa localStorage,
  // kita tampilkan loading spinner. Ini mencegah "flash"
  // halaman yang error sebelum redirect.
  if (!isVerified) {
    return (
      <SelectionLayout>
        <Spinner />
      </SelectionLayout>
    );
  }

  // Jika sudah terverifikasi (atau ada di '/'), tampilkan halaman
  return <>{children}</>;
}
