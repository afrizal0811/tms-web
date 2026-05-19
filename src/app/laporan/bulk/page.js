'use client';

import AppLayout from '@/components/AppLayout';
import SelectionLayout from '@/components/SelectionLayout';
import Spinner from '@/components/Spinner';
import { useLanguage } from '@/context/LanguageContext';
import BulkReport from '@/features/reportData/BulkReport';
import { getDrivers } from '@/lib/api';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError } from '@/lib/toastHelper';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LaporanBulkPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [data, setData] = useState(null);

  useEffect(() => {
    async function loadBulkData() {
      try {
        const { storedLocation } = getLocalStorage();
        const drivers = await getDrivers(storedLocation);

        setData({
          driverData: drivers || [],
        });
      } catch (e) {
        toastError(t('common.toast.error', { err: e.message }));
        router.push('/');
      }
    }

    loadBulkData();
  }, [router, t]);

  if (!data) {
    return (
      <SelectionLayout>
        <Spinner />
      </SelectionLayout>
    );
  }

  return (
    <AppLayout mainClassName="items-center justify-center px-4">
      <BulkReport driverData={data.driverData} />
    </AppLayout>
  );
}
