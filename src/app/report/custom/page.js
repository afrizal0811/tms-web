'use client';

import AppLayout from '@/components/page/AppLayout';
import SelectionLayout from '@/components/page/SelectionLayout';
import Spinner from '@/components/Spinner';
import { useLanguage } from '@/context/LanguageContext';
import CustomReport from '@/features/reports/CustomReport';
import { getDriverData } from '@/lib/driverData';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError } from '@/lib/toast';
import { useEffect, useState } from 'react';

export default function BreadReportPage() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { t, isIndonesian } = useLanguage();

  useEffect(() => {
    async function fetchData() {
      try {
        const { storedLocation, storedLocationName, storedLocationAcronym } = getLocalStorage();
        const drivers = await getDriverData(storedLocation);
        setData({
          storedLocation,
          storedLocationName,
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
      <CustomReport
        driverData={data.driverData}
        hubAcronym={data.storedLocationAcronym}
        hubId={data.storedLocation}
        hubName={data.storedLocationName}
        isIndonesian={isIndonesian}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
        t={t}
      />
    </AppLayout>
  );
}
