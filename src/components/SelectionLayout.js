'use client';

import Footer from '@/components/Footer';
import Navbar from '@/components/navbar/Navbar';
import { useLanguage } from '@/context/LanguageContext';
import { getOrFetchDriverData } from '@/lib/driverDataHelper';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError } from '@/lib/toast';
import { useEffect } from 'react';

export default function SelectionLayout({ children }) {
  const { t } = useLanguage();
  useEffect(() => {
    const { storedSession } = getLocalStorage();
    if (storedSession?.activeHubId) {
      getOrFetchDriverData(storedSession.activeHubId, true).catch((err) => {
        toastError(t('common.toast.error', { err: err.message }));
      });
    }
  }, [t]);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="grow flex flex-col justify-center items-center w-full p-6">{children}</main>
      <Footer />
    </div>
  );
}
