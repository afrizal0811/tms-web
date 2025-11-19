import { getUsers, getVehicles } from './apiService';
import { ROLE_ID } from './constants';
import { toastError } from './toastHelper';

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
      // Opsional: Bisa tambah logika untuk force refresh jika data kosong tapi harusnya ada
      return parsed;
    }
  } catch (e) {
    console.warn(`Gagal membaca cache driver: ${e.message}. Mengambil data baru.`);
  }

  try {
    // --- PERUBAHAN DINAMIS ---
    // Daripada mengecek nama hub (Cikarang/Sidoarjo/dll), kita asumsikan
    // setiap hub MUNGKIN memiliki driver dengan role 'driver' ATAU 'driverJkt'.
    // Kita fetch saja semuanya. API akan mengembalikan [] jika tidak ada user dengan role itu.

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
    // driverResponses adalah array of arrays (hasil per role)
    const rawDrivers = driverResponses.flat();

    // Hapus duplikat jika ada user yang punya double role (jarang, tapi untuk safety)
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

    // Simpan ke localStorage
    localStorage.setItem('driverData', JSON.stringify(mergedDriverData));

    return mergedDriverData;
  } catch (err) {
    // Lempar error agar UI tau fetch gagal
    throw err;
  }
}
