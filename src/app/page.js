// File: app/page.js
'use client';

import AppLayout from '@/components/AppLayout';
import ErrorPage from '@/components/ErrorPage';
import LocationDropdown from '@/components/LocationDropdown';
import SelectionLayout from '@/components/SelectionLayout';
import Spinner from '@/components/Spinner';
import DashboardSummary from '@/features/dashboard/DashboardSummary';
import UserSelectionGrid from '@/features/userSelection/UserSelectionGrid';
import { ROLE_ID } from '@/lib/constants';
import { getLocalStorage, removeLocalStorage, setLocalStorage } from '@/lib/localStorageHandler';
import { useEffect, useState } from 'react';
import { getHubs } from '../lib/apiService';
import { getOrFetchDriverData } from '../lib/driverDataHelper';
import { toastError } from '../lib/toastHelper';

export default function Home() {
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedLocationName, setSelectedLocationName] = useState('');
  const [tempSelectedLocation, setTempSelectedLocation] = useState('');
  const [tempSelectedLocationName, setTempSelectedLocationName] = useState('');
  const [driverData, setDriverData] = useState({ data: [] });

  const [isPageLoading, setIsLoading] = useState(true); // Ini status loading awal
  const [pageError, setPageError] = useState(null);
  const [allHubsList, setAllHubsList] = useState(null);
  const [currentHubListView, setCurrentHubListView] = useState(null);

  useEffect(() => {
    async function initializeApp() {
      setIsLoading(true);
      setPageError(null);
      let processedHubs = [];
      try {
        const hubs = await getHubs();

        processedHubs = hubs
          .filter((hub) => hub.name !== 'Hub Demo')
          .map((hub) => ({
            ...hub,
            name: hub.name.replace('Hub ', ''),
          }));

        setAllHubsList(processedHubs);
        setLocalStorage('allHubsList', JSON.stringify(processedHubs));
      } catch (e) {
        setPageError(e.message);
        setIsLoading(false);
        return;
      }
      try {
        const { storedLocation, storedLocationName, storedUser, storedDrivers } = getLocalStorage();

        if (storedUser) {
          const user = JSON.parse(storedUser);
          setSelectedUser(user);
          const userHubIds = user.hubId || [];
          const allowed =
            userHubIds.length > 1
              ? processedHubs.filter((h) => userHubIds.includes(h._id))
              : processedHubs;
          setCurrentHubListView(allowed);

          if (storedLocation && storedLocationName) {
            if (userHubIds.length === 0 || userHubIds.includes(storedLocation)) {
              setSelectedLocation(storedLocation);
              setSelectedLocationName(storedLocationName);
              setTempSelectedLocation(storedLocation);
              setTempSelectedLocationName(storedLocationName);
            } else {
              removeLocalStorage('userLocation');
              removeLocalStorage('userLocationName');
            }
          }
        } else {
          setCurrentHubListView(processedHubs);
        }

        if (storedLocation && storedDrivers) {
          setDriverData({ data: JSON.parse(storedDrivers) });
        }
      } catch (e) {
        setPageError(e.message);
        toastError(e.message);
      } finally {
        setIsLoading(false);
      }
    }
    initializeApp();
  }, []);

  useEffect(() => {
    async function fetchDriverData() {
      try {
        const data = await getOrFetchDriverData(selectedLocation, true);
        setDriverData({ data: data });
      } catch (err) {
        toastError(err);
      }
    }

    if (selectedLocation) {
      fetchDriverData();
    }
  }, [selectedLocation]);

  const handleLocationChange = (id, name) => {
    setTempSelectedLocation(id);
    setTempSelectedLocationName(name);
  };
  const handleSaveLocation = () => {
    if (!tempSelectedLocation) {
      alert('Silakan pilih lokasi cabang.');
      return;
    }
    if (!selectedUser) {
      removeLocalStorage('selectedUser');
      setSelectedUser(null);
    }
    removeLocalStorage('driverData');
    setDriverData({ data: [] });
    setLocalStorage('userLocation', tempSelectedLocation);
    setLocalStorage('userLocationName', tempSelectedLocationName);
    setSelectedLocation(tempSelectedLocation);
    setSelectedLocationName(tempSelectedLocationName);
  };
  const handleUserSelect = (user) => {
    setLocalStorage('selectedUser', JSON.stringify(user));
    setSelectedUser(user);
  };
  const handleResetAll = () => {
    removeLocalStorage('userLocation');
    removeLocalStorage('userLocationName');
    removeLocalStorage('selectedUser');
    removeLocalStorage('driverData');
    setSelectedUser(null);
    setSelectedLocation('');
    setSelectedLocationName('');
    setDriverData({ data: [] });
    setCurrentHubListView(allHubsList);
  };

  if (isPageLoading || allHubsList === null) {
    return (
      <SelectionLayout>
        <Spinner />
      </SelectionLayout>
    );
  }

  if (pageError) {
    <ErrorPage />;
  }

  if (!selectedLocation) {
    return (
      <SelectionLayout>
        <div className="text-center w-full">
          <h1 className="text-4xl font-bold">SELAMAT DATANG!</h1>
          <h2 className="text-xl mt-2 text-gray-500">Silakan pilih lokasi cabang</h2>
          <LocationDropdown
            value={tempSelectedLocation}
            onChange={handleLocationChange}
            hubsToShow={currentHubListView}
            className="mt-6 p-2 rounded border border-gray-300 w-64"
          />
          <div className="mt-4">
            <button
              onClick={handleSaveLocation}
              disabled={!tempSelectedLocation}
              className="px-6 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 disabled:bg-gray-400 cursor-pointer"
            >
              Pilih
            </button>
          </div>
        </div>
      </SelectionLayout>
    );
  }

  if (selectedLocation && !selectedUser) {
    return (
      <SelectionLayout>
        <div className="text-center w-full">
          <h1 className="text-3xl font-bold">PILIH USER</h1>
          <h2 className="text-lg mt-2 text-gray-500">
            Lokasi: <strong>{selectedLocationName}</strong>
          </h2>
          <UserSelectionGrid
            hubId={selectedLocation}
            roleIds={[ROLE_ID.planner, ROLE_ID.adminPlanner, ROLE_ID.plannerJkt, ROLE_ID.admin]}
            onUserSelect={handleUserSelect}
          />
          <button
            onClick={handleResetAll}
            className="mt-4 px-4 py-2 cursor-pointer bg-slate-600 text-white rounded hover:bg-slate-700 text-sm disabled:bg-slate-500 disabled:text-slate-300"
          >
            Kembali
          </button>
        </div>
      </SelectionLayout>
    );
  }
  return (
    <AppLayout mainClassName="items-center px-4">
      <DashboardSummary driverData={driverData.data} />
    </AppLayout>
  );
}
