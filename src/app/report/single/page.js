'use client';

import AppLayout from '@/components/AppLayout';
import SelectionLayout from '@/components/SelectionLayout';
import Spinner from '@/components/Spinner';
import { useLanguage } from '@/context/LanguageContext';
import SingleReport from '@/features/reports/SingleReport';
import { getOrFetchDriverData } from '@/lib/driverDataHelper';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError } from '@/lib/toastHelper';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LaporanPage() {
  const router = useRouter();
  const { t } = useLanguage();

  const [data, setData] = useState(null);
  const [isAnyLoading, setIsAnyLoading] = useState(false);
  const [isMapping, setIsMapping] = useState(false);

  useEffect(() => {
    async function loadLaporanData() {
      try {
        const { storedLocation, storedLocationName } = getLocalStorage();

        const drivers = await getOrFetchDriverData(storedLocation);

        setData({
          selectedLocation: storedLocation,
          selectedLocationName: storedLocationName,
          driverData: drivers || [],
        });
      } catch (e) {
        toastError(t('common.toast.error', { err: e.message }));
        router.push('/');
      }
    }

    loadLaporanData();
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
      <SingleReport
        selectedLocation={data.selectedLocation}
        selectedLocationName={data.selectedLocationName}
        driverData={data.driverData}
        isAnyLoading={isAnyLoading}
        setIsAnyLoading={setIsAnyLoading}
        isMapping={isMapping}
        setIsMapping={setIsMapping}
      />
    </AppLayout>
  );
}
