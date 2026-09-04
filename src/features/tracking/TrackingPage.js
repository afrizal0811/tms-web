'use client';
import BodyCard from '@/components/card/BodyCard';
import HeaderCard from '@/components/card/HeaderCard';
import Dropdown from '@/components/dropdown/Dropdown';
import StorageTypeFilter from '@/components/dropdown/StorageTypeFilter';
import Map from '@/components/Map';
import SearchBar from '@/components/SearchBar';
import { useLanguage } from '@/context/LanguageContext';
import { getMCEasyData, getTrackingData } from '@/lib/api';
import { getCachedHubs, getLocalStorage } from '@/lib/localStorageHandler';
import { getDistance } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';

export default function TrackingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [liveDataMap, setLiveDataMap] = useState({});
  const [mapInstance, setMapInstance] = useState(null);
  const [focusedPlate, setFocusedPlate] = useState(null);
  const [imeiToGroupsMap, setImeiToGroupsMap] = useState({});
  const [allVehiclesMaster, setAllVehiclesMaster] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedStorageTypes, setSelectedStorageTypes] = useState(['DRY', 'FROZEN']);
  const { storedLocationName } = getLocalStorage();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentlyUpdated, setRecentlyUpdated] = useState({});
  const [isHubHovered, setIsHubHovered] = useState(false);

  const { t } = useLanguage();
  const hasFetched = useRef(false);
  const prevPositionsRef = useRef({});
  const updateTimeoutsRef = useRef({});
  const hasFittedBounds = useRef(false);

  const activeGroupFilter = storedLocationName === 'GIIC' ? 'Cikarang' : storedLocationName;
  const cachedHubs = getCachedHubs() || [];
  const activeHubData = cachedHubs.find((h) => h.name === storedLocationName);
  const hubCoords =
    activeHubData?.lat && activeHubData?.lng
      ? { lat: activeHubData.lat, lng: activeHubData.lng }
      : null;
  const hubCoordsString = hubCoords ? `${hubCoords.lat},${hubCoords.lng}` : null;

  useEffect(() => {
    const fetchInitialMapping = async () => {
      if (hasFetched.current) return;
      hasFetched.current = true;

      try {
        const cachedStatus = localStorage.getItem('mceasy_statuses');
        const cacheTime = localStorage.getItem('mceasy_statuses_time');
        const isCacheValid = cacheTime && Date.now() - parseInt(cacheTime) < 12 * 60 * 60 * 1000;

        let vehiclesArray = cachedStatus && isCacheValid ? JSON.parse(cachedStatus) : null;

        if (!vehiclesArray || vehiclesArray.length === 0) {
          try {
            const response = await getMCEasyData('/vehicles/statuses');
            vehiclesArray = Array.isArray(response) ? response : response?.data || [];

            localStorage.setItem('mceasy_statuses', JSON.stringify(vehiclesArray));
            localStorage.setItem('mceasy_statuses_time', Date.now().toString());
          } catch (apiError) {
            if (apiError.status === 429 && cachedStatus) {
              vehiclesArray = JSON.parse(cachedStatus);
            } else {
              throw apiError;
            }
          }
        }

        if (vehiclesArray && Array.isArray(vehiclesArray)) {
          const mapping = {};
          vehiclesArray.forEach((vehicle) => {
            if (vehicle.imei) {
              mapping[vehicle.imei] = vehicle.vehicleGroups || [];
            }
          });
          setImeiToGroupsMap(mapping);
          setAllVehiclesMaster(vehiclesArray);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialMapping();
  }, []);

  useEffect(() => {
    const fetchWebhookData = async () => {
      try {
        const jsonData = await getTrackingData();

        const entries = Object.values(jsonData).filter(
          (entry) => entry && entry.event && entry.event.data
        );

        setLiveDataMap((prev) => {
          const updated = { ...prev };
          entries.forEach((entry) => {
            const vd = entry.event.data;
            if (vd && vd.imei) {
              const prevPos = prevPositionsRef.current[vd.imei];
              const newLat = parseFloat(vd.latitude);
              const newLng = parseFloat(vd.longitude);
              const changed = !prevPos || prevPos.lat !== newLat || prevPos.lng !== newLng;

              if (changed) {
                prevPositionsRef.current[vd.imei] = { lat: newLat, lng: newLng };

                setRecentlyUpdated((r) => ({
                  ...r,
                  [vd.imei]: Date.now(),
                }));

                if (updateTimeoutsRef.current[vd.imei]) {
                  clearTimeout(updateTimeoutsRef.current[vd.imei]);
                }
                updateTimeoutsRef.current[vd.imei] = setTimeout(() => {
                  setRecentlyUpdated((r) => {
                    const copy = { ...r };
                    delete copy[vd.imei];
                    return copy;
                  });
                }, 5000);
              }

              updated[vd.imei] = vd;
            }
          });
          return updated;
        });
      } catch (error) {
        console.error(error);
      }
    };
    fetchWebhookData();
    const interval = setInterval(fetchWebhookData, 5000);
    return () => clearInterval(interval);
  }, []);

  const mergedVehicles = allVehiclesMaster.map((v) => {
    const live = liveDataMap[v.imei];
    if (live) {
      return {
        ...v,
        latitude: live.latitude,
        longitude: live.longitude,
        speed: live.speed,
        direction: live.direction,
        engineOn: live.engine_on,
        driver1: { ...v.driver1, fullname: live.driver || v.driver1?.fullname },
        hullNo: live.hull_no || v.hullNo,
        licensePlate: live.license_plate || v.licensePlate,
      };
    }
    return v;
  });

  const vehicles = mergedVehicles.filter((v) => {
    const groups = v.vehicleGroups || imeiToGroupsMap[v.imei] || [];
    if (activeGroupFilter && !groups.includes(activeGroupFilter)) return false;

    const sType = v.hullNo ? v.hullNo.toUpperCase() : '';
    const isDry = sType.includes('DRY');
    const isFrozen = sType.includes('FRZ') || sType.includes('FROZEN');

    if (selectedStorageTypes.length === 1) {
      if (selectedStorageTypes.includes('DRY') && !isDry) return false;
      if (selectedStorageTypes.includes('FROZEN') && !isFrozen) return false;
    }

    if (hubCoordsString && v.latitude && v.longitude && statusFilter !== 'All') {
      const vCoordsString = `${v.latitude},${v.longitude}`;
      const distance = getDistance(vCoordsString, hubCoordsString);
      const isInsideHub = distance !== null && distance <= 500;

      if (statusFilter === t('common.status.ongoing') && isInsideHub) return false;
      if (statusFilter === t('common.status.done') && !isInsideHub) return false;
    }

    return true;
  });

  const searchSuggestions =
    searchQuery.trim().length > 0
      ? vehicles
          .filter((v) => {
            const q = searchQuery.toLowerCase();
            return (
              v.licensePlate?.toLowerCase().includes(q) ||
              v.driver1?.fullname?.toLowerCase().includes(q)
            );
          })
          .slice(0, 8)
      : [];

  const handleSelectSuggestion = (v) => {
    setFocusedPlate(v.licensePlate);
    setSearchQuery(v.licensePlate);
    setShowSuggestions(false);
  };

  const targetVehicleFocus = focusedPlate
    ? vehicles.find((v) => v.licensePlate === focusedPlate)
    : null;
  const targetLat = targetVehicleFocus ? parseFloat(targetVehicleFocus.latitude) : null;
  const targetLng = targetVehicleFocus ? parseFloat(targetVehicleFocus.longitude) : null;

  useEffect(() => {
    if (
      focusedPlate &&
      mapInstance &&
      targetLat !== null &&
      targetLng !== null &&
      !isNaN(targetLat) &&
      !isNaN(targetLng)
    ) {
      mapInstance.setView([targetLat, targetLng], 17, { animate: true });
    }
  }, [focusedPlate, mapInstance, targetLat, targetLng]);

  useEffect(() => {
    if (mapInstance && vehicles.length > 0 && !hasFittedBounds.current) {
      const latlngs = vehicles
        .map((v) => [parseFloat(v.latitude), parseFloat(v.longitude)])
        .filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng));

      if (latlngs.length > 0) {
        mapInstance.fitBounds(latlngs, { padding: [50, 50], maxZoom: 16 });
        hasFittedBounds.current = true;
      }
    }
  }, [mapInstance, vehicles]);

  const focusedVehicleData = vehicles.find((v) => v.licensePlate === focusedPlate);
  const defaultCenter = [-6.2, 106.8];

  const headerItems = [
    {
      label: t('common.search'),
      component: (
        <div className="relative w-full xl:w-64" onFocusCapture={() => setShowSuggestions(true)}>
          <SearchBar
            value={searchQuery}
            onChange={(val) => {
              setSearchQuery(val);
              setShowSuggestions(true);
            }}
            placeholder={t('common.search')}
            tooltip={`${t('common.license_number')}, ${t('common.driver')}`}
            className="w-full"
            width="w-full"
          />
          {showSuggestions && searchSuggestions.length > 0 && (
            <ul className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-slate-800 rounded shadow-md z-50 max-h-48 overflow-y-auto text-xs text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-slate-700">
              {searchSuggestions.map((v) => (
                <li
                  key={v.imei || v.licensePlate}
                  className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer"
                  onClick={() => handleSelectSuggestion(v)}
                >
                  {v.licensePlate} - {v.driver1?.fullname || '-'}
                </li>
              ))}
            </ul>
          )}
        </div>
      ),
    },
    {
      label: 'Status',
      component: (
        <Dropdown
          options={[
            { label: t('common.all'), value: t('common.all') },
            { label: t('common.status.ongoing'), value: t('common.status.ongoing') },
            { label: t('common.status.done'), value: t('common.status.done') },
          ]}
          value={statusFilter}
          onChange={setStatusFilter}
          className="w-full xl:w-48!"
        />
      ),
    },
    {
      label: t('common.storage_type'),
      component: (
        <StorageTypeFilter
          selectedTypes={selectedStorageTypes}
          onApply={setSelectedStorageTypes}
          className="w-full xl:w-48!"
        />
      ),
    },
  ];

  return (
    <div className="w-full px-4 sm:px-6 h-[calc(100vh-100px)] flex flex-col">
      <HeaderCard
        title={t('tracking.title')}
        subtitle={
          <>
            {t('tracking.subtitle')}{' '}
            <span className="font-semibold text-sky-600">{t('tracking.subtitle_highlight')}</span>
          </>
        }
        items={headerItems}
      />
      <BodyCard isLoading={isLoading} isEmpty={vehicles.length === 0} isScroll={false}>
        <div className="h-full w-full relative z-0">
          {focusedVehicleData && (
            <div className="absolute bottom-4 right-4 z-400 bg-white/95 backdrop-blur px-3 py-2 rounded shadow-md border border-gray-200 w-65 h-auto pointer-events-none text-xs">
              <h3 className="text-[15px] font-bold text-gray-800 border-b pb-1 mb-1.5">
                {focusedVehicleData.licensePlate}
              </h3>
              <div className="space-y-1 flex justify-between">
                <div className="flex flex-col gap-2">
                  <span className="text-gray-500">{t('common.driver')}</span>
                  <span className="text-gray-500">{t('common.storage_type')}</span>
                  <span className="text-gray-500">{t('tracking.engine_status')}</span>
                  <span className="text-gray-500">{t('common.speed')}</span>
                </div>
                <div className="flex flex-col gap-2 text-right">
                  <span className="font-semibold truncate ">
                    {focusedVehicleData.driver1?.fullname || '-'}
                  </span>
                  <span className="font-semibold truncate">{focusedVehicleData.hullNo || '-'}</span>
                  <span
                    className={`font-semibold ${focusedVehicleData.engineOn ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {focusedVehicleData.engineOn ? 'ON' : 'OFF'}
                  </span>
                  <span className="font-semibold">{focusedVehicleData.speed || 0} km/h</span>
                </div>
              </div>
            </div>
          )}

          <Map center={defaultCenter} zoom={14} onMapReady={setMapInstance}>
            {(rl, L, icons) => (
              <>
                {hubCoords && (
                  <>
                    <rl.Marker
                      position={[hubCoords.lat, hubCoords.lng]}
                      icon={icons.circle('🏢', 'bg-black', 'text-sm', 'border-white')}
                      eventHandlers={{
                        mouseover: () => setIsHubHovered(true),
                        mouseout: () => setIsHubHovered(false),
                      }}
                    >
                      <rl.Tooltip
                        permanent={false}
                        direction="top"
                        offset={[0, -15]}
                        className="font-bold text-xs"
                      >
                        Hub
                      </rl.Tooltip>
                    </rl.Marker>
                    {isHubHovered && (
                      <rl.Circle
                        center={[hubCoords.lat, hubCoords.lng]}
                        radius={500}
                        pathOptions={{
                          color: 'black',
                          fillColor: 'black',
                          fillOpacity: 0.1,
                          dashArray: '5, 10',
                        }}
                      />
                    )}
                  </>
                )}
                {vehicles.map((v) => {
                  const lat = parseFloat(v.latitude);
                  const lng = parseFloat(v.longitude);
                  if (isNaN(lat) || isNaN(lng)) return null;

                  const isThisFocused = focusedPlate === v.licensePlate;
                  const isUpdated = !!recentlyUpdated[v.imei];

                  const dir = v.direction || 0;
                  const isEast = dir > 0 && dir < 180;
                  const flip = isEast ? -1 : 1;
                  const rot = isEast ? dir - 90 : dir - 270;

                  const sType = v.hullNo ? v.hullNo.toUpperCase() : '';
                  const isDry = sType.includes('DRY');
                  const baseColor = isDry ? 'bg-orange-500' : 'bg-blue-600';

                  return (
                    <rl.Marker
                      key={v.imei || v.licensePlate}
                      position={[lat, lng]}
                      icon={icons.circle(
                        `<div style="transform: rotate(${rot}deg) scaleX(${flip}); display: inline-block; transition: transform 0.3s ease;">🚚</div>`,
                        isThisFocused ? 'bg-red-600' : isUpdated ? 'bg-green-500' : baseColor,
                        'text-sm',
                        isThisFocused
                          ? 'border-red-200'
                          : isUpdated
                            ? 'border-green-200'
                            : 'border-white'
                      )}
                      eventHandlers={{
                        click: () => {
                          setFocusedPlate((prev) =>
                            prev === v.licensePlate ? null : v.licensePlate
                          );
                        },
                      }}
                    >
                      <rl.Tooltip
                        permanent={isThisFocused}
                        direction="top"
                        offset={[0, -15]}
                        className="font-bold text-xs"
                      >
                        {v.licensePlate}
                      </rl.Tooltip>
                    </rl.Marker>
                  );
                })}
              </>
            )}
          </Map>
        </div>
      </BodyCard>
    </div>
  );
}
