import { getUsers, getVehicles } from './apiService';
import { ROLE_ID } from './constants';
import { toastError, toastWarning } from './toastHelper';

/**
 * Fungsi "pintar" untuk mengambil data driver.
 * 1. Cek localStorage.
 * 2. Jika tidak ada, fetch baru, simpan ke localStorage, lalu kembalikan.
 * @param {string} selectedLocation - ID Hub yang dipilih.
 * @returns {Promise<Array>} - Array data driver yang sudah di-merge.
 */
export async function getOrFetchDriverData(selectedLocation) {
  if (!selectedLocation) {
    throw new Error('selectedLocation wajib ada untuk mengambil data driver.');
  }

  // 1. Cek localStorage dulu (tidak berubah)
  try {
    const storedDrivers = localStorage.getItem('driverData');
    if (storedDrivers) {
      return JSON.parse(storedDrivers);
    }
  } catch (e) {
    toastError(`Gagal membaca cache driver: ${e.message}. Mengambil data baru.`);
  }

  try {
    // --- (PERUBAHAN 2): Logika specialHubs dibuat Dinamis ---
    let specialHubs = [];
    //const hardcodedSpecialHubs = ['6895a281bc530d4a4908f5ef', '68b8038b1aa98343380e3ab2'];

    try {
      const allHubsStr = localStorage.getItem('allHubsList');
      if (allHubsStr) {
        const allHubs = JSON.parse(allHubsStr);
        if (Array.isArray(allHubs)) {
          // Cari ID berdasarkan nama (case-insensitive)
          const cikarangId = allHubs.find(
            (h) => h.name && h.name.toLowerCase() === 'cikarang'
          )?._id;
          const daanMogotId = allHubs.find(
            (h) => h.name && h.name.toLowerCase() === 'daan mogot'
          )?._id;

          if (cikarangId) specialHubs.push(cikarangId);
          if (daanMogotId) specialHubs.push(daanMogotId);
        }
      }
    } catch (parseError) {
      // Tangani jika JSON.parse(allHubsStr) gagal
      toastError(`Gagal memproses daftar hub: ${parseError.message}`);
    }

    if (specialHubs.length === 0) {
      toastWarning('Daftar hub tidak ditemukan di cache. Hubungi admin.');
    }

    const isSpecialHub = specialHubs.includes(selectedLocation);

    const rolesToFetch = [ROLE_ID.driver];
    if (isSpecialHub) {
      rolesToFetch.push(ROLE_ID.driverJkt);
    }

    // Panggil fungsi API (tidak berubah)
    const driverPromises = rolesToFetch.map((roleId) =>
      getUsers({ hubId: selectedLocation, roleId: roleId, status: 'active' })
    );
    const vehiclePromise = getVehicles({ hubId: selectedLocation, limit: 500 });

    const driverResponses = await Promise.all(driverPromises);
    const vehicleResult = await vehiclePromise;

    // Proses data (tidak berubah)
    const rawDrivers = driverResponses.flat();
    const processedDrivers = rawDrivers.map((driver) => ({
      _id: driver._id,
      name: driver.name,
      email: driver.email,
    }));

    // Proses vehicle (tidak berubah)
    const vehicleMap = vehicleResult.reduce((acc, vehicle) => {
      if (vehicle.assignee) {
        acc[vehicle.assignee] = {
          plat: vehicle.name,
          type: vehicle.tags && vehicle.tags.length > 0 ? vehicle.tags[0] : null,
        };
      }
      return acc;
    }, {});

    // Merge data (tidak berubah)
    const mergedDriverData = processedDrivers.map((driver) => {
      const vehicleInfo = vehicleMap[driver.email];
      return {
        email: driver.email,
        name: driver.name,
        plat: vehicleInfo ? vehicleInfo.plat : null,
        type: vehicleInfo ? vehicleInfo.type : null,
      };
    });

    // Simpan ke localStorage dan kembalikan (tidak berubah)
    localStorage.setItem('driverData', JSON.stringify(mergedDriverData));
    return mergedDriverData;
  } catch (err) {
    // --- (PERUBAHAN 3): Jangan "telan" error ---
    // 'apiService' sudah menampilkan toastError.
    // Kita lempar error lagi agar komponen pemanggil (page.js, dll)
    // tahu bahwa fetch gagal dan bisa menghentikan spinner-nya.
    throw err;
    // --- (SELESAI PERUBAHAN 3) ---
  }
}
