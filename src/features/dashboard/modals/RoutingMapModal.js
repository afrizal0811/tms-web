'use client';

import BaseModal from '@/components/BaseModal';
import { parseCoordinates, parseCustomerString } from '@/lib/utils';
import L from 'leaflet';
import { useCallback, useEffect, useMemo, useState } from 'react';
import MapViewSection from '../components/MapViewSection';

export default function RoutingMapModal({ isOpen, onClose, data }) {
  // State untuk input user
  const [userSelectedDriver, setUserSelectedDriver] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');

  // State pelacak untuk pola "Adjust State during Render"
  const [prevDriver, setPrevDriver] = useState(null);

  const [mapRo, setMapRo] = useState(null);
  const [mapReal, setMapReal] = useState(null);

  // --- Logic Sync Map ---
  useEffect(() => {
    if (!mapRo || !mapReal) return;
    let isSyncing = false;
    const syncRoToReal = () => {
      if (isSyncing) return;
      isSyncing = true;
      mapReal.setView(mapRo.getCenter(), mapRo.getZoom(), { animate: false });
      isSyncing = false;
    };
    const syncRealToRo = () => {
      if (isSyncing) return;
      isSyncing = true;
      mapRo.setView(mapReal.getCenter(), mapReal.getZoom(), { animate: false });
      isSyncing = false;
    };
    mapRo.on('move', syncRoToReal);
    mapReal.on('move', syncRealToRo);
    return () => {
      mapRo.off('move', syncRoToReal);
      mapReal.off('move', syncRealToRo);
    };
  }, [mapRo, mapReal]);

  // --- Logic Drivers ---
  const drivers = useMemo(() => {
    if (!data) return [];
    const unique = new Set(data.map((d) => d.driver).filter(Boolean));
    return Array.from(unique).sort();
  }, [data]);

  // --- Derived State: Selected Driver ---
  const selectedDriver = useMemo(() => {
    if (userSelectedDriver && drivers.includes(userSelectedDriver)) {
      return userSelectedDriver;
    }
    return drivers.length > 0 ? drivers[0] : '';
  }, [userSelectedDriver, drivers]);

  // --- Adjust Customer State saat Driver Berubah (Render Phase) ---
  if (selectedDriver !== prevDriver) {
    setPrevDriver(selectedDriver);

    // Reset Logic saat driver berubah
    const tasks = data ? data.filter((d) => d.driver === selectedDriver) : [];
    const hasHub = tasks.some((t) => t.type === 'HUB_START');
    setSelectedCustomer(hasHub ? 'HUB' : '');
  }

  // --- Filter Tasks ---
  const driverTasks = useMemo(() => {
    if (!selectedDriver || !data) return [];
    return data.filter((d) => d.driver === selectedDriver);
  }, [data, selectedDriver]);

  const nameFrequency = useMemo(() => {
    const counts = {};
    driverTasks.forEach((t) => {
      if (t.customerName === 'HUB') return;
      const { name } = parseCustomerString(t.customerName);
      if (name) counts[name] = (counts[name] || 0) + 1;
    });
    return counts;
  }, [driverTasks]);

  const resolveDisplayName = useCallback(
    (originalCustomerString) => {
      if (!originalCustomerString || originalCustomerString === 'HUB') return 'HUB';
      const { name, location } = parseCustomerString(originalCustomerString);
      if (!name) return '-';
      return nameFrequency[name] > 1 ? `${name} (${location || '?'})` : name;
    },
    [nameFrequency]
  );

  const handleDriverChange = (driverVal) => {
    setUserSelectedDriver(driverVal);
  };

  const customerOptions = useMemo(() => {
    if (!driverTasks.length) return [];
    const sortedTasks = [...driverTasks].sort(
      (a, b) => (a.realSequence ?? 999999) - (b.realSequence ?? 999999)
    );
    const options = [];
    const seen = new Set();
    sortedTasks.forEach((t) => {
      if (!t.customerName || t.customerName === 'HUB') return;
      const displayName = resolveDisplayName(t.customerName);
      if (!seen.has(displayName)) {
        seen.add(displayName);
        options.push(displayName);
      }
    });
    return driverTasks.some((t) => t.type === 'HUB_START') ? ['HUB', ...options] : options;
  }, [driverTasks, resolveDisplayName]);

  const handleFocusCustomer = (val) => {
    setSelectedCustomer(val);
    if (!val) return;
    const targetTask = driverTasks.find((t) => {
      if (val === 'HUB' && t.type === 'HUB_START') return true;
      return resolveDisplayName(t.customerName) === val;
    });

    if (targetTask) {
      const coords = parseCoordinates(targetTask.longlat);
      if (coords && mapRo) {
        const zoomLevel = 16;
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

        if (isMobile) {
          const mapSize = mapRo.getSize();
          const targetPoint = mapRo.project([coords.lat, coords.lon], zoomLevel);
          const offsetY = mapSize.y * 0.25;
          const newCenterPoint = new L.Point(targetPoint.x, targetPoint.y + offsetY);
          const newCenterLatLng = mapRo.unproject(newCenterPoint, zoomLevel);
          mapRo.setView(newCenterLatLng, zoomLevel, { animate: true, duration: 1.0 });
        } else {
          // Desktop: Center normal
          mapRo.setView([coords.lat, coords.lon], zoomLevel, { animate: true, duration: 1.0 });
        }
      }
    }
  };

  const onMarkerClick = (task) => {
    if (task.type === 'HUB_START') {
      handleFocusCustomer('HUB');
      return;
    }
    if (task && task.customerName) handleFocusCustomer(resolveDisplayName(task.customerName));
  };

  const handleCloseInfo = () => setSelectedCustomer('');
  const handleCloseModal = () => {
    setUserSelectedDriver('');
    setSelectedCustomer('');
    setPrevDriver(null);
    onClose();
  };

  const headerContent = (
    <div className="flex flex-col lg:flex-row gap-4 items-center justify-between w-full lg:pr-8">
      <div className="text-center lg:text-left">
        <h2 className="text-xl font-bold text-slate-800">Peta Perbandingan Rute</h2>
        <p className="text-xs text-slate-500 font-normal mt-0.5">
          Bandingkan jalur Rencana vs Aktual
        </p>
      </div>
      <div className="flex flex-row gap-2 w-full lg:w-auto">
        <select
          value={selectedDriver}
          onChange={(e) => handleDriverChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="w-1/2 lg:w-64 border border-gray-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 outline-none bg-gray-50 cursor-pointer"
        >
          {drivers.map((driver) => (
            <option key={driver} value={driver}>
              {driver}
            </option>
          ))}
        </select>
        <select
          value={selectedCustomer}
          onChange={(e) => handleFocusCustomer(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          disabled={!selectedDriver}
          className="w-1/2 lg:w-64 border border-gray-300 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none bg-gray-50 cursor-pointer disabled:opacity-50"
        >
          {customerOptions.map((cust, i) => (
            <option key={`${cust}-${i}`} value={cust}>
              {cust}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleCloseModal}
      title={headerContent}
      maxWidth="max-w-6xl"
      headerClassName="bg-white border-b border-gray-200 py-3"
      contentClassName="h-[90vh]"
      bodyClassName="p-4 bg-slate-100 flex flex-col gap-4 overflow-hidden h-full"
    >
      {selectedDriver ? (
        <>
          <MapViewSection
            title="Rencana (RO Sequence)"
            tasks={driverTasks}
            sequenceKey="roSequence"
            colorClass="bg-blue-600"
            lineColor="#2563eb"
            setMap={setMapRo}
            onMarkerClick={onMarkerClick}
            selectedCustomer={selectedCustomer}
            showInfoCard={false}
            isActualMap={false}
            resolveDisplayName={resolveDisplayName}
          />

          <MapViewSection
            title="Aktual (Real Sequence)"
            tasks={driverTasks}
            sequenceKey="realSequence"
            colorClass="bg-orange-600"
            lineColor="#ea580c"
            setMap={setMapReal}
            onMarkerClick={onMarkerClick}
            selectedCustomer={selectedCustomer}
            showInfoCard={true}
            onCloseCard={handleCloseInfo}
            isActualMap={true}
            resolveDisplayName={resolveDisplayName}
          />
        </>
      ) : (
        <div className="h-full flex items-center justify-center text-gray-500">
          Silakan pilih driver terlebih dahulu.
        </div>
      )}
    </BaseModal>
  );
}
