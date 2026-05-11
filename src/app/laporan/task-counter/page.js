'use client';

import AppLayout from '@/components/AppLayout';
import SelectionLayout from '@/components/SelectionLayout';
import Spinner from '@/components/Spinner';
import TaskCountReport from '@/features/reportData/TaskCountReport';
import { getRoles } from '@/lib/api';
import { getOrFetchDriverData } from '@/lib/driverDataHelper';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError } from '@/lib/toastHelper';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LaporanJumlahTugasPage() {
  const [driverData, setDriverData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function initPage() {
      try {
        const { storedLocation, storedUser } = getLocalStorage();
        if (!storedLocation) {
          throw new Error('Lokasi tidak ditemukan, harap kembali ke Home.');
        }

        if (storedUser) {
          const user = JSON.parse(storedUser);
          const roles = await getRoles();
          const superadminRole = roles.find((r) => r.name.toLowerCase() === 'superadmin');

          if (user.roleId !== superadminRole?._id) {
            toastError('Akses Ditolak: Hanya Superadmin yang dapat mengakses menu ini.');
            router.push('/'); // Tendang ke home jika bukan superadmin
            return;
          }
        }

        // 3. Muat Data Driver
        const drivers = await getOrFetchDriverData(storedLocation);
        setDriverData(drivers || []);
      } catch (e) {
        toastError(e.message);
      } finally {
        setIsLoading(false);
      }
    }
    initPage();
  }, [router]);

  if (isLoading) {
    return (
      <SelectionLayout>
        <Spinner />
      </SelectionLayout>
    );
  }

  return (
    <AppLayout>
      <TaskCountReport driverData={driverData} />
    </AppLayout>
  );
}
