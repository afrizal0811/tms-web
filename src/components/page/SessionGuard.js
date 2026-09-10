'use client';

import SelectionLayout from '@/components/page/SelectionLayout';
import Spinner from '@/components/Spinner';
import { useLanguage } from '@/context/LanguageContext';
import { getRoles } from '@/lib/api/mileapp';
import { getLocalStorage, updateUserPaths } from '@/lib/localStorageHandler';
import { toastError } from '@/lib/toast';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SessionGuard({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();

  const [isVerified, setIsVerified] = useState(false);

  const isSecret = typeof window !== 'undefined' && window.SECRET_MODE_ACTIVE === true;
  const publicPaths = ['/', '/help', '/setting'];
  if (isSecret) publicPaths.push('/setting');
  const isPublicPage = publicPaths.includes(pathname);

  useEffect(() => {
    if (isPublicPage) return;

    const checkAuthAndAccess = async () => {
      try {
        const { storedUser, storedLocation, storedLocationName } = getLocalStorage();

        if (!storedUser || !storedLocation || !storedLocationName) {
          toastError(t('home.toast.no_session'));
          router.push('/');
          return;
        }

        const parsedUser = JSON.parse(storedUser);
        let userPaths = parsedUser.paths || [];

        await getRoles()
          .then((roles) => {
            const myRole = (roles || []).find(
              (r) => String(r._id || r.id) === String(parsedUser.roleId)
            );
            const freshPaths = myRole?.paths || [];
            if (JSON.stringify(userPaths) !== JSON.stringify(freshPaths)) {
              updateUserPaths(freshPaths);
              if (
                !isSecret &&
                freshPaths.length > 0 &&
                !freshPaths.some((p) => pathname.startsWith(p))
              ) {
                window.location.href = '/';
              }
            }
          })
          .catch(() => {});

        if (!isSecret && userPaths.length > 0) {
          const hasAccess = userPaths.some((p) => pathname.startsWith(p));
          if (!hasAccess) {
            router.replace('/');
            return;
          }
        }

        setIsVerified(true);
      } catch (e) {
        toastError(t('common.toast.error', { err: e.message }));
        router.push('/');
      }
    };

    checkAuthAndAccess();
  }, [pathname, router, t, isPublicPage, isSecret]);

  if (isPublicPage) return <>{children}</>;

  if (!isVerified) {
    return (
      <SelectionLayout>
        <Spinner />
      </SelectionLayout>
    );
  }

  return <>{children}</>;
}
