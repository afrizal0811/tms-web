'use client';

import BaseModal from '@/components/BaseModal';
import { useLanguage } from '@/context/LanguageContext';
import { isEmpty, parseCoordinates, parseCustomerString } from '@/lib/utils';
import L from 'leaflet';
import { useCallback, useEffect, useMemo, useState } from 'react';
import MapViewSection from '../components/MapViewSection';

export default function RoutingMapModal({ isOpen, onClose, data }) {
  const { t } = useLanguage();
  const [userSelectedDriver, setUserSelectedDriver] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
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

  const drivers = useMemo(() => {
    if (!data) return [];
    const unique = new Set(data.map((d) => d.driver).filter(Boolean));
    return Array.from(unique).sort();
  }, [data]);

  const selectedDriver = useMemo(() => {
    if (userSelectedDriver && drivers.includes(userSelectedDriver)) {
      return userSelectedDriver;
    }
    return drivers.length > 0 ? drivers[0] : '';
  }, [userSelectedDriver, drivers]);

  if (selectedDriver !== prevDriver) {
    setPrevDriver(selectedDriver);
    const tasks = data ? data.filter((d) => d.driver === selectedDriver) : [];
    const hasHub = tasks.some((t) => t.type === 'HUB_START');
    setSelectedCustomer(hasHub ? 'HUB' : '');
  }

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
    (originalCustomerString, flow) => {
      if (flow === 'Pickup') return 'Pickup';
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

      // Cek apakah task ini pending (belum dikunjungi)
      const isPending = isEmpty(t.realSequence);

      if (t.flow === 'Pickup') {
        if (!seen.has('Pickup')) {
          seen.add('Pickup');
          options.push({ value: 'Pickup', label: 'Pickup', isPending: false });
        }
      } else {
        const displayName = resolveDisplayName(t.customerName, t.flow);
        if (!seen.has(displayName)) {
          seen.add(displayName);
          // Kirim status isPending untuk styling
          options.push({
            value: displayName,
            label: displayName, // Label tetap bersih tanpa "(Pending)"
            isPending: isPending,
          });
        }
      }
    });

    const hasHub = driverTasks.some((t) => t.type === 'HUB_START');
    return hasHub ? [{ value: 'HUB', label: 'HUB', isPending: false }, ...options] : options;
  }, [driverTasks, resolveDisplayName]);

  const handleFocusCustomer = (val) => {
    setSelectedCustomer(val);
    if (!val) return;
    const targetTask = driverTasks.find((t) => {
      if (val === 'HUB' && t.type === 'HUB_START') return true;
      if (val === 'Pickup' && t.flow === 'Pickup') return true;
      return resolveDisplayName(t.customerName, t.flow) === val;
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
    if (task.flow === 'Pickup') {
      handleFocusCustomer('Pickup');
      return;
    }
    if (task && task.customerName)
      handleFocusCustomer(resolveDisplayName(task.customerName, task.flow));
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
        <h2 className="text-xl font-bold text-slate-800">{t('dashboard.map.title')}</h2>
        <p className="text-xs text-slate-500 font-normal mt-0.5">{t('dashboard.map.subtitle')}</p>
      </div>
      <div className="flex flex-row gap-2 w-full lg:w-auto items-end">
        {/* Label Driver */}
        <div className="flex flex-col w-1/2 lg:w-64 gap-1">
          <label className="text-[10px] font-bold text-gray-500 tracking-wide">
            {t('dashboard.map.dropdown_driver')}
          </label>
          <select
            value={selectedDriver}
            onChange={(e) => handleDriverChange(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 outline-none bg-gray-50 cursor-pointer"
          >
            {drivers.map((driver) => (
              <option key={driver} value={driver}>
                {driver}
              </option>
            ))}
          </select>
        </div>

        {/* Label Task */}
        <div className="flex flex-col w-1/2 lg:w-64 gap-1">
          <label className="text-[10px] font-bold text-gray-500 tracking-wide">
            {`${t('dashboard.map.dropdown_task')}  (${t('dashboard.map.real')})`}
          </label>
          <select
            value={selectedCustomer}
            onChange={(e) => handleFocusCustomer(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            disabled={!selectedDriver}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none bg-gray-50 cursor-pointer disabled:opacity-50"
          >
            {customerOptions.map((opt, i) => (
              <option
                key={`${opt.value}-${i}`}
                value={opt.value}
                // UPDATE: Logic warna merah soft (#EF4444) jika Pending
                className={opt.isPending ? 'text-red-500 font-medium' : 'text-slate-700'}
                style={opt.isPending ? { color: '#EF4444' } : {}}
              >
                {opt.label}
              </option>
            ))}
          </select>
        </div>
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
            title={t('dashboard.map.plan')}
            tasks={driverTasks}
            sequenceKey="roSequence"
            colorClass="bg-[#0D9488]" // Teal
            lineColor="#FF0000"
            setMap={setMapRo}
            onMarkerClick={onMarkerClick}
            selectedCustomer={selectedCustomer}
            showInfoCard={false}
            isActualMap={false}
            resolveDisplayName={resolveDisplayName}
          />

          <MapViewSection
            title={t('dashboard.map.real')}
            tasks={driverTasks}
            sequenceKey="realSequence"
            colorClass="bg-[#16A34A]" // Green
            lineColor="#FF0000"
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
          {t('dashboard.map.select_driver')}
        </div>
      )}
    </BaseModal>
  );
}
