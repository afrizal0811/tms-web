// File: src/features/estimasiDelivery/EstimasiDelivery.js
'use client';

import DownloadButton from '@/components/DownloadButton';
import Spinner from '@/components/Spinner';
import { isDateSunday, parseOutletName } from '@/lib/utils';
import { useEffect, useMemo, useState } from 'react';
import DatePicker from 'react-datepicker';
import { getResultsSummary } from '../../lib/apiService';
import { toastError } from '../../lib/toastHelper';
import TabButton from './components/TabButton';
import TableData from './components/TableData';
import { handleConfirmDownload, parseSONumber } from './help';

export default function EstimasiDelivery() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    // Format YYYY-MM-DD manual untuk menghindari timezone issue
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

  // --- 3. UPDATE USE EFFECT (TIDAK ADA PERUBAHAN LOGIKA, HANYA FORMAT TANGGAL AMAN) ---
  useEffect(() => {
    // Pastikan parsing tanggal aman (ganti - dengan / agar browser compatible)
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
          if (!route.trips || route.trips.length === 0) {
            return Infinity;
          }
          const hubTrip = route.trips.find((trip) => trip.isHub && trip.order === 0);

          if (hubTrip && hubTrip.etd && typeof hubTrip.etd === 'string') {
            const fullEtdString = `${selectedDate}T${hubTrip.etd}`;
            const etdTime = new Date(fullEtdString).getTime();
            if (!isNaN(etdTime)) {
              return etdTime;
            }
          }
          return Infinity;
        };

        allDoneRoutings.sort((routeA, routeB) => {
          return getHubEtd(routeA) - getHubEtd(routeB);
        });

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
    if (!searchQuery) {
      return allRoutes;
    }
    const lowerCaseQuery = searchQuery.toLowerCase();
    return allRoutes.filter((route) => {
      if (route.vehicleName && route.vehicleName.toLowerCase().includes(lowerCaseQuery)) {
        return true;
      }
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

  return (
    <div className="w-full max-w-none px-4 sm:px-6 flex flex-col grow h-full">
      {/* 1. Kontrol Atas (Statis) */}
      <div className="flex flex-col md:flex-row justify-between items-center md:items-end bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6 gap-2">
        <div className="w-full md:w-auto relative z-50">
          <label className="block text-xs text-gray-400 mb-1 ml-1 font-medium">
            Tanggal Routing
          </label>
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
        </div>
        <div className="w-full md:w-auto relative z-0">
          <label className="block text-xs text-gray-400 mb-1 ml-1 font-medium">Filter</label>
          <input
            className={`w-full max-w-full p-2 pr-8 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 ${isLoading ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : 'bg-white text-slate-700 cursor-text '}`}
            disabled={isLoading}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Plat, Customer, atau SO"
            type="text"
            value={searchQuery}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-10 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
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
        <div className="w-full md:w-auto relative z-50">
          <label className="block text-xs text-transparent mb-1 ml-1 font-medium select-none">
            Action
          </label>
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
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[400px] flex flex-col">
        <div className="flex items-center border-b border-gray-200 shrink-0">
          <div className="flex flex-nowrap overflow-x-auto grow">
            {filteredVehicleRoutes.map((route, index) => {
              const id = route.vehicleId;
              return (
                <TabButton
                  key={id ?? index}
                  isActive={activeVehicleId === id}
                  onClick={() => setActiveVehicleId(id)}
                >
                  {route.vehicleName}
                </TabButton>
              );
            })}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-[600px] flex flex-col">
          <div className="overflow-y-auto grow">
            {isLoading && (
              <div className="w-full flex justify-center items-center p-20">
                <Spinner />
              </div>
            )}
            {!isLoading && (filteredVehicleRoutes.length === 0 || !activeRoute) && (
              <p className="p-10 text-center text-gray-500">
                Tidak ada data ditemukan untuk tanggal atau filter ini.
              </p>
            )}
            {!isLoading && activeRoute && (
              <TableData activeRoute={activeRoute} searchQuery={searchQuery} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
