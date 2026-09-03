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

export function useSuperadmin() {
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    const verifySuperadmin = async () => {
      try {
        const { storedUser } = getLocalStorage();
        if (!storedUser) {
          if (isMounted) setIsSuperadmin(false);
          return;
        }

        const user = JSON.parse(storedUser);
        const currentId = String(user.roleId);
        const superadminId = getSuperadminRoleId();
        const adminIdsStr = localStorage.getItem('adminRoleIds');

        let isCachedSuper = false;
        let isCachedAdmin = false;

        if (superadminId && currentId === String(superadminId)) {
          isCachedSuper = true;
        } else if (adminIdsStr && adminIdsStr.split(',').includes(currentId)) {
          isCachedAdmin = true;
        }

        if (isCachedSuper || isCachedAdmin) {
          if (isMounted) {
            setIsSuperadmin(isCachedSuper);
            setIsAdmin(isCachedAdmin);
          }
          return;
        }

        const roles = await getRoles();
        const superRoles = roles.filter((r) =>
          ['superadmin', 'owner'].includes(String(r.name).toLowerCase().trim())
        );
        const adminRoles = roles.filter((r) =>
          ['admin', 'admin planer'].includes(String(r.name).toLowerCase().trim())
        );

        const superIds = superRoles.map((r) => String(r._id));
        const adminIds = adminRoles.map((r) => String(r._id));

        const superRole = superRoles.find(
          (r) => String(r.name).toLowerCase().trim() === 'superadmin'
        );

        if (superRole) setSuperadminRoleId(String(superRole._id));
        if (adminIds.length > 0) localStorage.setItem('adminRoleIds', adminIds.join(','));

        if (isMounted) {
          setIsSuperadmin(superIds.includes(currentId));
          setIsAdmin(adminIds.includes(currentId));
        }
      } catch (e) {
        if (isMounted) {
          setIsSuperadmin(false);
          setIsAdmin(false);
        }
      } finally {
        if (isMounted) setIsChecking(false);
      }
    };

    verifySuperadmin();
    return () => {
      isMounted = false;
    };
  }, [router]);

  return { isSuperadmin, isAdmin, isChecking };
}
