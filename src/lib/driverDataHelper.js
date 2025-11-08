import { getUsers, getVehicles } from './apiService';
import { toastError } from './toastHelper';

/**
 * Fungsi "pintar" untuk mengambil data driver.
 * 1. Cek localStorage.
 * 2. Jika tidak ada, fetch baru, simpan ke localStorage, lalu kembalikan.
 * @param {string} selectedLocation - ID Hub yang dipilih.
 * @returns {Promise<Array>} - Array data driver yang sudah di-merge.
 */
export async function getOrFetchDriverData(selectedLocation) {
  if (!selectedLocation) {
    // Ini akan ditangkap oleh komponen pemanggil (misal: page.js)
    // dan komponen itu yang akan menampilkan toastError
    throw new Error('selectedLocation wajib ada untuk mengambil data driver.');
  }

  // 1. Cek localStorage dulu
  try {
    const storedDrivers = localStorage.getItem('driverData');
    if (storedDrivers) {
      return JSON.parse(storedDrivers);
    }
  } catch (e) {
    // 3. GANTI console.warn dengan toastWarning
    toastError(`Gagal membaca cache driver: ${e.message}. Mengambil data baru.`);
  }

  // 2. Jika tidak ada di cache, fetch dari API
  try {
    const driverRoleId = '6703410af6be892f3208ecde';
    const driverJktRoleId = '68f74e1cff7fa2efdd0f6a38';
    const specialHubs = ['6895a281bc530d4a4908f5ef', '68b8038b1aa98343380e3ab2'];
    const isSpecialHub = specialHubs.includes(selectedLocation);

    const rolesToFetch = [driverRoleId];
    if (isSpecialHub) {
      rolesToFetch.push(driverJktRoleId);
    }

    // Panggil fungsi API (ini sudah di-refactor)
    const driverPromises = rolesToFetch.map((roleId) =>
      getUsers({ hubId: selectedLocation, roleId: roleId, status: 'active' })
    );
    const vehiclePromise = getVehicles({ hubId: selectedLocation, limit: 500 });

    const driverResponses = await Promise.all(driverPromises);
    const vehicleResult = await vehiclePromise;

    // Proses data (driverResponses adalah array dari array, jadi kita flat)
    const rawDrivers = driverResponses.flat();
    const processedDrivers = rawDrivers.map((driver) => ({
      _id: driver._id,
      name: driver.name,
      email: driver.email,
    }));

    // Proses vehicle (vehicleResult adalah array)
    const vehicleMap = vehicleResult.reduce((acc, vehicle) => {
      if (vehicle.assignee) {
        acc[vehicle.assignee] = {
          plat: vehicle.name,
          type: vehicle.tags && vehicle.tags.length > 0 ? vehicle.tags[0] : null,
        };
      }
      return acc;
    }, {});

    // Merge data
    const mergedDriverData = processedDrivers.map((driver) => {
      const vehicleInfo = vehicleMap[driver.email];
      return {
        email: driver.email,
        name: driver.name,
        plat: vehicleInfo ? vehicleInfo.plat : null,
        type: vehicleInfo ? vehicleInfo.type : null,
      };
    });

    // Simpan ke localStorage dan kembalikan
    localStorage.setItem('driverData', JSON.stringify(mergedDriverData));
    return mergedDriverData;
  } catch (err) {}
}
