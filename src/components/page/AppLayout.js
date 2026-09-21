'use client';

import Navbar from '@/components/navbar/Navbar';
import Footer from '@/components/page/Footer';
import { useLanguage } from '@/context/LanguageContext';
import { getDrivers } from '@/lib/api/mileapp';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError } from '@/lib/toast';
import { useEffect } from 'react';

export default function AppLayout({ children, mainClassName }) {
  const { t } = useLanguage();
  useEffect(() => {
    const { storedLocation } = getLocalStorage();
    if (storedLocation) {
      getDrivers(storedLocation, true).catch((err) => {
        toastError(t('common.toast.error', { err: err.message }));
      });
    }
  }, [t]);

  return (
    <div className="flex flex-col h-screen overflow-auto">
      <Navbar />
      <main className={`grow flex flex-col w-full pt-8 ${mainClassName || ''}`}>{children}</main>
      <Footer />
    </div>
  );
}
