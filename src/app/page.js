// File: src/app/page.js
'use client';

import AppLayout from '@/components/AppLayout';
import ErrorPage from '@/components/ErrorPage';
import LocationDropdown from '@/components/LocationDropdown';
import SelectionLayout from '@/components/SelectionLayout';
import Spinner from '@/components/Spinner';
import { useLanguage } from '@/context/LanguageContext'; // 1. IMPORT CONTEXT
import DashboardSummary from '@/features/dashboard/DashboardSummary';
import UserSelectionGrid from '@/features/userSelection/UserSelectionGrid';
import { ROLE_ID } from '@/lib/constants';
import { getLocalStorage, removeLocalStorage, setLocalStorage } from '@/lib/localStorageHandler';
import { useEffect, useRef, useState } from 'react'; // Tambah useRef
import { getHubs } from '../lib/apiService';
import { getOrFetchDriverData } from '../lib/driverDataHelper';
import { toastError } from '../lib/toastHelper';

// --- KOMPONEN KECIL UNTUK DROPDOWN BAHASA (FLOATING) ---
function LanguageFloater() {
  const { lang, switchLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const languages = [
    { code: 'id', label: 'Indonesia', flag: '🇮🇩' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
  ];

  // Tutup dropdown jika klik di luar
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="absolute top-6 right-6 z-50" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white px-3 py-2 rounded-full shadow-sm border border-gray-200 hover:bg-gray-50 transition-all text-sm font-medium text-slate-700 cursor-pointer"
      >
        <span>{lang === 'id' ? '🇮🇩' : '🇬🇧'}</span>
        <span className="hidden sm:inline">{lang === 'id' ? 'Indonesia' : 'English'}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
          {languages.map((item) => (
            <button
              key={item.code}
              onClick={() => {
                switchLanguage(item.code);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-sky-50 transition-colors cursor-pointer ${
                lang === item.code ? 'text-sky-700 font-semibold bg-sky-50/50' : 'text-slate-600'
              }`}
            >
              <span className="text-lg">{item.flag}</span>
              <span>{item.label}</span>
              {lang === item.code && <span className="ml-auto text-sky-600">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  // ... (State dan Logic useEffect Anda TETAP SAMA, tidak ada yang diubah di sini) ...
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

  // Ambil t untuk translate judul halaman (Opsional, biar makin keren)
  const { t } = useLanguage();

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
      alert(t('home.alert_select_branch'));
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
        <LanguageFloater />
        <div className="text-center w-full">
          <h1 className="text-4xl font-bold">{t('home.welcome')}</h1>
          <h2 className="text-xl mt-2 text-gray-500">{t('home.select_branch_instruction')}</h2>

          <LocationDropdown
            value={tempSelectedLocation}
            onChange={handleLocationChange}
            hubsToShow={currentHubListView}
            className="mt-6 p-2 rounded border border-gray-300 w-64"
            placeholder={`--${t('home.placeholder')}--`}
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
        <LanguageFloater />
        <div className="text-center w-full">
          <h1 className="text-3xl font-bold">{t('home.select_user_title')}</h1>
          <h2 className="text-lg mt-2 text-gray-500">
            {t('home.location_label')}: <strong>{selectedLocationName}</strong>
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
            {t('home.back_btn')}
          </button>
        </div>
      </SelectionLayout>
    );
  }

  // --- TAMPILAN 3: DASHBOARD (Sudah ada Navbar, jadi tidak butuh Floater) ---
  return (
    <AppLayout mainClassName="items-center px-4">
      <DashboardSummary driverData={driverData.data} />
    </AppLayout>
  );
}
