// File: src/lib/hooks/useSuperadmin.js
'use client';

import { getRoles } from '@/lib/api';
import {
  getLocalStorage,
  getSuperadminRoleId,
  setSuperadminRoleId,
} from '@/lib/localStorageHandler';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export function useSuperadmin(redirectPath = null) {
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    const verifySuperadmin = async () => {
      try {
        const { storedUser } = getLocalStorage();
        if (!storedUser) {
          if (isMounted) setIsSuperadmin(false);
          if (redirectPath) router.replace(redirectPath);
          return;
        }

        const user = JSON.parse(storedUser);
        const superadminId = getSuperadminRoleId();

        if (superadminId && user.roleId === superadminId) {
          if (isMounted) setIsSuperadmin(true);
          return;
        }

        const roles = await getRoles();
        const validRoles = roles.filter(
          (r) => r.name.toLowerCase() === 'superadmin' || r.name.toLowerCase() === 'owner'
        );
        const validIds = validRoles.map((r) => r._id);

        const superRole = validRoles.find((r) => r.name.toLowerCase() === 'superadmin');
        if (superRole) setSuperadminRoleId(superRole._id);

        const isSuper = validIds.includes(user.roleId);
        if (isMounted) {
          setIsSuperadmin(isSuper);
          if (!isSuper && redirectPath) router.replace(redirectPath);
        }
      } catch (e) {
        if (isMounted) setIsSuperadmin(false);
        if (redirectPath) router.replace(redirectPath);
      } finally {
        if (isMounted) setIsChecking(false);
      }
    };

    verifySuperadmin();
    return () => {
      isMounted = false;
    };
  }, [router, redirectPath]);

  return { isSuperadmin, isChecking };
}
