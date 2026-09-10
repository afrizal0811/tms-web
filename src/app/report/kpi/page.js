'use client';

import AppLayout from '@/components/page/AppLayout';
import SelectionLayout from '@/components/page/SelectionLayout';
import Spinner from '@/components/Spinner';
import { useLanguage } from '@/context/LanguageContext';
import KpiReport from '@/features/reports/KpiReport';
import { getDriverData } from '@/lib/driverData';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError } from '@/lib/toast';
import { useEffect, useState } from 'react';

export default function KpiReportPage() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { t, isIndonesian } = useLanguage();

  useEffect(() => {
    async function fetchData() {
      try {
        const { storedLocation, storedLocationAcronym } = getLocalStorage();
        const drivers = await getDriverData(storedLocation);
        setData({
          storedLocation,
          storedLocationAcronym,
          driverData: drivers || [],
        });
      } catch (e) {
        toastError(e.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [t]);

  if (!data) {
    return (
      <SelectionLayout>
        <Spinner />
      </SelectionLayout>
    );
  }

  return (
    <AppLayout mainClassName="items-center justify-center px-4">
      <KpiReport
        driverData={data.driverData}
        hubAcronym={data.storedLocationAcronym}
        hubId={data.storedLocation}
        isIndonesian={isIndonesian}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
        t={t}
      />
    </AppLayout>
  );
}
