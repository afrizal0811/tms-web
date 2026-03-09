export function setLocalStorage(name, value) {
  localStorage.setItem(name, value);
}

export function removeLocalStorage(name) {
  localStorage.removeItem(name);
}

export function getLocalStorage() {
  const storedLocation = localStorage.getItem('userLocation');
  const storedLocationName = localStorage.getItem('userLocationName');
  const storedUser = localStorage.getItem('selectedUser');
  const storedLanguage = localStorage.getItem('app_lang');

  return {
    storedLocation,
    storedLocationName,
    storedUser,
    storedLanguage,
  };
}
