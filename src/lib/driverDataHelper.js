import { getUsers, getVehicles } from './apiService';
import { ROLE_ID, VEHICLE_TYPES } from './constants';

// --- HELPER: Resolve Tipe Kendaraan (Mapping & Parsing) ---
// Mengadaptasi logika yang sama dengan Truck Usage Report
const resolveVehicleType = (rawTag, plate, hubId, tagMap) => {
  if (!rawTag) return null;

  // 1. Parsing Standar (Asumsi format: CABANG-TIPE-BOX, misal SUB-CDE-BOX)
  const parts = rawTag.split('-');
  // Ambil bagian ke-2 (index 1) sebagai tipe dasar, atau ambil raw jika tidak ada dash
  let typeCandidate = parts.length > 1 ? parts[1].toUpperCase() : rawTag.toUpperCase();

  // 2. Cek Suffix "LONG" (Khusus CDE/CDD/FUSO)
  if (parts.length > 2 && parts[2].toUpperCase() === 'LONG') {
    if (['CDE', 'CDD', 'FUSO'].includes(typeCandidate)) {
      typeCandidate = `${typeCandidate}-LONG`;
    }
  }

  // 3. Cek Mapping Konfigurasi (vehicleTagMap)
  // Struktur: tagMap[hubId][plate][typeCandidate] = "HASIL_KONVERSI"
  if (tagMap && hubId && plate) {
    const hubMap = tagMap[hubId];
    if (hubMap && hubMap[plate]) {
      const mappedValue = hubMap[plate][typeCandidate];
      if (mappedValue) {
        return mappedValue; // Gunakan hasil konversi jika ada
      }
    }
  }

  return typeCandidate; // Gunakan tipe dasar jika tidak ada mapping
};

// --- HELPER BARU: Hitung & Simpan Master Truck Detail ---
const updateMasterTruckStorage = (drivers, hubId) => {
  if (typeof window === 'undefined' || !Array.isArray(drivers)) return;

  // 1. Load Vehicle Tag Map dari Local Storage
  let tagMap = {};
  try {
    const storedMap = localStorage.getItem('vehicleTagMap'); // Key sesuai request
    if (storedMap) tagMap = JSON.parse(storedMap);
  } catch (e) {
    console.error('Gagal load vehicleTagMap', e);
  }

  // 2. Inisialisasi Struktur Data
  const masterData = {
    Dry: { Total: 0 },
    Frozen: { Total: 0 },
  };

  // Siapkan key default (0)
  VEHICLE_TYPES.forEach((type) => {
    masterData.Dry[type] = 0;
    masterData.Frozen[type] = 0;
  });

  // 3. Iterasi Data Driver
  drivers.forEach((d) => {
    const plat = d.plat || '';
    const name = (d.name || '').toUpperCase();
    const rawTag = (d.type || '').toUpperCase();
    const platUpper = plat.toUpperCase();

    // --- FILTER EXCLUDE ---
    if (!plat || plat.trim() === '' || platUpper.includes('DEMO') || platUpper.includes('SEWA')) {
      return;
    }

    // --- TENTUKAN KATEGORI STORAGE (Dry/Frozen) ---
    let storageCategory = null;
    if (name.includes('DRY')) {
      storageCategory = 'Dry';
    } else if (name.includes('FRZ')) {
      storageCategory = 'Frozen';
    }

    if (!storageCategory) return;

    // --- TENTUKAN TIPE KENDARAAN (DENGAN MAPPING) ---
    // Gunakan fungsi resolveVehicleType agar memperhitungkan vehicleTagMap
    const resolvedType = resolveVehicleType(rawTag, plat, hubId, tagMap);

    // Cocokkan dengan daftar tipe resmi (VEHICLE_TYPES)
    const matchedType = VEHICLE_TYPES.find((vt) => resolvedType === vt);

    if (matchedType) {
      masterData[storageCategory][matchedType]++;
      masterData[storageCategory].Total++;
    }
  });

  // 4. Simpan ke Local Storage
  localStorage.setItem('masterTruck', JSON.stringify(masterData));

  // console.log("🚚 Master Truck Updated (With Mapping):", masterData);
};

/**
 * Fungsi "pintar" untuk mengambil data driver.
 */
export async function getOrFetchDriverData(selectedLocation) {
  if (!selectedLocation) {
    throw new Error('selectedLocation wajib ada untuk mengambil data driver.');
  }

  // 1. Cek localStorage dulu (Cache)
  try {
    const storedDrivers = localStorage.getItem('driverData');

    if (storedDrivers) {
      const parsed = JSON.parse(storedDrivers);

      // --- UPDATE MASTER TRUCK (Pass selectedLocation sebagai hubId) ---
      updateMasterTruckStorage(parsed, selectedLocation);

      return parsed;
    }
  } catch (e) {
    console.warn(`Gagal membaca cache driver: ${e.message}. Mengambil data baru.`);
  }

  try {
    // --- FETCH DATA BARU ---
    const rolesToFetch = [ROLE_ID.driver, ROLE_ID.driverJkt];

    const driverPromises = rolesToFetch.map((roleId) =>
      getUsers({ hubId: selectedLocation, roleId: roleId, status: 'active' })
    );
    const vehiclePromise = getVehicles({ hubId: selectedLocation, limit: 500 });

    const [driverResponses, vehicleResult] = await Promise.all([
      Promise.all(driverPromises),
      vehiclePromise,
    ]);

    // Process Drivers
    const rawDrivers = driverResponses.flat();
    const uniqueDrivers = Array.from(new Map(rawDrivers.map((item) => [item._id, item])).values());

    const processedDrivers = uniqueDrivers.map((driver) => ({
      _id: driver._id,
      name: driver.name,
      email: driver.email,
    }));

    // Process Vehicles Map
    const vehicleMap = vehicleResult.reduce((acc, vehicle) => {
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

    // Simpan Cache
    localStorage.setItem('driverData', JSON.stringify(mergedDriverData));

    // --- UPDATE MASTER TRUCK DARI DATA BARU ---
    updateMasterTruckStorage(mergedDriverData, selectedLocation);

    return mergedDriverData;
  } catch (err) {
    throw err;
  }
}
