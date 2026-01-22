// File: src/features/estimasiDelivery/EstimasiDelivery.js
'use client';

import CustomDatePicker from '@/components/CustomDatePicker';
import DownloadButton from '@/components/DownloadButton';
import SearchBar from '@/components/SearchBar';
import Tooltip from '@/components/Tooltip';
import BodyCard from '@/components/card/BodyCard';
import HeaderCard from '@/components/card/HeaderCard';
import { useLanguage } from '@/context/LanguageContext';
import { getLocalStorage } from '@/lib/localStorageHandler';
import {
  calculateStartFinishDates,
  convertWibToUtc,
  formatDateUniversal,
  isEmpty,
  normalizeEmail,
} from '@/lib/utils';
import { pdf } from '@react-pdf/renderer';
import JSZip from 'jszip';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getLocationHistories, getResultsSummary, getTasks } from '../../lib/apiService';
import { getOrFetchDriverData } from '../../lib/driverDataHelper';
import { toastError, toastSuccess } from '../../lib/toastHelper';
import ReportTerimaFaktur from './components/ReportTerimaFaktur';
import TableData from './components/TableData';
import { getDriverName, handleConfirmDownload, processDriverTimeMap } from './help';

export default function EstimasiDelivery() {
  const [activeVehicleId, setActiveVehicleId] = useState(null);
  const [allRoutes, setAllRoutes] = useState([]);
  const [driverData, setDriverData] = useState({});
  const [driverMap, setDriverMap] = useState(new Map());
  const [excelFilter, setExcelFilter] = useState({ dry: true, frozen: true });
  const [isClient, setIsClient] = useState(false);
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isExcelDropdownOpen, setIsExcelDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [timeMap, setTimeMap] = useState(new Map());

  const excelDropdownRef = useRef(null);
  const isAnyDownloading = isDownloadingExcel || isDownloadingPdf;

  const { t } = useLanguage();

  useEffect(() => {
    setIsClient(true);
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);

    const ls = getLocalStorage();
    if (ls && ls.storedDrivers) {
      try {
        const rawDrivers = JSON.parse(ls.storedDrivers);
        if (Array.isArray(rawDrivers)) {
          const driverObjMap = {};
          rawDrivers.forEach((d) => {
            if (d.email) {
              const normEmail = normalizeEmail(d.email);
              driverObjMap[normEmail] = d;
            }
          });
          setDriverData(driverObjMap);
        }
      } catch (e) {
        toastError(t('estimation.toast.no_driver_data', { err: e.message }));
      }
    }
  }, [t]);

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
      if (excelDropdownRef.current && !excelDropdownRef.current.contains(event.target)) {
        setIsExcelDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    try {
      const { storedDrivers } = getLocalStorage();
      if (storedDrivers) {
        const parsedDrivers = JSON.parse(storedDrivers);
        const map = new Map();
        if (Array.isArray(parsedDrivers)) {
          parsedDrivers.forEach((d) => {
            const email = normalizeEmail(d.email);
            if (email) map.set(email, d.plat);
          });
        }
        setDriverMap(map);
      }
    } catch (error) {
      toastError(t('estimation.toast.no_driver_data', { err: error.message }));
    }
  }, [t]);

  const handleDeliveryDownload = async () => {
    if (isEmpty(filteredVehicleRoutes)) {
      toastError(t('estimation.toast.no_data_downloaded'));
      return;
    }

    setIsDownloadingPdf(true);

    try {
      const dateForFilename = formatDateUniversal(selectedDate, 'DD.MM.YYYY');
      const { storedLocationName } = getLocalStorage();
      const locationName = storedLocationName || 'Cabang';

      const generatePdfBlob = async (route) => {
        const normalizedAssignee = normalizeEmail(route.assignee);
        const realDriverName = getDriverName(route, driverData);

        const timeData = timeMap.get(normalizedAssignee) || { jamBerangkat: '', jamKembali: '' };

        return await pdf(
          <ReportTerimaFaktur
            data={route}
            selectedDate={selectedDate}
            driverNameOverride={realDriverName}
            jamBerangkat={timeData.jamBerangkat}
            jamKembali={timeData.jamKembali}
          />
        ).toBlob();
      };

      if (filteredVehicleRoutes.length === 1) {
        const route = filteredVehicleRoutes[0];
        const blob = await generatePdfBlob(route);
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
          const blob = await generatePdfBlob(route);
          const safeName = (route.vehicleName || 'Vehicle').replace(/[^a-zA-Z0-9-_ ]/g, '').trim();
          return { name: `${safeName} - ${dateForFilename}.pdf`, blob };
        });

        const generatedFiles = await Promise.all(pdfPromises);
        generatedFiles.forEach((file) => zip.file(file.name, file.blob));

        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${t('estimation.delivery_form')} - ${locationName} - ${dateForFilename}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toastSuccess(t('estimation.toast.success_zip', { length: generatedFiles.length }));
      }
    } catch (error) {
      toastError(t('estimation.toast.download_failed', { err: error.message }));
    } finally {
      setIsDownloadingPdf(false);
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

        const rawDrivers = await getOrFetchDriverData(userLocation);
        const dataObj = {};
        const mapObj = new Map();
        if (Array.isArray(rawDrivers)) {
          rawDrivers.forEach((d) => {
            const email = normalizeEmail(d.email);
            dataObj[email] = d;
            mapObj.set(email, d.plat || 'Other');
          });
        }
        setDriverData(dataObj);
        setDriverMap(mapObj);

        const routingDate = new Date(deliveryDateObj);
        if (deliveryDateObj.getDay() === 1) {
          routingDate.setDate(deliveryDateObj.getDate() - 2);
        } else {
          routingDate.setDate(deliveryDateObj.getDate() - 1);
        }
        const ry = routingDate.getFullYear();
        const rm = String(routingDate.getMonth() + 1).padStart(2, '0');
        const rd = String(routingDate.getDate()).padStart(2, '0');
        const dateFromRouting = `${ry}-${rm}-${rd} 00:00:00`;
        const dateToRouting = `${ry}-${rm}-${rd} 23:59:59`;

        const startD = new Date(selectedDate);
        startD.setHours(0, 0, 0, 0);
        const endD = new Date(selectedDate);
        endD.setHours(23, 59, 59, 999);
        const timeFrom = convertWibToUtc(startD);
        const timeTo = convertWibToUtc(endD);

        const { timeFrom: historyFrom, timeTo: historyTo } =
          calculateStartFinishDates(selectedDate);

        const [resultsData, historyData, tasksResponse] = await Promise.all([
          getResultsSummary({
            hubId: userLocation,
            limit: 100,
            dateFrom: dateFromRouting,
            dateTo: dateToRouting,
          }),
          getLocationHistories({
            timeFrom: historyFrom,
            timeTo: historyTo,
            limit: 5000,
            startFinish: 'true',
            fields: 'finish,startTime,email,trackedTime,totalDistance',
            timeBy: 'createdTime',
          }),
          getTasks({
            hubId: userLocation,
            limit: 2000,
            timeFrom: timeFrom,
            timeTo: timeTo,
            timeBy: 'startTime',
            status: 'DONE,ONGOING,UNASSIGNED',
          }),
        ]);

        const rawTasks = tasksResponse;

        const filteredTasks = (Array.isArray(rawTasks) ? rawTasks : []).filter((task) => {
          const assignee = task?.assignee;
          return Array.isArray(assignee) && assignee.length > 0;
        });

        const tasksByPlat = filteredTasks.reduce((groups, task) => {
          const rawEmail = task?.assignee[0];
          const email = normalizeEmail(rawEmail);
          const plat = mapObj.get(email) || t('common.others');

          if (!groups[plat]) {
            groups[plat] = {
              plat: plat,
              email: email,
              assigneeName: task.user?.name || task.courierName || rawEmail,
              tasks: [],
            };
          }
          groups[plat].tasks.push(task);
          return groups;
        }, {});

        const resultHubsByPlat = new Map();
        const allDoneRoutingsRaw = (resultsData || [])
          .filter((item) => item.dispatchStatus === 'done' && item.result && item.result.routing)
          .flatMap((item) => item.result.routing);

        allDoneRoutingsRaw.forEach((route) => {
          const plat = route.vehicleName;
          if (plat) {
            const hubs = (route.trips || []).filter((t) => t.isHub);
            if (hubs.length > 0) {
              resultHubsByPlat.set(plat, {
                startHub: hubs.find((t) => t.order === 0),
                endHub: hubs[hubs.length - 1],
              });
            }
          }
        });

        const finalRoutes = Object.values(tasksByPlat).map((group) => {
          const { plat, tasks, email, assigneeName } = group;

          tasks.sort((a, b) => {
            const orderA =
              a.routePlannedOrder !== null && a.routePlannedOrder !== undefined
                ? a.routePlannedOrder
                : Infinity;
            const orderB =
              b.routePlannedOrder !== null && b.routePlannedOrder !== undefined
                ? b.routePlannedOrder
                : Infinity;
            return orderA - orderB;
          });

          const taskTrips = tasks.map((task) => ({
            visitId: task._id || task.taskId,
            routePlannedOrder: task.routePlannedOrder,
            visitName: task.customerOrder || task.customerName || '',

            orderId: task.orderId,
            flow: task.flow,
            warehouseName: task.flow === 'Pickup' ? task['warehouseName-1'] : '',
            locationName: task.locationName || null,

            openTime: task.openTime,
            closeTime: task.closeTime,
            eta: task.eta,
            etd: task.etd,
            weight: task.weightKg,
            volume: task.volumeCbm,
            isHub: false,
            isManual: task.routePlannedOrder === null || task.routePlannedOrder === undefined,
          }));

          const hubData = resultHubsByPlat.get(plat);
          const finalTrips = [];

          if (hubData?.startHub) {
            finalTrips.push({ ...hubData.startHub, isHub: true, visitName: 'HUB' });
          }

          finalTrips.push(...taskTrips);

          if (hubData?.endHub) {
            finalTrips.push({ ...hubData.endHub, isHub: true, visitName: 'HUB' });
          }

          return {
            vehicleId: plat,
            vehicleName: plat,
            assignee: email,
            assigneeName: assigneeName,
            trips: finalTrips,
          };
        });

        finalRoutes.sort((a, b) => {
          const getStartEtd = (route) => {
            const firstHub = route.trips?.find((t) => t.isHub);
            return firstHub?.etd || null;
          };
          const etdA = getStartEtd(a);
          const etdB = getStartEtd(b);
          if (!etdA && etdB) return 1;
          if (etdA && !etdB) return -1;
          if (!etdA && !etdB) return 0;
          if (etdA < etdB) return -1;
          if (etdA > etdB) return 1;
          return 0;
        });

        setAllRoutes(finalRoutes);

        if (finalRoutes.length > 0) {
          setActiveVehicleId(finalRoutes[0].vehicleId);
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
  }, [selectedDate, t]);

  const enrichedRoutes = useMemo(() => {
    if (isEmpty(allRoutes)) return [];

    const soTracker = {};
    allRoutes.forEach((route) => {
      route.trips.forEach((trip) => {
        if (trip.isHub || !trip.orderId) return;
        const individualSOs = trip.orderId
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        individualSOs.forEach((so) => {
          if (!soTracker[so]) soTracker[so] = { Pickup: null, Delivery: null };
          soTracker[so][trip.flow] = route.vehicleName;
        });
      });
    });

    const pairToLetter = {};
    let currentLetterCode = 65; // Dimulai dari 'A'

    return allRoutes.map((route) => {
      const tripsWithSyncStatus = route.trips.map((trip) => {
        if (trip.isHub || !trip.orderId) return trip;

        const pickupVehicle = soTracker[trip.orderId]?.Pickup;
        const deliveryVehicle = soTracker[trip.orderId]?.Delivery;
        const isUnsync = pickupVehicle && deliveryVehicle && pickupVehicle !== deliveryVehicle;

        let partnerVehicle = null;
        let groupLetter = null;

        if (isUnsync) {
          partnerVehicle = trip.flow === 'Pickup' ? deliveryVehicle : pickupVehicle;

          const pairKey = [route.vehicleName, partnerVehicle].sort().join('|');

          if (!pairToLetter[pairKey]) {
            pairToLetter[pairKey] = String.fromCharCode(currentLetterCode);
            currentLetterCode++;
          }
          groupLetter = pairToLetter[pairKey];
        }

        return { ...trip, isUnsync, partnerVehicle, groupLetter };
      });

      const uniqueLetters = [
        ...new Set(tripsWithSyncStatus.map((t) => t.groupLetter).filter(Boolean)),
      ];

      return {
        ...route,
        trips: tripsWithSyncStatus,
        hasManual: tripsWithSyncStatus.some((t) => t.isManual),
        hasUnsync: tripsWithSyncStatus.some((t) => t.isUnsync),
        groupLetters: uniqueLetters,
      };
    });
  }, [allRoutes]);

  const filteredVehicleRoutes = useMemo(() => {
    let routes = enrichedRoutes;

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      routes = routes
        .map((route) => {
          const driverName = (getDriverName(route, driverData) || '').toLowerCase();
          const vehicleName = (route.vehicleName || '').toLowerCase();
          const vehicleId = (route.vehicleId || '').toLowerCase();

          if (
            driverName.includes(lowerQuery) ||
            vehicleName.includes(lowerQuery) ||
            vehicleId.includes(lowerQuery)
          ) {
            return route;
          }

          const matchingTrips = route.trips.filter((trip) => {
            const vName = (trip.visitName || '').toLowerCase();
            const so = (trip.orderId || '').toLowerCase();
            const warehouse = (trip.warehouseName || '').toLowerCase();

            return (
              vName.includes(lowerQuery) ||
              so.includes(lowerQuery) ||
              warehouse.includes(lowerQuery)
            );
          });

          if (matchingTrips.length > 0) {
            return { ...route, trips: matchingTrips };
          }
          return null;
        })
        .filter(Boolean);
    }

    return [...routes].sort((a, b) => {
      const getStartEtd = (route) => {
        const firstHub = route.trips?.find((t) => t.isHub);
        return firstHub?.etd || null;
      };

      const etdA = getStartEtd(a);
      const etdB = getStartEtd(b);

      if (!etdA && etdB) return 1;
      if (etdA && !etdB) return -1;
      if (!etdA && !etdB) return 0;

      if (etdA < etdB) return -1;
      if (etdA > etdB) return 1;
      return 0;
    });
  }, [searchQuery, enrichedRoutes, driverData]);

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
    <CustomDatePicker
      id="estimasiDate"
      isLoading={isLoading}
      onChange={handleDateChange}
      selected={selectedDate ? new Date(selectedDate) : new Date()}
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

  const excelDownloadButton = (
    <div className="w-full z-50 relative" ref={excelDropdownRef}>
      <DownloadButton
        disabled={isLoading || isAnyDownloading || isEmpty(filteredVehicleRoutes)}
        isLoading={isDownloadingExcel}
        onClick={() => setIsExcelDropdownOpen((prev) => !prev)}
        text={t('common.download_excel')}
      />

      {isExcelDropdownOpen && (
        <div className="absolute right-0 mt-2 bg-white rounded-md shadow-xl border border-gray-200 z-10 p-4 animate-in fade-in zoom-in-95 duration-100 w-full">
          <p className="text-[10px] font-bold text-gray-400 uppercase mb-3 tracking-wider">
            Filter
          </p>
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={excelFilter.dry}
                onChange={() => setExcelFilter((prev) => ({ ...prev, dry: !prev.dry }))}
                className="w-4 h-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
              />
              <span className="text-sm text-gray-700 group-hover:text-sky-600 transition-colors">
                Dry
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={excelFilter.frozen}
                onChange={() => setExcelFilter((prev) => ({ ...prev, frozen: !prev.frozen }))}
                className="w-4 h-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
              />
              <span className="text-sm text-gray-700 group-hover:text-sky-600 transition-colors">
                Frozen
              </span>
            </label>

            <button
              onClick={() => {
                setIsExcelDropdownOpen(false);
                const routesToDownload = filteredVehicleRoutes.filter((route) => {
                  const driverName = getDriverName(route, driverData);
                  const isDry = driverName.includes("'DRY'");
                  const isFrz = driverName.includes("'FRZ'");
                  if (excelFilter.dry && excelFilter.frozen) return true;
                  if (excelFilter.dry && isDry) return true;
                  if (excelFilter.frozen && isFrz) return true;
                  return false;
                });

                let filePrefix = '';
                if (excelFilter.dry && !excelFilter.frozen) filePrefix = 'DRY';
                if (!excelFilter.dry && excelFilter.frozen) filePrefix = 'FRZ';

                handleConfirmDownload({
                  filteredVehicleRoutes: routesToDownload,
                  setIsDownloading: setIsDownloadingExcel, // Set loading state excel
                  t,
                  driverData,
                  fileNamePrefix: filePrefix,
                });
              }}
              disabled={!excelFilter.dry && !excelFilter.frozen}
              className="mt-2 px-4 h-[38px] bg-sky-600 text-white text-xs font-semibold rounded-md hover:bg-sky-700 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              {t('common.download')}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const deliveryDownloadButton = (
    <DownloadButton
      disabled={isLoading || isAnyDownloading || isEmpty(filteredVehicleRoutes)}
      isLoading={isDownloadingPdf}
      onClick={handleDeliveryDownload}
      text={t('estimation.delivery_form')}
    />
  );

  const headerItems = [
    { label: 'Filter', component: searchBar, hideLabel: false },
    { label: t('common.delivery_date'), component: datePicker, hideLabel: false },
    { label: 'Export Excel', component: excelDownloadButton, hideLabel: true },
    { label: 'Export PDF', component: deliveryDownloadButton, hideLabel: true },
  ];

  const vehicleTabs = useMemo(() => {
    if (!filteredVehicleRoutes) return [];
    return filteredVehicleRoutes.map((route) => {
      const tooltipName = getDriverName(route, driverData);
      const noDriverName = isEmpty(tooltipName);
      let tabClass =
        'cursor-help block w-full h-full rounded px-2 py-0.5 border-2 transition-all relative ';

      if (route.hasManual && route.hasUnsync) {
        tabClass += 'bg-red-100 border-blue-400 text-red-800';
      } else if (route.hasManual) {
        tabClass += 'bg-red-100 border-transparent text-red-800';
      } else if (route.hasUnsync) {
        tabClass += 'bg-transparent border-blue-400 text-gray-700';
      } else {
        tabClass += 'bg-transparent border-transparent';
      }

      return {
        id: route.vehicleId,
        label: (
          <Tooltip tooltipContent={noDriverName ? t('estimation.no_driver') : tooltipName}>
            <span className={tabClass}>
              {route.vehicleName}
              {route.hasUnsync && route.groupLetters.length > 0 && (
                <div className="absolute -top-2 -right-2 bg-blue-400 text-black text-[10px] font-bold px-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center shadow-sm border border-white">
                  {route.groupLetters.join(', ')}
                </div>
              )}
            </span>
          </Tooltip>
        ),
      };
    });
  }, [filteredVehicleRoutes, driverData, t]);

  const subtitle = (
    <>
      {t('estimation.subtitle')}{' '}
      <span className="font-semibold text-sky-600">{t('estimation.subtitle_highlight')}</span>
    </>
  );

  if (!isClient) return null;

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
