'use client';

import SelectionLayout from '@/components/SelectionLayout';
import Spinner from '@/components/Spinner';
import { useLanguage } from '@/context/LanguageContext';
import { useSuperadmin } from '@/lib/hooks/useSuperadmin';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError } from '@/lib/toast';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SessionGuard({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();

  const [isVerified, setIsVerified] = useState(false);

  const isSecret = typeof window !== 'undefined' && window.SECRET_MODE_ACTIVE === true;
  const publicPaths = ['/', '/help'];
  if (isSecret) publicPaths.push('/setting');
  const isPublicPage = publicPaths.includes(pathname);

  const superadminPaths = ['/mitsui', '/report/counter', '/summary'];
  const isSuperadminPage = superadminPaths.some((p) => pathname.startsWith(p));

  const { isSuperadmin, isChecking } = useSuperadmin('/');

  useEffect(() => {
    if (isPublicPage) return;

    try {
      const {
        storedUser: user,
        storedLocation: location,
        storedLocationName: locationName,
      } = getLocalStorage();

      if (!user || !location || !locationName) {
        toastError(t('home.toast.no_session'));
        router.push('/');
      } else {
        setTimeout(() => {
          setIsVerified(true);
        }, 0);
      }
    } catch (e) {
      toastError(t('common.toast.error', { err: e.message }));
      router.push('/');
    }
  }, [pathname, router, t, isPublicPage]);

  if (isPublicPage) return <>{children}</>;

  if (!isVerified || (isSuperadminPage && isChecking)) {
    return (
      <SelectionLayout>
        <Spinner />
      </SelectionLayout>
    );
  }

  if (isSuperadminPage && !isSuperadmin) return null;

  return <>{children}</>;
}
