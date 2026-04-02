'use client';

import AppLayout from '@/components/AppLayout';
import ErrorPage from '@/components/ErrorPage';
import LocationDropdown from '@/components/LocationDropdown';
import SelectionLayout from '@/components/SelectionLayout';
import Spinner from '@/components/Spinner';
import { useLanguage } from '@/context/LanguageContext';
import DashboardSummary from '@/features/dashboard/DashboardSummary';
import UserLogin from '@/features/userLogin/UserLogin';
import { getDriversSyncStatus, syncDriversData, syncRolesData } from '@/lib/api';
import { useInitialDataSync } from '@/lib/hooks/useInitialDataSync';
import { getLocalStorage, removeLocalStorage, setLocalStorage } from '@/lib/localStorageHandler';
import { isEmpty } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';
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
  const [isBackgroundSyncing, setIsBackgroundSyncing] = useState(false);

  const { t } = useLanguage();
  const toastShownRef = useRef(false);

  useInitialDataSync(setIsLoading, setAllHubsList, setCurrentHubListView, setPageError);

  useEffect(() => {
    const { storedSession, storedLocation, storedLocationName, storedUser } = getLocalStorage();
    const hasCompleteData = storedSession && storedLocation && storedLocationName && storedUser;

    if (hasCompleteData || selectedUser) {
      const hasSynced = sessionStorage.getItem('hasSyncedThisSession');

      if (!hasSynced) {
        const runBackgroundSync = async () => {
          setIsBackgroundSyncing(true); // Tampilkan Spinner
          try {
            await syncRolesData().catch(() => {});
            await syncDriversData().catch(() => {});
            await getDriversSyncStatus().catch(() => {});

            sessionStorage.setItem('hasSyncedThisSession', 'true');
          } catch (err) {
            console.error('Error background sync:', err);
          } finally {
            setIsBackgroundSyncing(false);
          }
        };

        runBackgroundSync();
      }
    }
  }, [selectedUser]);

  useEffect(() => {
    async function initializeApp() {
      setIsLoading(true);
      setPageError(null);
      let processedHubs = [];
      try {
        const res = await fetch('/api/get-hubs');
        const hubs = await res.json();

        processedHubs = hubs
          .filter((hub) => hub.name !== 'Hub Demo')
          .map((hub) => ({
            ...hub,
            name: hub.name.replace('Hub ', ''),
          }));

        setAllHubsList(processedHubs);
      } catch (e) {
        setPageError('Gagal terhubung ke database.');
        setIsLoading(false);
        return;
      }

      try {
        const { storedLocation, storedLocationName, storedUser } = getLocalStorage();

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
              removeLocalStorage('data');
            }
          }
        } else if (storedLocation) {
          setCurrentHubListView(processedHubs);
          setSelectedLocation(storedLocation);
          setSelectedLocationName(storedLocationName);
          setTempSelectedLocation(storedLocation);
          setTempSelectedLocationName(storedLocationName);
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
      } catch (e) {
        setPageError(e.message);
        toastError(e.message);
      } finally {
        setIsLoading(false);
      }
    }
    initializeApp();
  }, [t]);

  useEffect(() => {
    async function fetchDriverData() {
      try {
        const data = await getOrFetchDriverData(selectedLocation);
        setDriverData({ data: data });
      } catch (err) {
        toastError(err);
      }
    }
    if (selectedLocation) fetchDriverData();
  }, [selectedLocation]);

  const handleLocationChange = (id, name) => {
    setTempSelectedLocation(id);
    setTempSelectedLocationName(name);
  };

  const handleSaveLocation = () => {
    if (!tempSelectedLocation) return toastError(t('home.select_branch'));
    if (!selectedUser) {
      removeLocalStorage('data');
      setSelectedUser(null);
    }

    setDriverData({ data: [] });

    const tempSession = {
      activeHubId: tempSelectedLocation,
      activeHubName: tempSelectedLocationName,
    };
    setLocalStorage('data', JSON.stringify(tempSession));

    setSelectedLocation(tempSelectedLocation);
    setSelectedLocationName(tempSelectedLocationName);
  };

  const handleUserSelect = (user) => {
    const filteredUserSession = {
      _id: user._id,
      email: user.email,
      name: user.name,
      hubId: user.hubId,
      roleId: user.roleId,
      status: user.status,
      activeHubId: selectedLocation,
      activeHubName: selectedLocationName,
    };

    setLocalStorage('data', JSON.stringify(filteredUserSession));
    setSelectedUser(filteredUserSession);
  };

  const handleResetAll = () => {
    removeLocalStorage('data');
    setSelectedUser(null);
    setSelectedLocation('');
    setSelectedLocationName('');
    setDriverData({ data: [] });
    setCurrentHubListView(allHubsList);
  };

  if (isPageLoading || allHubsList === null)
    return (
      <SelectionLayout>
        <Spinner />
      </SelectionLayout>
    );
  if (pageError) return <ErrorPage />;

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
            translate={t}
          />
          <div className="mt-4">
            <button
              onClick={handleSaveLocation}
              disabled={!tempSelectedLocation}
              className="px-6 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 disabled:bg-gray-400 cursor-pointer transition-colors"
            >
              {t('home.select_btn')}
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

  return (
    <AppLayout mainClassName="items-center px-4 relative">
      <DashboardSummary driverData={driverData.data} />
      {isBackgroundSyncing && (
        <div className="fixed inset-0 z-9999 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center transition-opacity duration-300">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm text-center transform scale-100 animate-fade-in-up">
            <Spinner
              size="w-14 h-14"
              border="border-4 border-gray-100"
              colorClass="border-t-sky-600"
            />

            <h2 className="mt-6 text-xl font-bold text-slate-800">Sinkronisasi Data</h2>

            <p className="mt-3 text-sm text-slate-500 leading-relaxed">
              Mohon tunggu sebentar, kami sedang melakukan sinkronisasi data
            </p>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
