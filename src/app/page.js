'use client';

import AppLayout from '@/components/AppLayout';
import ErrorPage from '@/components/ErrorPage';
import SelectionLayout from '@/components/SelectionLayout';
import Spinner from '@/components/Spinner';
import { useLanguage } from '@/context/LanguageContext';
import DashboardSummary from '@/features/dashboard/DashboardSummary';
import BranchSelection from '@/features/userLogin/BranchSelection';
import LoginSelection from '@/features/userLogin/LoginSelection';
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
        const { storedLocation, storedLocationName, storedUser, storedSession } = getLocalStorage();

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
              const newSession = { ...storedSession };
              delete newSession.user;
              setLocalStorage('data', JSON.stringify(newSession));
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

    setDriverData({ data: [] });

    const selectedHubObj = allHubsList.find((h) => h._id === tempSelectedLocation);
    const { storedSession } = getLocalStorage();
    const currentData = storedSession || {};

    let userObj = currentData.user || {};

    if (!selectedUser) {
      userObj = {
        activeHubId: tempSelectedLocation,
        activeHubName: tempSelectedLocationName,
        activeHubAcronym: selectedHubObj?.acronym || '',
      };
    } else {
      userObj = {
        ...userObj,
        activeHubId: tempSelectedLocation,
        activeHubName: tempSelectedLocationName,
        activeHubAcronym: selectedHubObj?.acronym || '',
      };
    }

    const newSession = {
      ...currentData,
      user: userObj,
    };

    setLocalStorage('data', JSON.stringify(newSession));
    setSelectedLocation(tempSelectedLocation);
    setSelectedLocationName(tempSelectedLocationName);
  };

  const handleUserSelect = (user) => {
    const selectedHubObj = allHubsList.find((h) => h._id === selectedLocation);
    const { storedSession } = getLocalStorage();
    const currentData = storedSession || {};

    const filteredUserSession = {
      _id: user._id,
      email: user.email,
      name: user.name,
      hubId: user.hubId,
      roleId: user.roleId,
      status: user.status,
      activeHubId: selectedLocation,
      activeHubName: selectedLocationName,
      activeHubAcronym: selectedHubObj?.acronym || '',
    };

    const newSession = {
      ...currentData,
      user: filteredUserSession,
    };

    setLocalStorage('data', JSON.stringify(newSession));
    setSelectedUser(filteredUserSession);
  };

  const handleResetAll = () => {
    const { storedSession } = getLocalStorage();
    if (storedSession) {
      const newSession = { ...storedSession };
      delete newSession.user;
      setLocalStorage('data', JSON.stringify(newSession));
    }

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
        <BranchSelection
          t={t}
          tempSelectedLocation={tempSelectedLocation}
          handleLocationChange={handleLocationChange}
          currentHubListView={currentHubListView}
          handleSaveLocation={handleSaveLocation}
        />
      </SelectionLayout>
    );
  }

  if (selectedLocation && !selectedUser) {
    return (
      <SelectionLayout>
        <LoginSelection
          t={t}
          selectedLocation={selectedLocation}
          handleUserSelect={handleUserSelect}
          selectedLocationName={selectedLocationName}
          handleResetAll={handleResetAll}
        />
      </SelectionLayout>
    );
  }

  return (
    <AppLayout mainClassName="items-center px-4 relative">
      <DashboardSummary driverData={driverData.data} />
    </AppLayout>
  );
}
