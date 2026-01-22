// File: lib/masterTruckHelper.js

const STORAGE_KEY = 'masterTruck';

export const getMasterTruckData = () => {
  if (typeof window === 'undefined') return {};
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    return e;
  }
};

export const getMasterTotalForType = (rowName, storageCategory, masterData = null) => {
  // Jika masterData tidak dikirim, ambil dari storage
  const data = masterData || getMasterTruckData();
  const config = data[storageCategory];

  if (!data || !data[storageCategory]) return null;
  if (rowName === 'Total Used' || rowName === 'Total Digunakan') {
    return config.Total || null;
  }
  const matchedKey = Object.keys(config).find(
    (k) => k !== 'Total' && rowName.toUpperCase().includes(k)
  );

  if (matchedKey) {
    return config[matchedKey] || null;
  }

  return null;
};
