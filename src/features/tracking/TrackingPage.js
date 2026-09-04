'use client';
import BodyCard from '@/components/card/BodyCard';
import HeaderCard from '@/components/card/HeaderCard';
import Dropdown from '@/components/dropdown/Dropdown';
import StorageTypeFilter from '@/components/dropdown/StorageTypeFilter';
import Map from '@/components/Map';
import SearchBar from '@/components/SearchBar';
import { useLanguage } from '@/context/LanguageContext';
import { getTrackingData } from '@/lib/api';
import { getDriverData } from '@/lib/driverData';
import { getCachedHubs, getLocalStorage } from '@/lib/localStorageHandler';
import { getBasePlate, getDistance, getStorageType } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';

const parseCoords = (v) => [parseFloat(v.latitude), parseFloat(v.longitude)];

export default function TrackingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [liveDataMap, setLiveDataMap] = useState({});
  const [mapInstance, setMapInstance] = useState(null);
  const [focusedPlate, setFocusedPlate] = useState(null);
  const [allVehiclesMaster, setAllVehiclesMaster] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedStorageTypes, setSelectedStorageTypes] = useState(['DRY', 'FROZEN']);
  const { storedLocation } = getLocalStorage();
  const [recentlyUpdated, setRecentlyUpdated] = useState({});
  const [isHubHovered, setIsHubHovered] = useState(false);
  const [hubCoord, setHubCoord] = useState({ lat: null, lng: null });
  const { t } = useLanguage();
  const hasFetched = useRef(false);
  const prevPositionsRef = useRef({});
  const updateTimeoutsRef = useRef({});
  const hasFittedBounds = useRef(false);

  useEffect(() => {
    const fetchMasterData = async () => {
      if (hasFetched.current) return;
      hasFetched.current = true;

      try {
        const drivers = await getDriverData(storedLocation);
        if (drivers && Array.isArray(drivers)) {
          setAllVehiclesMaster(drivers);
        }
        const cachedHubs = getCachedHubs() || [];
        const activeHubData = cachedHubs.find((h) => h._id === storedLocation);
        if (activeHubData) {
          setHubCoord({ lat: activeHubData.lat, lng: activeHubData.lng });
        } else {
          setHubCoord({ lat: null, lng: null });
        }
      } catch (error) {
        console.error('Gagal mengambil data master driver:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMasterData();
  }, [storedLocation]);

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
            if (vd && vd.license_plate) {
              const stdPlate = getBasePlate(vd.license_plate);
              const prevPos = prevPositionsRef.current[stdPlate];
              const newLat = parseFloat(vd.latitude);
              const newLng = parseFloat(vd.longitude);
              const changed = !prevPos || prevPos.lat !== newLat || prevPos.lng !== newLng;

              if (changed) {
                prevPositionsRef.current[stdPlate] = { lat: newLat, lng: newLng };

                setRecentlyUpdated((r) => ({
                  ...r,
                  [stdPlate]: Date.now(),
                }));

                if (updateTimeoutsRef.current[stdPlate]) {
                  clearTimeout(updateTimeoutsRef.current[stdPlate]);
                }
                updateTimeoutsRef.current[stdPlate] = setTimeout(() => {
                  setRecentlyUpdated((r) => {
                    const copy = { ...r };
                    delete copy[stdPlate];
                    return copy;
                  });
                }, 5000);
              }

              updated[stdPlate] = vd;
            }
          });
          return updated;
        });
      } catch (error) {}
    };
    fetchWebhookData();
    const interval = setInterval(fetchWebhookData, 5000);
    return () => clearInterval(interval);
  }, []);

  const mergedVehicles = allVehiclesMaster.map((v) => {
    const stdPlate = getBasePlate(v.plat);
    const live = liveDataMap[stdPlate];
    if (live) {
      return {
        ...v,
        latitude: live.latitude,
        longitude: live.longitude,
        speed: live.speed,
        direction: live.direction,
        engineOn: live.engine_on,
        driverName: live.driver || v.name,
      };
    }
    return { ...v, driverName: v.name };
  });

  const vehicles = mergedVehicles.filter((v) => {
    if (!v.latitude || !v.longitude) return false;

    const storage = getStorageType(v.type || v.storage || '');

    if (selectedStorageTypes.length === 1) {
      if (selectedStorageTypes.includes('DRY') && storage !== 'Dry') return false;
      if (selectedStorageTypes.includes('FROZEN') && storage !== 'Frozen') return false;
    }

    if (statusFilter !== 'All') {
      const vCoordsString = `${v.latitude},${v.longitude}`;
      const distance = getDistance(vCoordsString, `${hubCoord.lat},${hubCoord.lng}`);
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
            return v.plat?.toLowerCase().includes(q) || v.driverName?.toLowerCase().includes(q);
          })
          .slice(0, 8)
      : [];

  const handleSelectSuggestion = (v) => {
    setFocusedPlate(v.plat);
    setSearchQuery(v.plat);
  };

  const targetVehicleFocus = focusedPlate ? vehicles.find((v) => v.plat === focusedPlate) : null;
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
      const latlngs = vehicles.map(parseCoords).filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng));

      if (latlngs.length > 0) {
        mapInstance.fitBounds(latlngs, { padding: [50, 50], maxZoom: 16 });
        hasFittedBounds.current = true;
      }
    }
  }, [mapInstance, vehicles]);

  const focusedVehicleData = vehicles.find((v) => v.plat === focusedPlate);
  const defaultCenter = [-6.2, 106.8];

  const headerItems = [
    {
      label: t('common.search'),
      component: (
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={t('common.search')}
          tooltip={`${t('common.license_number')}, ${t('common.driver')}`}
          className="w-full"
          width="w-full xl:w-64"
          suggestions={searchSuggestions.map((v) => ({
            key: v._id || v.plat,
            label: `${v.plat} - ${v.driverName || '-'}`,
            raw: v,
          }))}
          onSelectSuggestion={handleSelectSuggestion}
        />
      ),
    },
    {
      label: t('common.status.delivery_status'),
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
                {focusedVehicleData.plat}
              </h3>
              <div className="space-y-1 flex justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <span className="text-gray-500">{t('common.driver')}</span>
                  <span className="text-gray-500">{t('common.storage_type')}</span>
                  <span className="text-gray-500">{t('tracking.engine_status')}</span>
                  <span className="text-gray-500">{t('common.speed')}</span>
                </div>
                <div className="flex flex-col gap-2 text-right">
                  <span className="font-semibold truncate ">
                    {focusedVehicleData.driverName || '-'}
                  </span>
                  <span className="font-semibold truncate">
                    {focusedVehicleData.storage || '-'}
                  </span>
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
                {hubCoord && (
                  <>
                    <rl.Marker
                      position={[hubCoord.lat, hubCoord.lng]}
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
                        center={[hubCoord.lat, hubCoord.lng]}
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
                  const [lat, lng] = parseCoords(v);
                  if (isNaN(lat) || isNaN(lng)) return null;

                  const isThisFocused = focusedPlate === v.plat;
                  const stdPlate = getBasePlate(v.plat);
                  const isUpdated = !!recentlyUpdated[stdPlate];

                  const dir = v.direction || 0;
                  const isEast = dir > 0 && dir < 180;
                  const flip = isEast ? -1 : 1;
                  const rot = isEast ? dir - 90 : dir - 270;

                  const storage = getStorageType(v.type || v.storage || '');
                  const baseColor = storage === 'Dry' ? 'bg-orange-500' : 'bg-blue-600';

                  return (
                    <rl.Marker
                      key={v._id || v.plat}
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
                          setFocusedPlate((prev) => (prev === v.plat ? null : v.plat));
                        },
                      }}
                    >
                      <rl.Tooltip
                        permanent={isThisFocused}
                        direction="top"
                        offset={[0, -15]}
                        className="font-bold text-xs"
                      >
                        {v.plat}
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
