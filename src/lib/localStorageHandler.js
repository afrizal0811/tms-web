export function setLocalStorage(name, value) {
  localStorage.setItem(name, value);
}

export function removeLocalStorage(name) {
  localStorage.removeItem(name);
}

export function getLocalStorage() {
  const sessionStr = localStorage.getItem('tms_user_session');
  let storedSession = null;
  let storedLocation = null;
  let storedLocationName = null;
  let storedUser = null;

  if (sessionStr) {
    try {
      storedSession = JSON.parse(sessionStr);
      storedLocation = storedSession.activeHubId || null;
      storedLocationName = storedSession.activeHubName || null;
      if (storedSession._id) {
        storedUser = sessionStr;
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
