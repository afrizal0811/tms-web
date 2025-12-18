// File: lib/hooks/useVehicleTagCheck.js
'use client';

import { checkUnmappedVehicles } from '@/lib/driverDataHelper';
import { useCallback, useState } from 'react';
import { toastError } from '../toastHelper';

export function useVehicleTagCheck() {
  const [isChecking, setIsChecking] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [unmappedData, setUnmappedData] = useState([]);

  // Kita butuh menyimpan fungsi "apa yang dilakukan selanjutnya" setelah mapping selesai
  const [onSuccessCallback, setOnSuccessCallback] = useState(null);

  /**
   * Fungsi utama untuk memicu pengecekan.
   * @param {string} hubId - ID Lokasi yang akan dicek
   * @param {function} onSuccess - Fungsi yang dijalankan jika aman / selesai mapping
   */
  const triggerCheck = useCallback(async (hubId, onSuccess) => {
    if (!hubId) return;

    setIsChecking(true);
    try {
      // 1. Cek ke API
      const issues = await checkUnmappedVehicles(hubId);

      if (issues && issues.length > 0) {
        // 2. Ada Masalah -> Simpan Data & Callback, Buka Modal
        setUnmappedData(issues);
        setOnSuccessCallback(() => onSuccess); // Simpan fungsi untuk dipanggil nanti
        setShowModal(true);
      } else {
        // 3. Aman -> Langsung jalankan callback sukses
        onSuccess();
      }
    } catch (error) {
      toastError('Vehicle check error:', error);
      // Fail-safe: Jika error, anggap aman dan lanjut
      onSuccess();
    } finally {
      setIsChecking(false);
    }
  }, []);

  /**
   * Fungsi yang dipanggil ketika User selesai melakukan mapping di Modal
   */
  const handleMappingCompleted = useCallback(() => {
    setShowModal(false);
    setUnmappedData([]);

    // Jalankan aksi selanjutnya (misal: Login atau Reload Page)
    if (onSuccessCallback) {
      onSuccessCallback();
      setOnSuccessCallback(null); // Reset
    }
  }, [onSuccessCallback]);

  return {
    isChecking, // State untuk menampilkan Spinner Loading
    showModal, // State untuk menampilkan Modal Mapping
    unmappedData, // Data kendaraan bermasalah
    triggerCheck, // Fungsi untuk memulai proses
    handleMappingCompleted, // Fungsi yang dipasang di props onCompleted Modal
  };
}
