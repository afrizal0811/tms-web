export function setLocalStorage(name, value) {
  localStorage.setItem(name, value);
}

export function removeLocalStorage(name) {
  localStorage.removeItem(name);
}

export function getLocalStorage() {
  const storedDrivers = localStorage.getItem('driverData');
  const storedHubs = localStorage.getItem('allHubsList');
  const storedLocation = localStorage.getItem('userLocation');
  const storedLocationName = localStorage.getItem('userLocationName');
  const storedVehicleTag = localStorage.getItem('vehicleTagMap');
  const storedMasterTruck = localStorage.getItem('masterTruck');
  const storedUser = localStorage.getItem('selectedUser');
  const storedLanguage = localStorage.getItem('app_lang');

  return {
    storedDrivers,
    storedHubs,
    storedLocation,
    storedLocationName,
    storedVehicleTag,
    storedMasterTruck,
    storedUser,
    storedLanguage,
  };
}
