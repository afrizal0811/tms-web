// File: src/app/page.js
'use client';

import AppLayout from '@/components/AppLayout';
import ErrorPage from '@/components/ErrorPage';
import LocationDropdown from '@/components/LocationDropdown';
import SelectionLayout from '@/components/SelectionLayout';
import Spinner from '@/components/Spinner';
import { useLanguage } from '@/context/LanguageContext';
import DashboardSummary from '@/features/dashboard/DashboardSummary';
import UserLogin from '@/features/userLogin/UserLogin';
import { getLocalStorage, removeLocalStorage, setLocalStorage } from '@/lib/localStorageHandler';
import { isEmpty } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';
import { getHubs } from '../lib/apiService';
import { getOrFetchDriverData } from '../lib/driverDataHelper';
import { toastError, toastInfo } from '../lib/toastHelper';

export default function Home() {
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedLocationName, setSelectedLocationName] = useState('');
  const [tempSelectedLocation, setTempSelectedLocation] = useState('');
  const [tempSelectedLocationName, setTempSelectedLocationName] = useState('');
  const [driverData, setDriverData] = useState({ data: [] });

  const [isPageLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState(null);
  const [allHubsList, setAllHubsList] = useState(null);
  const [currentHubListView, setCurrentHubListView] = useState(null);

  const { t } = useLanguage();
  const toastShownRef = useRef(false);

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
            if (isEmpty(userHubIds) || userHubIds.includes(storedLocation)) {
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
          const hasShownSession = sessionStorage.getItem('hasShownHelpToast');
          if (!hasShownSession && !toastShownRef.current) {
            toastShownRef.current = true;
            sessionStorage.setItem('hasShownHelpToast', 'true');

            setTimeout(() => {
              toastInfo(t('home.toast.info_tutorial'));
            }, 500);
          }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Dependency kosong agar hanya jalan sekali saat mount

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
      toastError(t('home.select_branch'));
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

  // --- TAMPILAN 1: PILIH LOKASI ---
  if (!selectedLocation) {
    return (
      <SelectionLayout>
        <div className="text-center w-full">
          <h1 className="text-4xl font-bold">{t('home.welcome')}</h1>
          <h2 className="text-xl mt-2 text-gray-500">{t('home.select_branch')}</h2>

          <LocationDropdown
            value={tempSelectedLocation}
            onChange={handleLocationChange}
            hubsToShow={currentHubListView}
            className="mt-6 p-2 rounded border border-gray-300 w-64"
            placeholder={`-- ${t('home.placeholder')} --`}
          />
          <div className="mt-4">
            <button
              onClick={handleSaveLocation}
              disabled={!tempSelectedLocation}
              className="px-6 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 disabled:bg-gray-400 cursor-pointer"
            >
              {t('home.select_btn')}
            </button>
          </div>
        </div>
      </SelectionLayout>
    );
  }

  // --- TAMPILAN 2: PILIH USER ---
  if (selectedLocation && !selectedUser) {
    return (
      <SelectionLayout>
        <div className="text-center w-full">
          <UserLogin
            hubId={selectedLocation}
            onUserSelect={handleUserSelect}
            locationId={selectedLocationName}
          />
          <button
            onClick={handleResetAll}
            className="mt-4 px-4 py-2 cursor-pointer bg-slate-600 text-white rounded hover:bg-slate-700 text-sm disabled:bg-slate-500 disabled:text-slate-300"
          >
            {t('home.back_btn')}
          </button>
        </div>
      </SelectionLayout>
    );
  }

  // --- TAMPILAN 3: DASHBOARD ---
  return (
    <AppLayout mainClassName="items-center px-4">
      <DashboardSummary driverData={driverData.data} />
    </AppLayout>
  );
}
