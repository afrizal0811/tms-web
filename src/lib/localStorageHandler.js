import CryptoJS from 'crypto-js';
import { toastError } from './toastHelper';

const SECRET_KEY = process.env.NEXT_PUBLIC_STORAGE_KEY || '@frizaL_TaMpaN_B@ngEeTTH_2026!!';
const CURRENT_APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION;

const encryptData = (data) => {
  try {
    return CryptoJS.AES.encrypt(data, SECRET_KEY).toString();
  } catch (error) {
    toastError(error.message);
    return data;
  }
};

const decryptData = (ciphertext) => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || ciphertext;
  } catch (error) {
    return ciphertext;
  }
};

export function setLocalStorage(name, value) {
  if (typeof window === 'undefined') return;

  if (name === 'data' && value) {
    try {
      let parsedValue = typeof value === 'string' ? JSON.parse(value) : value;
      parsedValue.app_version = CURRENT_APP_VERSION;
      const stringifiedValue = JSON.stringify(parsedValue);
      const encryptedValue = encryptData(stringifiedValue);
      localStorage.setItem(name, encryptedValue);
    } catch (e) {
      const encryptedValue = encryptData(value);
      localStorage.setItem(name, encryptedValue);
    }
  } else {
    localStorage.setItem(name, value);
  }
}

export function removeLocalStorage(name) {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(name);
}

export function getLocalStorage() {
  if (typeof window === 'undefined') {
    return {
      storedSession: null,
      storedLocation: null,
      storedLocationName: null,
      storedLocationAcronym: null,
      storedUser: null,
      storedLanguage: null,
      appVersion: null,
    };
  }

  const rawSessionStr = localStorage.getItem('data');
  let storedSession = null;
  let storedLocation = null;
  let storedLocationName = null;
  let storedLocationAcronym = null;
  let storedUser = null;
  let appVersion = null;

  if (rawSessionStr) {
    try {
      const sessionStr = decryptData(rawSessionStr);
      storedSession = JSON.parse(sessionStr);
      const userData = storedSession.user || storedSession;

      storedLocation = userData.activeHubId || null;
      storedLocationName = userData.activeHubName || null;
      storedLocationAcronym = userData.activeHubAcronym || null;
      appVersion = storedSession.app_version || null;

      if (userData._id) {
        storedUser = JSON.stringify(userData);
      }
    } catch (e) {
      toastError(e.message);
    }
  }

  const storedLanguage = localStorage.getItem('language') || 'en';

  return {
    storedSession,
    storedLocation,
    storedLocationName,
    storedLocationAcronym,
    storedUser,
    storedLanguage,
    appVersion,
  };
}

export function getSuperadminRoleId() {
  if (typeof window === 'undefined') return null;
  const rawData = localStorage.getItem('data');
  if (rawData) {
    try {
      const decrypted = decryptData(rawData);
      const parsed = JSON.parse(decrypted);
      return parsed.superadminRoleId || null;
    } catch (e) {
      return null;
    }
  }
  return null;
}

export function setSuperadminRoleId(roleId) {
  if (typeof window === 'undefined') return;
  const rawData = localStorage.getItem('data');
  if (rawData) {
    try {
      const decrypted = decryptData(rawData);
      const parsed = JSON.parse(decrypted);
      parsed.superadminRoleId = roleId;
      setLocalStorage('data', parsed);
    } catch (e) {}
  }
}

export function getCachedHubs() {
  if (typeof window === 'undefined') return null;
  const rawData = localStorage.getItem('data');
  if (rawData) {
    try {
      const decrypted = decryptData(rawData);
      const parsed = JSON.parse(decrypted);
      return parsed.cachedHubs || null;
    } catch (e) {
      return null;
    }
  }
  return null;
}

export function setCachedHubs(hubs) {
  if (typeof window === 'undefined') return;
  const rawData = localStorage.getItem('data');
  if (rawData) {
    try {
      const decrypted = decryptData(rawData);
      const parsed = JSON.parse(decrypted);
      parsed.cachedHubs = hubs;
      setLocalStorage('data', parsed);
    } catch (e) {}
  }
}

export function updateActiveHub(id, name, acronym) {
  if (typeof window === 'undefined') return;
  const rawData = localStorage.getItem('data');
  if (rawData) {
    try {
      const decrypted = decryptData(rawData);
      const parsed = JSON.parse(decrypted);

      if (parsed.user) {
        parsed.user.activeHubId = id;
        parsed.user.activeHubName = name;
        parsed.user.activeHubAcronym = acronym;
      } else {
        parsed.activeHubId = id;
        parsed.activeHubName = name;
        parsed.activeHubAcronym = acronym;
      }

      setLocalStorage('data', parsed);
    } catch (e) {}
  }
}
