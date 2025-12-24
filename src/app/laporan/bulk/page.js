'use client';

import AppLayout from '@/components/AppLayout';
import SelectionLayout from '@/components/SelectionLayout';
import Spinner from '@/components/Spinner';
import BulkReportDownloader from '@/features/reportData/BulkReportDownloader';
import { getOrFetchDriverData } from '@/lib/driverDataHelper';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError } from '@/lib/toastHelper';
import { useEffect, useState } from 'react';

export default function LaporanBulkPage() {
  const [driverData, setDriverData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Kita perlu memuat driverData sekali saat halaman ini dibuka
  useEffect(() => {
    async function loadDriverCache() {
      try {
        const { storedLocation } = getLocalStorage();
        if (!storedLocation) {
          throw new Error('Lokasi tidak ditemukan, harap kembali ke Home.');
        }

        // Panggil helper "pintar"
        const drivers = await getOrFetchDriverData(storedLocation);

        if (!drivers) {
          throw new Error('Gagal memuat data driver.');
        }
        setDriverData(drivers);
      } catch (e) {
        toastError(e.message);
      } finally {
        setIsLoading(false);
      }
    }
    loadDriverCache();
  }, []); // Hanya jalan sekali

  if (isLoading) {
    return (
      <SelectionLayout>
        <Spinner />
      </SelectionLayout>
    );
  }

  // Tampilan utama
  return (
    <AppLayout mainClassName="items-center justify-center px-4">
      <BulkReportDownloader driverData={driverData} />
    </AppLayout>
  );
}
