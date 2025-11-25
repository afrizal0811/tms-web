// File: lib/masterTruckHelper.js

const STORAGE_KEY = 'masterTruck';

/**
 * Mengambil data Master Truck dari Local Storage.
 * Return format: { Dry: { Total: 0, ... }, Frozen: { Total: 0, ... } }
 */
export const getMasterTruckData = () => {
  if (typeof window === 'undefined') return {};
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    console.error('Gagal load master truck data', e);
    return {};
  }
};

/**
 * Helper khusus untuk mengambil total master berdasarkan tipe kendaraan.
 * Digunakan di TruckUsageSheet.js.
 * * @param {string} rowName - Nama baris di laporan (misal "CDE Box", "Total Used")
 * @param {string} storageCategory - "Dry" atau "Frozen"
 * @param {object} masterData - Data lengkap master truck (opsional, jika null akan ambil baru)
 */
export const getMasterTotalForType = (rowName, storageCategory, masterData = null) => {
  // Jika masterData tidak dikirim, ambil dari storage
  const data = masterData || getMasterTruckData();

  if (!data || !data[storageCategory]) return null;

  const config = data[storageCategory];

  // 1. Cek Total Global (Baris "Total Used")
  if (rowName === 'Total Used') {
    return config.Total || null;
  }

  // 2. Cek Per Tipe Kendaraan
  // Mencocokkan nama baris laporan (misal "CDE Box") dengan key di master data (misal "CDE")
  // Logikanya: Cari key di config yang termuat dalam string rowName
  const matchedKey = Object.keys(config).find(
    (k) => k !== 'Total' && rowName.toUpperCase().includes(k)
  );

  if (matchedKey) {
    return config[matchedKey] || null;
  }

  return null;
};
