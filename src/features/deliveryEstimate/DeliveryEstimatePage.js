'use client';

import Button from '@/components/Button';
import CustomDatePicker from '@/components/CustomDatePicker';
import SearchBar from '@/components/SearchBar';
import StorageTypeFilter from '@/components/StorageTypeFilter';
import Tooltip from '@/components/Tooltip';
import BodyCard from '@/components/card/BodyCard';
import HeaderCard from '@/components/card/HeaderCard';
import { useLanguage } from '@/context/LanguageContext';
import { getLocalStorage, setLocalStorage } from '@/lib/localStorageHandler';
import {
  calculateStartFinishDates,
  convertWibToUtc,
  formatDateUniversal,
  getBasePlate,
  isEmpty,
  normalizeEmail,
  tomorrowDate,
} from '@/lib/utils';
import { pdf } from '@react-pdf/renderer';
import JSZip from 'jszip';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getLocationHistories, getResultsSummary, getTasks } from '../../lib/api';
import { driverTimeStamps, getOrFetchDriverData } from '../../lib/driverDataHelper';
import { toastError, toastSuccess } from '../../lib/toastHelper';
import DeliveryForm from './components/DeliveryForm';
import TableData from './components/TableData';
import { getDriverName, handleConfirmDownload } from './help';

export default function DeliveryEstimatePage() {
  const { t } = useLanguage();

  const [activeVehicleId, setActiveVehicleId] = useState(null);
  const [allRoutes, setAllRoutes] = useState([]);
  const [driverData, setDriverData] = useState({});
  const [storageFilter, setStorageFilter] = useState(['DRY', 'FROZEN']);
  const [isDownloadDropdownOpen, setIsDownloadDropdownOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [timeMap, setTimeMap] = useState(new Map());
  const [isDetailView, setIsDetailView] = useState(false);
  const [emptyMessage, setEmptyMessage] = useState(t('common.no_data'));

  const downloadDropdownRef = useRef(null);
  const isAnyDownloading = isDownloadingExcel || isDownloadingPdf;

  useEffect(() => {
    setIsClient(true);
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);

    const { storedSession } = getLocalStorage();
    if (storedSession && typeof storedSession.isDetailViewEstimasi === 'boolean') {
      setIsDetailView(storedSession.isDetailViewEstimasi);
    }
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
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleView = (isDetail) => {
    setIsDetailView(isDetail);
    const { storedSession } = getLocalStorage();
    if (storedSession) {
      const updatedSession = { ...storedSession, isDetailViewEstimasi: isDetail };
      setLocalStorage('data', updatedSession);
    }
  };

  const handleDeliveryDownload = async () => {
    if (isEmpty(filteredVehicleRoutes)) {
      toastError(t('common.toast.error', { err: t('common.no_data') }));
      return;
    }

    setIsDownloadingPdf(true);
    setIsDownloadDropdownOpen(false);

    try {
      const dateForFilename = formatDateUniversal(selectedDate, 'DD.MM.YYYY');
      const { storedLocationAcronym, storedLocationName } = getLocalStorage();
      const locationName = storedLocationAcronym || storedLocationName;

      const generatePdfBlob = async (route) => {
        const normalizedAssignee = normalizeEmail(route.assignee);
        const realDriverName = getDriverName(route, driverData);

        const timeData = timeMap.get(normalizedAssignee) || { jamBerangkat: '', jamKembali: '' };

        return await pdf(
          <DeliveryForm
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
        link.download = `${t('estimation.delivery_form')} - ${safeName} - ${dateForFilename}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toastSuccess(t('common.toast.success'));
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
        link.download = `${t('estimation.delivery_form')} - ${dateForFilename} - ${locationName}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toastSuccess(t('common.toast.success', { length: generatedFiles.length }));
      }
    } catch (error) {
      toastError(t('common.toast.error', { err: error.message }));
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleExcelDownload = () => {
    setIsDownloadDropdownOpen(false);

    let filePrefix = '';
    if (storageFilter.includes('DRY') && !storageFilter.includes('FROZEN')) filePrefix = 'DRY';
    if (!storageFilter.includes('DRY') && storageFilter.includes('FROZEN')) filePrefix = 'FRZ';

    handleConfirmDownload({
      filteredVehicleRoutes: filteredVehicleRoutes,
      setIsDownloading: setIsDownloadingExcel,
      t,
      driverData,
      fileNamePrefix: filePrefix,
      isDetailView,
    });
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
        const { storedLocation } = getLocalStorage();
        if (!storedLocation) {
          throw new Error(t('common.toast.error', { err: 'Location not found' }));
        }

        const rawDrivers = await getOrFetchDriverData(storedLocation);
        if (isEmpty(rawDrivers)) {
          setEmptyMessage(t('common.no_driver'));
          throw new Error(t('common.no_driver'));
        }
        const dataObj = {};
        const mapObj = new Map();
        if (Array.isArray(rawDrivers)) {
          rawDrivers.forEach((d) => {
            const email = normalizeEmail(d.email);
            dataObj[email] = d;
            mapObj.set(email, getBasePlate(d.plat) || 'Other');
          });
        }
        setDriverData(dataObj);
        const routingDate = new Date(deliveryDateObj);
        if (deliveryDateObj.getDay() === 1) {
          routingDate.setDate(deliveryDateObj.getDate() - 2);
        } else {
          routingDate.setDate(deliveryDateObj.getDate() - 1);
        }

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
            hubId: storedLocation,
            routingDateObj: routingDate,
            deliveryDateObj: deliveryDateObj,
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
            hubId: storedLocation,
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

        const soToWarehouseMap = new Map();
        filteredTasks.forEach((t) => {
          if (t.flow === 'Pickup' && t.orderId) {
            const wh = t['warehouseName-1'] || t.warehouseName || '';
            if (wh) {
              const sos = t.orderId
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
              sos.forEach((so) => soToWarehouseMap.set(so, wh));
            }
          }
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

        resultsData.forEach((route) => {
          const plat = getBasePlate(route.vehicleName);
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

          const taskTrips = tasks.map((task) => {
            const sos = (task.orderId || '')
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
            const soWarehouseMapping = sos.map((so) => ({
              so,
              wh: soToWarehouseMap.get(so) || '',
            }));

            return {
              visitId: task._id || task.taskId,
              routePlannedOrder: task.routePlannedOrder,
              visitName: task.customerOrder || task.customerName || '',
              orderId: task.orderId,
              flow: task.flow,
              warehouseName:
                task.flow === 'Pickup' ? task['warehouseName-1'] || task.warehouseName : '',
              locationName: task.locationName || null,
              openTime: task.openTime,
              closeTime: task.closeTime,
              eta: task.eta,
              etd: task.etd,
              weight: task.weightKg,
              volume: task.volumeCbm,
              isHub: false,
              isManual: task.routePlannedOrder === null || task.routePlannedOrder === undefined,
              isReDelivery: task.flow?.toLowerCase().includes('re delivery'),
              soWarehouseMapping,
            };
          });

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

        const processedTime = driverTimeStamps(historyData, selectedDate);
        setTimeMap(processedTime);
      } catch (err) {
        toastError(t('common.toast.error', { err: err.message }));
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

    return allRoutes.map((route) => {
      const tripsWithSyncStatus = route.trips.map((trip) => {
        if (trip.isHub || !trip.orderId) {
          return {
            ...trip,
            isUnsync: false,
            partnerVehicle: null,
            syncDetails: {},
            hasAnyPartner: false,
            partnerSOs: [],
          };
        }

        const individualSOs = trip.orderId
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

        let isUnsync = false;
        const isRedelivery = trip.flow?.toLowerCase().includes('re delivery');
        let partnerVehicles = new Set();
        const syncDetails = {};

        let hasAnyPartner = false;
        const partnerSOs = [];

        individualSOs.forEach((so) => {
          const pickupVehicle = soTracker[so]?.Pickup;
          const deliveryVehicle = soTracker[so]?.Delivery;
          const hasBothFlows = pickupVehicle && deliveryVehicle;

          if (hasBothFlows) {
            hasAnyPartner = true;
            partnerSOs.push(so);

            const isThisSOUnsync = pickupVehicle !== deliveryVehicle;

            if (isThisSOUnsync) {
              isUnsync = true;
              const partner = trip.flow === 'Pickup' ? deliveryVehicle : pickupVehicle;
              if (partner) {
                partnerVehicles.add(partner);
                syncDetails[so] = partner;
              }
            }
          }
        });

        const partnerVehicle =
          partnerVehicles.size > 0 ? Array.from(partnerVehicles).join(', ') : null;

        return {
          ...trip,
          isUnsync,
          partnerVehicle,
          syncDetails,
          isRedelivery,
          hasAnyPartner,
          partnerSOs,
        };
      });

      return {
        ...route,
        trips: tripsWithSyncStatus,
        hasManual: tripsWithSyncStatus.some((t) => t.isManual),
        hasUnsync: tripsWithSyncStatus.some((t) => t.isUnsync),
        isRedelivery: tripsWithSyncStatus.some((t) => t.isRedelivery),
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

    routes = routes.filter((route) => {
      if (storageFilter.length === 2) return true;
      if (storageFilter.length === 0) return false;

      const driverName = getDriverName(route, driverData);
      const isDry = driverName.includes("'DRY'");
      const isFrz = driverName.includes("'FRZ'");

      if (storageFilter.includes('DRY') && isDry) return true;
      if (storageFilter.includes('FROZEN') && isFrz) return true;

      return false;
    });

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
  }, [searchQuery, enrichedRoutes, driverData, storageFilter]);

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

  const searchBar = (
    <SearchBar
      disabled={isLoading || isAnyDownloading}
      onChange={(val) => setSearchQuery(val)}
      placeholder={t('estimation.search_placeholder')}
      value={searchQuery}
      width="w-full xs:w-40!"
    />
  );

  const storageFilterComponent = (
    <StorageTypeFilter
      selectedTypes={storageFilter}
      onApply={setStorageFilter}
      disabled={isLoading || isAnyDownloading}
      className="w-full xl:w-30!"
    />
  );

  const datePicker = (
    <CustomDatePicker
      id="estimasiDate"
      isLoading={isLoading || isAnyDownloading}
      onChange={handleDateChange}
      selected={selectedDate ? new Date(selectedDate) : new Date()}
      maxDate={tomorrowDate()}
      className="w-full xl:w-40!"
    />
  );

  const viewOptions = [
    { isDetail: false, label: t('estimation.view_summary') },
    { isDetail: true, label: t('estimation.view_detail') },
  ];

  const isToggleDisabled = isLoading || isAnyDownloading;

  const viewToggle = (
    <div className="flex items-center w-full xl:w-auto gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 h-[42px] dark:bg-slate-800 dark:border-slate-700">
      {viewOptions.map((option) => {
        const isActive = isDetailView === option.isDetail;
        return (
          <button
            key={option.isDetail ? 'detail' : 'summary'}
            onClick={() => handleToggleView(option.isDetail)}
            disabled={isToggleDisabled}
            className={`flex-1 xl:flex-none px-3 py-1.5 text-xs font-semibold rounded-md transition-all 
            ${
              isActive
                ? 'bg-white shadow-sm border text-sky-700 dark:bg-sky-600 dark:border-sky-700 dark:text-slate-100 '
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer hover:bg-slate-300/20 dark:hover:bg-slate-900/30'
            }
            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-slate-500 dark:disabled:hover:text-slate-400
          `}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );

  const downloadMenu = (
    <div className="w-full z-50 relative" ref={downloadDropdownRef}>
      <Button
        disabled={isLoading || isAnyDownloading || isEmpty(filteredVehicleRoutes)}
        isLoading={isAnyDownloading}
        onClick={() => setIsDownloadDropdownOpen((prev) => !prev)}
        text={t('common.download')}
      />

      {isDownloadDropdownOpen && (
        <div className="absolute right-0 mt-2 bg-white dark:bg-slate-700 rounded-md shadow-xl border border-gray-200 dark:border-slate-600 z-10 p-2 animate-in fade-in zoom-in-95 duration-100 w-full min-w-40">
          <div className="flex flex-col gap-1">
            <button
              onClick={handleExcelDownload}
              className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer rounded-md text-slate-700 font-medium"
            >
              <span className="text-green-600 dark:text-green-500 font-bold">XLS</span>
              <span className="text-slate-600 dark:text-slate-300">Excel</span>
            </button>

            <button
              onClick={handleDeliveryDownload}
              className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer rounded-md text-slate-700 font-medium border-t border-gray-100 dark:border-slate-600"
            >
              <span className="text-red-600 dark:text-red-500 font-bold">
                {filteredVehicleRoutes.length === 1 ? 'PDF' : 'ZIP'}
              </span>
              <span className="text-slate-600 dark:text-slate-300">
                {t('estimation.delivery_form')}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const headerItems = [
    { label: 'Filter', component: searchBar, hideLabel: false },
    { label: t('common.storage_type'), component: storageFilterComponent, hideLabel: false },
    { label: t('common.delivery_date'), component: datePicker, hideLabel: false },
    { label: t('estimation.view'), component: viewToggle, hideLabel: false },
    { label: 'Export', component: downloadMenu, hideLabel: true },
  ];

  const vehicleTabs = useMemo(() => {
    if (!filteredVehicleRoutes) return [];
    return filteredVehicleRoutes.map((route) => {
      const tooltipName = getDriverName(route, driverData);
      const isRedelivery = route.isRedelivery;
      const isManual = route.hasManual;
      const redeliveryBadge = isRedelivery && '[R]';
      const noDriverName = isEmpty(tooltipName);

      let tabClass =
        'cursor-help block w-full h-full rounded px-2 py-0.5 border-2 transition-all relative ';

      if (isManual) {
        tabClass +=
          'bg-[#E6EEFF] border-[#b3cbfe] text-[#4F76C7] dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-900';
      } else {
        tabClass += 'bg-transparent border-transparent';
      }

      return {
        id: route.vehicleId,
        label: (
          <Tooltip tooltipContent={noDriverName ? t('common.no_driver') : tooltipName}>
            <span className={tabClass}>
              {route.vehicleName}{' '}
              <span className={`text-red-600 dark:text-red-300 `}>{redeliveryBadge}</span>
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
        onTabClick={setActiveVehicleId}
        tabs={vehicleTabs}
        emptyMessage={emptyMessage}
      >
        <div className="bg-white dark:bg-slate-800 rounded-xl h-full flex flex-col border-none transition-colors ">
          <div className="overflow-y-auto grow h-full m-0 border border-gray-300 dark:border-slate-700 rounded-b-xl">
            {!isLoading && activeRoute && (
              <TableData
                activeRoute={activeRoute}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                isDetailView={isDetailView}
                t={t}
              />
            )}
          </div>
        </div>
      </BodyCard>
    </div>
  );
}
