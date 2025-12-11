// File: src/features/estimasiDelivery/EstimasiDelivery.js
'use client';

import DownloadButton from '@/components/DownloadButton';
import BodyCard from '@/components/card/BodyCard';
import HeaderCard from '@/components/card/HeaderCard';
import { isDateSunday, parseOutletName } from '@/lib/utils';
import { useEffect, useMemo, useState } from 'react';
import DatePicker from 'react-datepicker';
import { getResultsSummary } from '../../lib/apiService';
import { toastError } from '../../lib/toastHelper';
import TableData from './components/TableData';
import { handleConfirmDownload, parseSONumber } from './help';

export default function EstimasiDelivery() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const y = yesterday.getFullYear();
    const m = String(yesterday.getMonth() + 1).padStart(2, '0');
    const d = String(yesterday.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  const [allRoutes, setAllRoutes] = useState([]);
  const [activeVehicleId, setActiveVehicleId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDateChange = (date) => {
    if (!date) return;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const newDateStr = `${year}-${month}-${day}`;

    if (isDateSunday(newDateStr)) {
      toastError('Tidak ada pengiriman saat Minggu. Silahkan pilih tanggal lain');
      return;
    }
    setSelectedDate(newDateStr);
  };

  useEffect(() => {
    const date = new Date(selectedDate.replace(/-/g, '/'));
    if (date.getDay() === 0) {
      setAllRoutes([]);
      setIsLoading(false);
      return;
    }

    async function fetchData() {
      setIsLoading(true);
      setAllRoutes([]);
      setActiveVehicleId(null);
      try {
        const userLocation = localStorage.getItem('userLocation');
        if (!userLocation) {
          throw new Error('userLocation tidak ditemukan di localStorage.');
        }
        const dateFrom = `${selectedDate} 00:00:00`;
        const dateTo = `${selectedDate} 23:59:59`;

        const resultsData = await getResultsSummary({
          hubId: userLocation,
          limit: 100,
          dateFrom: dateFrom,
          dateTo: dateTo,
        });

        const allDoneRoutingsRaw = resultsData
          .filter((item) => item.dispatchStatus === 'done' && item.result && item.result.routing)
          .flatMap((item) => item.result.routing);

        const uniqueRoutesMap = new Map();
        allDoneRoutingsRaw.forEach((route) => {
          if (route.vehicleId) {
            uniqueRoutesMap.set(route.vehicleId, route);
          }
        });
        const allDoneRoutings = Array.from(uniqueRoutesMap.values());

        const getHubEtd = (route) => {
          if (!route.trips || route.trips.length === 0) return Infinity;
          const hubTrip = route.trips.find((trip) => trip.isHub && trip.order === 0);
          if (hubTrip && hubTrip.etd && typeof hubTrip.etd === 'string') {
            const fullEtdString = `${selectedDate}T${hubTrip.etd}`;
            const etdTime = new Date(fullEtdString).getTime();
            if (!isNaN(etdTime)) return etdTime;
          }
          return Infinity;
        };

        allDoneRoutings.sort((routeA, routeB) => getHubEtd(routeA) - getHubEtd(routeB));

        setAllRoutes(allDoneRoutings);

        if (allDoneRoutings.length > 0) {
          setActiveVehicleId(allDoneRoutings[0].vehicleId);
        } else {
          setActiveVehicleId(null);
        }
      } catch (err) {
        toastError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [selectedDate]);

  const filteredVehicleRoutes = useMemo(() => {
    if (!searchQuery) return allRoutes;
    const lowerCaseQuery = searchQuery.toLowerCase();
    return allRoutes.filter((route) => {
      if (route.vehicleName && route.vehicleName.toLowerCase().includes(lowerCaseQuery))
        return true;
      return route.trips.some((trip) => {
        if (trip.isHub) return false;
        const outlet = parseOutletName(trip.visitName)?.toLowerCase();
        const so = parseSONumber(trip.visitName)?.toLowerCase();
        return (outlet && outlet.includes(lowerCaseQuery)) || (so && so.includes(lowerCaseQuery));
      });
    });
  }, [allRoutes, searchQuery]);

  useEffect(() => {
    if (activeVehicleId) {
      const isActiveVehicleStillPresent = filteredVehicleRoutes.some(
        (route) => route.vehicleId === activeVehicleId
      );
      if (!isActiveVehicleStillPresent) {
        setActiveVehicleId(
          filteredVehicleRoutes.length > 0 ? filteredVehicleRoutes[0].vehicleId : null
        );
      }
    } else if (filteredVehicleRoutes.length > 0) {
      setActiveVehicleId(filteredVehicleRoutes[0].vehicleId);
    }
  }, [filteredVehicleRoutes, activeVehicleId]);

  const activeRoute = useMemo(() => {
    if (!activeVehicleId) return null;
    return filteredVehicleRoutes.find((route) => route.vehicleId === activeVehicleId);
  }, [filteredVehicleRoutes, activeVehicleId]);

  const datePicker = (
    <DatePicker
      className={`w-full md:w-48 px-4 py-2.5 h-[42px] rounded-lg border border-gray-300 text-center font-medium shadow-sm transition-colors ${
        isLoading
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
          : 'bg-white text-slate-700 cursor-pointer hover:bg-gray-50'
      }`}
      dateFormat="dd MMMM yyyy"
      disabled={isLoading}
      id="estimasiDate"
      maxDate={new Date().setDate(new Date().getDate() - 1)}
      onChange={handleDateChange}
      selected={selectedDate ? new Date(selectedDate) : new Date()}
      wrapperClassName="w-full"
    />
  );

  const searchBar = (
    <div className="relative w-full">
      <input
        className={`w-full max-w-full p-2 pr-8 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 ${
          isLoading
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
            : 'bg-white text-slate-700 cursor-text '
        }`}
        disabled={isLoading}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Plat, Customer, atau SO"
        type="text"
        value={searchQuery}
      />
      {searchQuery && (
        <button
          onClick={() => setSearchQuery('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );

  const downloadButton = (
    <DownloadButton
      onClick={() =>
        handleConfirmDownload({
          filteredVehicleRoutes,
          setIsDownloading,
        })
      }
      disabled={isDownloading || isLoading || filteredVehicleRoutes.length === 0}
      isLoading={isLoading || isDownloading}
      width="w-full md:w-auto"
    />
  );

  const headerItems = [
    { label: 'Filter', component: searchBar, hideLabel: false },
    { label: 'Tanggal Routing', component: datePicker, hideLabel: false },
    { label: 'Action', component: downloadButton, hideLabel: true },
  ];

  // Map data kendaraan menjadi Tabs yang dimengerti Card.js
  const vehicleTabs = filteredVehicleRoutes.map((route) => ({
    id: route.vehicleId,
    label: route.vehicleName,
  }));

  const subtitle = (
    <>
      Monitoring{' '}
      <span className="font-semibold text-sky-600">rute kunjungan & jadwal pengiriman</span> harian.
    </>
  );

  return (
    <div className="w-full max-w-none px-4 sm:px-6 flex flex-col grow h-full">
      <HeaderCard title="Estimasi Delivery" subtitle={subtitle} items={headerItems} />

      <BodyCard
        className="min-h-[400px]"
        isLoading={isLoading}
        loadingText="Memuat Rute..."
        isEmpty={!isLoading && (filteredVehicleRoutes.length === 0 || !activeRoute)}
        emptyMessage="Tidak ada data ditemukan untuk tanggal atau filter ini."
        // Tab Props
        tabs={vehicleTabs}
        activeTabId={activeVehicleId}
        onTabClick={setActiveVehicleId}
      >
        <div className="bg-white rounded-xl shadow-sm h-[600px] flex flex-col border-none">
          <div className="overflow-y-auto grow h-full">
            {!isLoading && activeRoute && (
              <TableData activeRoute={activeRoute} searchQuery={searchQuery} />
            )}
          </div>
        </div>
      </BodyCard>
    </div>
  );
}
