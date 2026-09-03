'use client';
import BodyCard from '@/components/card/BodyCard';
import HeaderCard from '@/components/card/HeaderCard';
import Dropdown from '@/components/dropdown/Dropdown';
import Map from '@/components/Map';
import SearchBar from '@/components/SearchBar';
import { getCachedHubs, getLocalStorage } from '@/lib/localStorageHandler';
import { getDistance } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';

export default function WebhookDashboard() {
  const [webhookData, setWebhookData] = useState(null);
  const [liveDataMap, setLiveDataMap] = useState({});
  const [mapInstance, setMapInstance] = useState(null);
  const [focusedPlate, setFocusedPlate] = useState(null);
  const [imeiToGroupsMap, setImeiToGroupsMap] = useState({});
  const [allVehiclesMaster, setAllVehiclesMaster] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const { storedLocationName } = getLocalStorage();
  const activeGroupFilter = storedLocationName === 'GIIC' ? 'Cikarang' : storedLocationName;
  const cachedHubs = getCachedHubs() || [];
  const activeHubData = cachedHubs.find((h) => h.name === storedLocationName);
  const hubCoords =
    activeHubData?.lat && activeHubData?.lng
      ? { lat: activeHubData.lat, lng: activeHubData.lng }
      : null;
  const hubCoordsString = hubCoords ? `${hubCoords.lat},${hubCoords.lng}` : null;
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentlyUpdated, setRecentlyUpdated] = useState({});
  const hasFetched = useRef(false);
  const prevPositionsRef = useRef({});
  const updateTimeoutsRef = useRef({});

  useEffect(() => {
    const fetchInitialMapping = async () => {
      if (hasFetched.current) return;
      hasFetched.current = true;

      try {
        const cachedStatus = sessionStorage.getItem('mceasy_statuses');
        let jsonStatus = cachedStatus ? JSON.parse(cachedStatus) : null;

        const fetchOptions = {
          headers: {
            Authorization:
              'Bearer bzN0sF5410bwaH5C2P7SXrg96dUki49Q1vr47TBKa5Ja4QN1Dw969baW3S9xCRSU1TY3WGBbJ61bXDd2Ud8dYi3tzSHJVL4daAsJddTHff5uNe00oveafNKox97e6uCqdOLH0H913Qda5e0GJb68tfsKoS1y2Dy',
          },
        };

        if (!jsonStatus) {
          const resStatus = await fetch(
            'https://vsms-v2-public.mceasy.com/v1/vehicles/statuses',
            fetchOptions
          );
          if (resStatus.ok) {
            jsonStatus = await resStatus.json();
            sessionStorage.setItem('mceasy_statuses', JSON.stringify(jsonStatus));
          }
        }

        if (jsonStatus?.data) {
          const mapping = {};
          jsonStatus.data.forEach((vehicle) => {
            if (vehicle.imei) {
              mapping[vehicle.imei] = vehicle.vehicleGroups || [];
            }
          });
          setImeiToGroupsMap(mapping);
          setAllVehiclesMaster(jsonStatus.data);
        }
      } catch (error) {
        console.error(error);
      }
    };

    fetchInitialMapping();
  }, []);

  useEffect(() => {
    const fetchWebhookData = async () => {
      try {
        const res = await fetch(`/webhook-result.json?t=${Date.now()}`);
        const jsonData = await res.json();
        setWebhookData(jsonData);

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

    if (hubCoordsString && v.latitude && v.longitude && statusFilter !== 'All') {
      const vCoordsString = `${v.latitude},${v.longitude}`;
      const distance = getDistance(vCoordsString, hubCoordsString);
      const isInsideHub = distance !== null && distance <= 500;

      if (statusFilter === 'Ongoing' && isInsideHub) return false;
      if (statusFilter === 'Done' && !isInsideHub) return false;
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

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && searchSuggestions.length > 0) {
      handleSelectSuggestion(searchSuggestions[0]);
    }
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

  if (allVehiclesMaster.length === 0)
    return <div className="p-8 text-center text-gray-500">Memuat data armada...</div>;

  const focusedVehicleData = vehicles.find((v) => v.licensePlate === focusedPlate);
  const defaultCenter =
    vehicles.length > 0 && !isNaN(parseFloat(vehicles[0].latitude))
      ? [parseFloat(vehicles[0].latitude), parseFloat(vehicles[0].longitude)]
      : [-6.2, 106.8];

  const headerItems = [
    {
      label: 'Cari Kendaraan',
      component: (
        <div
          className="relative w-full xl:w-64"
          onKeyDown={handleSearchKeyDown}
          onFocusCapture={() => setShowSuggestions(true)}
        >
          <SearchBar
            value={searchQuery}
            onChange={(val) => {
              setSearchQuery(val);
              setShowSuggestions(true);
            }}
            placeholder="Cari driver / plat nomor"
            tooltip="Cari driver / plat nomor"
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
            { label: 'Semua (All)', value: 'All' },
            { label: 'Ongoing (Luar Hub)', value: 'Ongoing' },
            { label: 'Done (Dalam Hub)', value: 'Done' },
          ]}
          value={statusFilter}
          onChange={setStatusFilter}
          className="w-full xl:w-48!"
        />
      ),
    },
  ];

  return (
    <div className="w-full px-4 sm:px-6 h-[calc(100vh-100px)] flex flex-col">
      <HeaderCard
        title="Status Lokasi Armada"
        subtitle="Pembaruan otomatis dari Webhook"
        items={headerItems}
      />
      <BodyCard isLoading={false} isEmpty={false}>
        {vehicles.length > 0 ? (
          <div className="h-full w-full relative z-0">
            {focusedVehicleData && (
              <div className="absolute bottom-4 right-4 z-400 bg-white/95 backdrop-blur px-3 py-2 rounded shadow-md border border-gray-200 w-52 pointer-events-none text-xs">
                <h3 className="font-bold text-gray-800 border-b pb-1 mb-1.5">
                  Info: {focusedVehicleData.licensePlate}
                </h3>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Storage:</span>{' '}
                    <span className="font-semibold truncate ml-2">
                      {focusedVehicleData.hullNo || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Sopir:</span>{' '}
                    <span className="font-semibold truncate ml-2">
                      {focusedVehicleData.driver1?.fullname || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status:</span>{' '}
                    <span
                      className={`font-semibold ${focusedVehicleData.engineOn ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {focusedVehicleData.engineOn ? 'Menyala' : 'Mati'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Speed:</span>{' '}
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
                      >
                        <rl.Tooltip
                          permanent
                          direction="top"
                          offset={[0, -15]}
                          className="font-bold text-xs"
                        >
                          {storedLocationName}
                        </rl.Tooltip>
                      </rl.Marker>
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
                    </>
                  )}
                  {vehicles.map((v) => {
                    const lat = parseFloat(v.latitude);
                    const lng = parseFloat(v.longitude);
                    if (isNaN(lat) || isNaN(lng)) return null;

                    const isThisFocused = focusedPlate === v.licensePlate;
                    const isUpdated = !!recentlyUpdated[v.imei];

                    return (
                      <rl.Marker
                        key={v.imei || v.licensePlate}
                        position={[lat, lng]}
                        icon={icons.circle(
                          '🚚',
                          isThisFocused ? 'bg-red-600' : isUpdated ? 'bg-green-500' : 'bg-blue-600',
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
                        {isThisFocused && (
                          <rl.Tooltip
                            permanent
                            direction="top"
                            offset={[0, -15]}
                            className="font-bold text-xs"
                          >
                            {v.licensePlate}
                          </rl.Tooltip>
                        )}
                      </rl.Marker>
                    );
                  })}
                </>
              )}
            </Map>
          </div>
        ) : (
          <div className="h-full w-full bg-gray-50 dark:bg-slate-800 flex items-center justify-center">
            <span className="text-gray-500">Tidak ada kendaraan di cabang ini</span>
          </div>
        )}
      </BodyCard>
    </div>
  );
}
