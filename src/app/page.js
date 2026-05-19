'use client';

import AppLayout from '@/components/AppLayout';
import ErrorPage from '@/components/ErrorPage';
import SelectionLayout from '@/components/SelectionLayout';
import Spinner from '@/components/Spinner';
import { useLanguage } from '@/context/LanguageContext';
import Dashboard from '@/features/dashboard/Dashboard';
import UserLoginPage from '@/features/userLogin/UserLoginPage';
import { getHubs } from '@/lib/api';
import {
  getCachedHubs,
  getLocalStorage,
  setCachedHubs,
  setLocalStorage,
} from '@/lib/localStorageHandler';
import { isEmpty } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';
import { getOrFetchDriverData } from '../lib/driverDataHelper';
import { toastError, toastInfo } from '../lib/toastHelper';

export default function Home() {
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState('');
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
      let processedHubs = getCachedHubs();

      try {
        if (!processedHubs || isEmpty(processedHubs)) {
          const hubs = await getHubs();
          processedHubs = hubs
            .filter((hub) => hub.name !== 'Hub Demo')
            .map((hub) => ({
              ...hub,
              name: hub.name.replace('Hub ', ''),
            }));
          setCachedHubs(processedHubs);
        }
        setAllHubsList(processedHubs);
      } catch (e) {
        setPageError('Gagal terhubung ke database.');
        setIsLoading(false);
        return;
      }

      try {
        const { storedLocation, storedUser, storedSession } = getLocalStorage();

        if (storedUser) {
          const user = JSON.parse(storedUser);
          setSelectedUser(user);
          setSelectedLocation(user.activeHubId || '');
          const userHubIds = user.hubId || [];
          const allowed =
            userHubIds.length > 1
              ? processedHubs.filter((h) => userHubIds.includes(h._id))
              : processedHubs;
          setCurrentHubListView(allowed);

          if (storedLocation) {
            if (!isEmpty(userHubIds) && !userHubIds.includes(storedLocation)) {
              const newSession = { ...storedSession };
              delete newSession.user;
              setLocalStorage('data', JSON.stringify(newSession));
              setSelectedUser(null);
              setSelectedLocation('');
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

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setSelectedLocation(user.activeHubId || '');
  };

  if (isPageLoading || allHubsList === null)
    return (
      <SelectionLayout>
        <Spinner />
      </SelectionLayout>
    );
  if (pageError) return <ErrorPage />;

  if (!selectedUser || !selectedLocation) {
    return (
      <SelectionLayout>
        <UserLoginPage
          t={t}
          allHubsList={allHubsList}
          currentHubListView={currentHubListView}
          handleUserSelect={handleUserSelect}
        />
      </SelectionLayout>
    );
  }

  return (
    <AppLayout mainClassName="items-center px-4 relative">
      <Dashboard driverData={driverData.data} />
    </AppLayout>
  );
}
