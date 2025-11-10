'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import SelectionLayout from '@/components/SelectionLayout';
import Spinner from '@/components/Spinner';
import TmsSummary from '@/features/reportData/TmsSummary';
import { toastError } from '@/lib/toastHelper';
import { getOrFetchDriverData } from '@/lib/driverDataHelper'; // Pastikan path ini benar

export default function LaporanPage() {
  const router = useRouter();

  // State untuk menyimpan data dari localStorage
  const [data, setData] = useState({
    selectedUser: null,
    selectedLocation: null,
    selectedLocationName: null,
    driverData: [],
  });

  // State untuk loading halaman
  const [isLoading, setIsLoading] = useState(true);

  // State yang diperlukan oleh TmsSummary
  const [isAnyLoading, setIsAnyLoading] = useState(false);
  const [isMapping, setIsMapping] = useState(false);

  useEffect(() => {
    // Gunakan 'async' untuk 'await getOrFetchDriverData'
    async function loadLaporanData() {
      try {
        // 1. Ambil data sesi
        const storedUser = localStorage.getItem('selectedUser');
        const storedLocation = localStorage.getItem('userLocation');
        const storedLocationName = localStorage.getItem('userLocationName');

        // 2. Cek data sesi dasar
        if (!storedUser || !storedLocation || !storedLocationName) {
          toastError('Harap pilih user dan lokasi terlebih dahulu.');
          router.push('/');
          return;
        }

        // 3. Ambil data driver dengan "aman"
        // Fungsi ini akan fetch dari API JIKA tidak ada di localStorage
        const drivers = await getOrFetchDriverData(storedLocation);

        if (!drivers) {
          throw new Error('Gagal memuat data driver.');
        }

        // 4. Jika semua data ada, simpan ke state
        setData({
          selectedUser: JSON.parse(storedUser),
          selectedLocation: storedLocation,
          selectedLocationName: storedLocationName,
          driverData: drivers, // <-- Gunakan data dari 'drivers'
        });
      } catch (e) {
        toastError('Gagal memuat data sesi: ' + e.message);
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    }

    loadLaporanData(); // Panggil fungsi async
  }, [router]); // 'router' sebagai dependensi sudah benar

  // Tampilan loading selagi cek localStorage
  if (isLoading) {
    return (
      <SelectionLayout>
        <Spinner />
      </SelectionLayout>
    );
  }

  // Tampilan utama jika data berhasil dimuat
  return (
    <AppLayout mainClassName="items-center justify-center px-6">
      <TmsSummary
        selectedLocation={data.selectedLocation}
        selectedLocationName={data.selectedLocationName}
        selectedUser={data.selectedUser}
        driverData={data.driverData}
        isAnyLoading={isAnyLoading}
        setIsAnyLoading={setIsAnyLoading}
        isMapping={isMapping}
        setIsMapping={setIsMapping}
      />
    </AppLayout>
  );
}
