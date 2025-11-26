import { getUsers, getVehicles } from './apiService';
import { ROLE_ID, TAG_MAP_KEY, VEHICLE_TYPES } from './constants';

// --- HELPER: Resolve Tipe Kendaraan (Mapping & Parsing) ---
// Digunakan untuk menstandarkan tag kendaraan (misal: SUB-CDE-BOX -> CDE)
// dan mengecek konversi manual dari Local Storage.
const resolveVehicleType = (rawTag, plate, hubId, tagMap) => {
  if (!rawTag) return null;

  // 1. Parsing Standar
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
  if (tagMap && hubId && plate) {
    const hubMap = tagMap[hubId];
    if (hubMap && hubMap[plate]) {
      const mappedValue = hubMap[plate][typeCandidate];
      if (mappedValue) {
        return mappedValue; // Gunakan hasil konversi jika ada
      }
    }
  }

  return typeCandidate;
};

// --- HELPER: Hitung & Simpan Master Truck Detail ---
// Dijalankan otomatis setiap kali data driver diambil/di-refresh
const updateMasterTruckStorage = (drivers, hubId) => {
  if (typeof window === 'undefined' || !Array.isArray(drivers)) return;

  // 1. Load Vehicle Tag Map dari Local Storage
  let tagMap = {};
  try {
    const storedMap = localStorage.getItem(TAG_MAP_KEY);
    if (storedMap) tagMap = JSON.parse(storedMap);
  } catch (e) {
    console.error('Gagal load vehicleTagMap', e);
  }

  // 2. Inisialisasi Struktur Data (Detail per Tipe)
  const masterData = {
    Dry: { Total: 0 },
    Frozen: { Total: 0 },
  };

  // Siapkan key default 0 untuk setiap tipe
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
    // Skip jika Plat Kosong, Demo, atau Sewa
    if (!plat || plat.trim() === '' || platUpper.includes('DEMO') || platUpper.includes('SEWA')) {
      return;
    }

    // --- TENTUKAN KATEGORI STORAGE ---
    let storageCategory = null;
    if (name.includes('DRY')) {
      storageCategory = 'Dry';
    } else if (name.includes('FRZ')) {
      storageCategory = 'Frozen';
    }

    if (!storageCategory) return;

    // --- TENTUKAN TIPE KENDARAAN (DENGAN MAPPING) ---
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
};

// --- FUNGSI BARU: CEK KENDARAAN BELUM TER-MAPPING (Untuk Login) ---
export async function checkUnmappedVehicles(hubId) {
  if (!hubId) return [];

  // 1. Load Mapping
  let tagMap = {};
  if (typeof window !== 'undefined') {
    try {
      const storedMap = localStorage.getItem(TAG_MAP_KEY);
      if (storedMap) tagMap = JSON.parse(storedMap);
    } catch (e) {
      console.error(e);
    }
  }

  // 2. Fetch Data Kendaraan dari API
  try {
    const res = await getVehicles({ hubId: hubId, limit: 1000 });
    const vehicles = Array.isArray(res) ? res : res.data || [];

    const unmappedList = [];

    vehicles.forEach((v) => {
      const tags = v.tags || v.vehicleTags || [];
      if (tags.length === 0) return;

      const rawTag = String(tags[0]).toUpperCase();
      const plat = v.name || v.plateNumber; // Asumsi name adalah Plat

      // Parse Tipe Dasar
      const parts = rawTag.split('-');
      let specificType = parts.length > 1 ? parts[1] : rawTag;

      if (parts.length > 2 && parts[2] === 'LONG') {
        if (['CDE', 'CDD', 'FUSO'].includes(specificType)) {
          specificType = `${specificType}-LONG`;
        }
      }

      // Cek Standar & Mapping
      const isStandard = VEHICLE_TYPES.includes(specificType);
      const isMapped = tagMap[hubId] && tagMap[hubId][plat] && tagMap[hubId][plat][specificType];

      // Jika Non-Standar DAN Belum Di-mapping -> Masukkan List
      if (!isStandard && !isMapped) {
        unmappedList.push({
          plat: plat,
          fullTag: rawTag,
          tag: specificType,
          hubId: hubId,
        });
      }
    });

    return unmappedList;
  } catch (error) {
    console.error('Gagal mengecek kendaraan:', error);
    return [];
  }
}

/**
 * Fungsi Utama: Ambil Data Driver (Cache/API)
 */
export async function getOrFetchDriverData(selectedLocation) {
  if (!selectedLocation) {
    throw new Error('selectedLocation wajib ada untuk mengambil data driver.');
  }

  // 1. Cek localStorage (Cache)
  try {
    const storedDrivers = localStorage.getItem('driverData');
    if (storedDrivers) {
      const parsed = JSON.parse(storedDrivers);

      // Tetap update Master Truck saat load dari cache agar data selalu segar
      updateMasterTruckStorage(parsed, selectedLocation);

      return parsed;
    }
  } catch (e) {
    console.warn(`Gagal membaca cache driver: ${e.message}. Mengambil data baru.`);
  }

  try {
    // 2. Fetch API Baru
    const rolesToFetch = [ROLE_ID.driver, ROLE_ID.driverJkt];

    const driverPromises = rolesToFetch.map((roleId) =>
      getUsers({ hubId: selectedLocation, roleId: roleId, status: 'active' })
    );
    const vehiclePromise = getVehicles({ hubId: selectedLocation, limit: 500 });

    const [driverResponses, vehicleResult] = await Promise.all([
      Promise.all(driverPromises),
      vehiclePromise,
    ]);

    // Proses Driver
    const rawDrivers = driverResponses.flat();
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

    // Simpan
    localStorage.setItem('driverData', JSON.stringify(mergedDriverData));

    // Update Master Truck
    updateMasterTruckStorage(mergedDriverData, selectedLocation);

    return mergedDriverData;
  } catch (err) {
    throw err;
  }
}
