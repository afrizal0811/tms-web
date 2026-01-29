// File: src/components/SessionGuard.js
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

  const [isVerified, setIsVerified] = useState(false);

  const publicPaths = ['/', '/help'];
  const isPublicPage = publicPaths.includes(pathname);

  useEffect(() => {
    if (isPublicPage) {
      return;
    }

    try {
      const {
        storedUser: user,
        storedLocation: location,
        storedLocationName: locationName,
      } = getLocalStorage();

      // 3. Validasi
      if (!user || !location || !locationName) {
        toastError(t('home.toast.no_session'));
        router.push('/');
      } else {
        setTimeout(() => {
          setIsVerified(true);
        }, 0);
      }
    } catch (e) {
      toastError(t('home.toast.error', { err: e.message }));
      router.push('/');
    }
  }, [pathname, router, t, isPublicPage]);

  if (isPublicPage) {
    return <>{children}</>;
  }

  if (!isVerified) {
    return (
      <SelectionLayout>
        <Spinner />
      </SelectionLayout>
    );
  }

  return <>{children}</>;
}
