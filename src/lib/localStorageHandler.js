import CryptoJS from 'crypto-js';

// KUNCI RAHASIA (SALT/KEY)
// Sangat disarankan untuk memindahkan string ini ke file .env.local dengan nama NEXT_PUBLIC_STORAGE_KEY
// Namun jika tidak ingin repot, string fallback ini akan langsung digunakan.
const SECRET_KEY = process.env.NEXT_PUBLIC_STORAGE_KEY || '@frizaL_TaMpaN_B@ngEeTTH_2026!!';

// Helper untuk Enkripsi
const encryptData = (data) => {
  try {
    return CryptoJS.AES.encrypt(data, SECRET_KEY).toString();
  } catch (error) {
    console.error('Encrypt error:', error);
    return data;
  }
};

// Helper untuk Dekripsi
const decryptData = (ciphertext) => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);

    // Jika decrypted kosong, berarti data tersebut bukan hasil enkripsi (data lama/plain text)
    return decrypted || ciphertext;
  } catch (error) {
    // Jika gagal di-decrypt sama sekali, kembalikan teks aslinya
    return ciphertext;
  }
};

export function setLocalStorage(name, value) {
  // Kita enkripsi KHUSUS untuk 'tms_user_session' agar data sepele seperti 'language' tetap ringan
  if (name === 'tms_user_session' && value) {
    const encryptedValue = encryptData(value);
    localStorage.setItem(name, encryptedValue);
  } else {
    localStorage.setItem(name, value);
  }
}

export function removeLocalStorage(name) {
  localStorage.removeItem(name);
}

export function getLocalStorage() {
  const rawSessionStr = localStorage.getItem('tms_user_session');
  let storedSession = null;
  let storedLocation = null;
  let storedLocationName = null;
  let storedUser = null;

  if (rawSessionStr) {
    try {
      // Dekripsi data yang diambil dari local storage
      const sessionStr = decryptData(rawSessionStr);

      storedSession = JSON.parse(sessionStr);
      storedLocation = storedSession.activeHubId || null;
      storedLocationName = storedSession.activeHubName || null;
      if (storedSession._id) {
        storedUser = sessionStr; // Menyimpan versi string JSON (bukan cipher) jika dibutuhkan
      }
    } catch (e) {
      console.error('Gagal membaca session:', e);
    }
  }

  const storedLanguage = localStorage.getItem('language');

  return {
    storedSession,
    storedLocation,
    storedLocationName,
    storedUser,
    storedLanguage,
  };
}
