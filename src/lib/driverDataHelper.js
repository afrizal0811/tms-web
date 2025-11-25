import { getUsers, getVehicles } from './apiService';
import { ROLE_ID } from './constants';

// --- HELPER BARU: Hitung & Simpan Master Truck ---
// Fungsi ini dijalankan otomatis setiap kali data driver didapatkan (baik dari cache maupun API)
const updateMasterTruckStorage = (drivers) => {
  if (typeof window === 'undefined' || !Array.isArray(drivers)) return;

  let dryCount = 0;
  let frozenCount = 0;

  drivers.forEach((d) => {
    const plat = d.plat || '';
    const name = (d.name || '').toUpperCase();
    const platUpper = plat.toUpperCase();

    // 1. Skip jika plat kosong, plat 'DEMO', atau plat 'SEWA'
    if (!plat || plat.trim() === '' || platUpper.includes('DEMO') || platUpper.includes('SEWA')) {
      return;
    }

    // 2. Hitung DRY (Cek nama mengandung 'DRY')
    if (name.includes('DRY')) {
      dryCount++;
    }
    // 3. Hitung FROZEN (Cek nama mengandung 'FRZ')
    else if (name.includes('FRZ')) {
      frozenCount++;
    }
  });

  // Simpan ke Local Storage key 'masterTruck'
  const masterData = { dry: dryCount, frozen: frozenCount };
  localStorage.setItem('masterTruck', JSON.stringify(masterData));

  // console.log("🚚 Auto-calculated Master Truck:", masterData);
};

/**
 * Fungsi "pintar" untuk mengambil data driver.
 * DINAMIS: Mengambil SEMUA role driver relevan untuk hub manapun.
 */
export async function getOrFetchDriverData(selectedLocation) {
  if (!selectedLocation) {
    throw new Error('selectedLocation wajib ada untuk mengambil data driver.');
  }

  // 1. Cek localStorage dulu (Cache)
  try {
    const storedDrivers = localStorage.getItem('driverData');
    // Validasi tambahan: pastikan data di cache bukan array kosong jika kita mengharapkan data
    if (storedDrivers) {
      const parsed = JSON.parse(storedDrivers);

      // --- UPDATE MASTER TRUCK DARI CACHE ---
      // Kita tetap jalankan ini agar jika user refresh page, masterTruck ter-refresh juga
      updateMasterTruckStorage(parsed);

      return parsed;
    }
  } catch (e) {
    console.warn(`Gagal membaca cache driver: ${e.message}. Mengambil data baru.`);
  }

  try {
    // --- PERUBAHAN DINAMIS ---
    // Fetch semua role yang relevan
    const rolesToFetch = [
      ROLE_ID.driver,
      ROLE_ID.driverJkt,
      // Tambahkan ROLE_ID lain di sini jika ada role baru di masa depan
    ];

    // Panggil fungsi API secara paralel untuk setiap role
    const driverPromises = rolesToFetch.map((roleId) =>
      getUsers({ hubId: selectedLocation, roleId: roleId, status: 'active' })
    );

    // Ambil data vehicle juga
    const vehiclePromise = getVehicles({ hubId: selectedLocation, limit: 500 });

    // Tunggu semua selesai
    const [driverResponses, vehicleResult] = await Promise.all([
      Promise.all(driverPromises),
      vehiclePromise,
    ]);

    // Proses data Driver (Flat array dari berbagai role)
    const rawDrivers = driverResponses.flat();

    // Hapus duplikat jika ada user yang punya double role
    const uniqueDrivers = Array.from(new Map(rawDrivers.map((item) => [item._id, item])).values());

    const processedDrivers = uniqueDrivers.map((driver) => ({
      _id: driver._id,
      name: driver.name,
      email: driver.email,
    }));

    // Proses Vehicle Map
    const vehicleMap = vehicleResult.reduce((acc, vehicle) => {
      if (vehicle.assignee) {
        acc[vehicle.assignee] = {
          plat: vehicle.name,
          type: vehicle.tags && vehicle.tags.length > 0 ? vehicle.tags[0] : null,
        };
      }
      return acc;
    }, {});

    // Merge Driver + Vehicle
    const mergedDriverData = processedDrivers.map((driver) => {
      const vehicleInfo = vehicleMap[driver.email];
      return {
        email: driver.email,
        name: driver.name,
        plat: vehicleInfo ? vehicleInfo.plat : null,
        type: vehicleInfo ? vehicleInfo.type : null,
      };
    });

    // Simpan driverData ke localStorage
    localStorage.setItem('driverData', JSON.stringify(mergedDriverData));

    // --- UPDATE MASTER TRUCK DARI DATA BARU ---
    updateMasterTruckStorage(mergedDriverData);

    return mergedDriverData;
  } catch (err) {
    // Lempar error agar UI tau fetch gagal
    throw err;
  }
}
