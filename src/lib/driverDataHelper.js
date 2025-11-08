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
    throw new Error('selectedLocation wajib ada untuk mengambil data driver.');
  }

  // 1. Cek localStorage dulu
  try {
    const storedDrivers = localStorage.getItem('driverData');
    if (storedDrivers) {
      return JSON.parse(storedDrivers);
    }
  } catch (e) {
    console.warn('Gagal membaca driverData dari localStorage', e);
  }

  // 2. Jika tidak ada, fetch dari API (Logika ini disalin dari page.js)
  try {
    const driverRoleId = '6703410af6be892f3208ecde';
    const driverJktRoleId = '68f74e1cff7fa2efdd0f6a38';
    const specialHubs = ['6895a281bc530d4a4908f5ef', '68b8038b1aa98343380e3ab2'];
    const isSpecialHub = specialHubs.includes(selectedLocation);
    const rolesToFetch = [driverRoleId];
    if (isSpecialHub) {
      rolesToFetch.push(driverJktRoleId);
    }

    // Siapkan semua promise
    const driverPromises = rolesToFetch.map((roleId) => {
      const apiUrl = `/api/get-users?hubId=${selectedLocation}&roleId=${roleId}&status=active`;
      return fetch(apiUrl);
    });
    const vehicleApiUrl = `/api/get-vehicles?hubId=${selectedLocation}&limit=500`;
    const vehiclePromise = fetch(vehicleApiUrl);

    // Jalankan promise secara paralel
    const driverResponses = await Promise.all(driverPromises);
    const vehicleResponse = await vehiclePromise;

    // Proses Driver
    let rawDrivers = [];
    for (const res of driverResponses) {
      if (!res.ok) throw new Error('Gagal mengambil data users (driver).');
      const data = await res.json();
      if (data && Array.isArray(data.data)) {
        rawDrivers = rawDrivers.concat(data.data);
      }
    }
    const processedDrivers = rawDrivers.map((driver) => ({
      _id: driver._id,
      name: driver.name,
      email: driver.email,
    }));

    // Proses Vehicle
    if (!vehicleResponse.ok) throw new Error('Gagal mengambil data vehicles.');
    const vehicleResult = await vehicleResponse.json();
    if (!vehicleResult || !Array.isArray(vehicleResult.data)) {
      throw new Error('Data vehicle tidak sesuai.');
    }
    const vehicleMap = vehicleResult.data.reduce((acc, vehicle) => {
      if (vehicle.assignee) {
        acc[vehicle.assignee] = {
          plat: vehicle.name,
          type: vehicle.tags && vehicle.tags.length > 0 ? vehicle.tags[0] : null,
        };
      }
      return acc;
    }, {});

    // Merge
    const mergedDriverData = processedDrivers.map((driver) => {
      const vehicleInfo = vehicleMap[driver.email];
      return {
        email: driver.email,
        name: driver.name,
        plat: vehicleInfo ? vehicleInfo.plat : null,
        type: vehicleInfo ? vehicleInfo.type : null,
      };
    });

    // 3. Simpan ke localStorage dan kembalikan
    localStorage.setItem('driverData', JSON.stringify(mergedDriverData));
    return mergedDriverData;
  } catch (err) {
    toastError(err.message); // Tampilkan toast error di sini
    throw err; // Lempar error lagi agar komponen pemanggil tahu
  }
}
