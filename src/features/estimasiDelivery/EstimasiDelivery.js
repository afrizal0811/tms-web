// File: src/features/estimasiDelivery/EstimasiDelivery.js
'use client';

import CustomDatePicker from '@/components/CustomDatePicker';
import DownloadButton from '@/components/DownloadButton';
import SearchBar from '@/components/SearchBar';
import BodyCard from '@/components/card/BodyCard';
import HeaderCard from '@/components/card/HeaderCard';
import { useLanguage } from '@/context/LanguageContext';
import { getLocalStorage } from '@/lib/localStorageHandler';
import {
  calculateStartFinishDates,
  formatDateUniversal,
  isEmpty,
  normalizeEmail,
  parseCustomerString,
} from '@/lib/utils';
import { pdf } from '@react-pdf/renderer';
import JSZip from 'jszip';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getLocationHistories, getResultsSummary } from '../../lib/apiService';
import { toastError, toastSuccess } from '../../lib/toastHelper';
import ReportTerimaFaktur from './components/ReportTerimaFaktur';
import TableData from './components/TableData';
import { handleConfirmDownload, parseSONumber, processDriverTimeMap } from './help';

export default function EstimasiDelivery() {
  const [selectedDate, setSelectedDate] = useState('');
  const [isClient, setIsClient] = useState(false);

  const [allRoutes, setAllRoutes] = useState([]);
  const [activeVehicleId, setActiveVehicleId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const [driverMap, setDriverMap] = useState(new Map());
  const [timeMap, setTimeMap] = useState(new Map());

  const [isDownloadDropdownOpen, setIsDownloadDropdownOpen] = useState(false);
  const downloadDropdownRef = useRef(null);

  const { t, lang } = useLanguage();
  const isIndo = lang === 'id';

  useEffect(() => {
    setIsClient(true);
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  }, []);

  const handleDateChange = (date) => {
    if (!date) return;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const newDateStr = `${year}-${month}-${day}`;
    setSelectedDate(newDateStr);
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (downloadDropdownRef.current && !downloadDropdownRef.current.contains(event.target)) {
        setIsDownloadDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [downloadDropdownRef]);

  useEffect(() => {
    try {
      const { storedDrivers } = getLocalStorage();
      if (storedDrivers) {
        const parsedDrivers = JSON.parse(storedDrivers);
        const map = new Map();
        if (Array.isArray(parsedDrivers)) {
          parsedDrivers.forEach((d) => {
            const email = normalizeEmail(d.email);
            if (email) map.set(email, d.name);
          });
        }
        setDriverMap(map);
      }
    } catch (error) {
      toastError(t('estimation.toast.no_driver_data', { err: error.message }));
    }
  }, [t]);

  const handleDownloadPdfZip = async () => {
    if (isEmpty(filteredVehicleRoutes)) {
      toastError(t('estimation.toast.no_data_downloaded'));
      return;
    }

    setIsDownloading(true);
    setIsDownloadDropdownOpen(false);

    try {
      const dateForFilename = formatDateUniversal(selectedDate, 'DD.MM.YYYY');
      const { storedLocationName } = getLocalStorage();
      const locationName = storedLocationName || 'Cabang';

      // KASUS 1: HANYA 1 DATA -> DOWNLOAD LANGSUNG PDF
      if (filteredVehicleRoutes.length === 1) {
        const route = filteredVehicleRoutes[0];
        const normalizedAssignee = normalizeEmail(route.assignee);
        const realDriverName = driverMap.get(normalizedAssignee) || route.vehicleName;
        const timeData = timeMap.get(normalizedAssignee) || { jamBerangkat: '-', jamKembali: '-' };

        const blob = await pdf(
          <ReportTerimaFaktur
            data={route}
            selectedDate={selectedDate}
            driverNameOverride={realDriverName}
            jamBerangkat={timeData.jamBerangkat}
            jamKembali={timeData.jamKembali}
          />
        ).toBlob();

        const safeName = (route.vehicleName || 'Vehicle').replace(/[^a-zA-Z0-9-_ ]/g, '').trim();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Tanda Terima Faktur - ${safeName} - ${dateForFilename}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toastSuccess(t('estimation.toast.success_pdf'));
      } else {
        const zip = new JSZip();

        const pdfPromises = filteredVehicleRoutes.map(async (route) => {
          const normalizedAssignee = normalizeEmail(route.assignee);
          const realDriverName = driverMap.get(normalizedAssignee) || route.vehicleName;
          const timeData = timeMap.get(normalizedAssignee) || {
            jamBerangkat: '-',
            jamKembali: '-',
          };

          const blob = await pdf(
            <ReportTerimaFaktur
              data={route}
              selectedDate={selectedDate}
              driverNameOverride={realDriverName}
              jamBerangkat={timeData.jamBerangkat}
              jamKembali={timeData.jamKembali}
            />
          ).toBlob();

          const safeName = (route.vehicleName || 'Vehicle').replace(/[^a-zA-Z0-9-_ ]/g, '').trim();
          return { name: `${safeName} - ${dateForFilename}.pdf`, blob };
        });

        const generatedFiles = await Promise.all(pdfPromises);

        generatedFiles.forEach((file) => {
          zip.file(file.name, file.blob);
        });

        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${t('estimation.invoice_receipt')} - ${locationName} - ${dateForFilename}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toastSuccess(t('estimation.toast.success_zip', { length: generatedFiles.length }));
      }
    } catch (error) {
      toastError(t('estimation.toast.download_failed', { err: error.message }));
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    if (!selectedDate) return;
    const deliveryDateObj = new Date(selectedDate);
    if (deliveryDateObj.getDay() === 0) {
      setAllRoutes([]);
      setIsLoading(false);
      return;
    }

    async function fetchData() {
      setIsLoading(true);
      setAllRoutes([]);
      setActiveVehicleId(null);
      setTimeMap(new Map());

      try {
        const { storedLocation: userLocation } = getLocalStorage();
        if (!userLocation) {
          throw new Error('userLocation tidak ditemukan di localStorage.');
        }

        const routingDate = new Date(deliveryDateObj);
        if (deliveryDateObj.getDay() === 1) {
          routingDate.setDate(deliveryDateObj.getDate() - 2);
        } else {
          routingDate.setDate(deliveryDateObj.getDate() - 1);
        }

        const ry = routingDate.getFullYear();
        const rm = String(routingDate.getMonth() + 1).padStart(2, '0');
        const rd = String(routingDate.getDate()).padStart(2, '0');
        const routingDateStr = `${ry}-${rm}-${rd}`;
        const dateFrom = `${routingDateStr} 00:00:00`;
        const dateTo = `${routingDateStr} 23:59:59`;

        const { timeFrom, timeTo } = calculateStartFinishDates(selectedDate);

        const [resultsData, historyData] = await Promise.all([
          getResultsSummary({
            hubId: userLocation,
            limit: 100,
            dateFrom: dateFrom,
            dateTo: dateTo,
          }),
          getLocationHistories({
            timeFrom,
            timeTo,
            limit: 5000,
            startFinish: 'true',
            fields: 'finish,startTime,email,trackedTime,totalDistance',
            timeBy: 'createdTime',
          }),
        ]);

        const allDoneRoutingsRaw = (resultsData || [])
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
          if (!route.trips || isEmpty(route.trips)) return Infinity;
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

        const processedTime = processDriverTimeMap(historyData, selectedDate);
        setTimeMap(processedTime);
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
        const outlet = parseCustomerString(trip.visitName).name?.toLowerCase();
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

  if (!isClient) return null;

  const datePicker = (
    <CustomDatePicker
      id="estimasiDate"
      className="md:w-48"
      isLoading={isLoading}
      onChange={handleDateChange}
      selected={selectedDate ? new Date(selectedDate) : new Date()}
      wrapperClassName="w-full"
    />
  );
  const searchBar = (
    <SearchBar
      disabled={isLoading}
      onChange={(val) => setSearchQuery(val)}
      placeholder={t('estimation.search_placeholder')}
      value={searchQuery}
    />
  );

  const downloadButton = (
    <div className="w-full md:w-auto z-50 relative" ref={downloadDropdownRef}>
      <DownloadButton
        disabled={isDownloading || isLoading || isEmpty(filteredVehicleRoutes)}
        isLoading={isLoading || isDownloading}
        onClick={() => setIsDownloadDropdownOpen((prev) => !prev)}
        text={t('common.download')}
        width="w-full md:w-auto"
      />

      {isDownloadDropdownOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="py-1">
            <button
              onClick={() => {
                setIsDownloadDropdownOpen(false);
                handleConfirmDownload({
                  filteredVehicleRoutes,
                  setIsDownloading,
                  t,
                });
              }}
              className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors cursor-pointer"
            >
              <svg
                className="w-5 h-5 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span>{t('estimation.title')}</span>
            </button>

            <div className="border-t border-gray-100 my-1"></div>

            <button
              onClick={handleDownloadPdfZip}
              className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors cursor-pointer"
            >
              <svg
                className="w-5 h-5 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
              <span>
                {t('estimation.invoice_receipt')} {!isIndo && '(Indonesia)'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const headerItems = [
    { label: 'Filter', component: searchBar, hideLabel: false },
    { label: t('common.delivery_date'), component: datePicker, hideLabel: false },
    { label: 'Action', component: downloadButton, hideLabel: true },
  ];

  const vehicleTabs = filteredVehicleRoutes.map((route) => ({
    id: route.vehicleId,
    label: route.vehicleName,
  }));

  const subtitle = (
    <>
      {t('estimation.subtitle')}{' '}
      <span className="font-semibold text-sky-600">{t('estimation.subtitle_highlight')}</span>
    </>
  );

  return (
    <div className="w-full max-w-none px-4 sm:px-6 flex flex-col grow h-full">
      <HeaderCard title={t('estimation.title')} subtitle={subtitle} items={headerItems} />
      <BodyCard
        activeTabId={activeVehicleId}
        className="min-h-[400px]"
        isEmpty={!isLoading && (isEmpty(filteredVehicleRoutes) || !activeRoute)}
        isLoading={isLoading}
        loadingText={t('common.loading')}
        onTabClick={setActiveVehicleId}
        tabs={vehicleTabs}
      >
        <div className="bg-white rounded-xl h-full flex flex-col border-none">
          <div className="overflow-y-auto grow h-full m-0 border border-gray-300 rounded-b-xl">
            {!isLoading && activeRoute && (
              <TableData activeRoute={activeRoute} searchQuery={searchQuery} t={t} />
            )}
          </div>
        </div>
      </BodyCard>
    </div>
  );
}
