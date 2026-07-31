'use client';

import BaseModal from '@/components/BaseModal';
import { useLanguage } from '@/context/LanguageContext';
import { getBasePlate, isEmpty, parseCoordinates, parseCustomerString } from '@/lib/utils';
import { useCallback, useEffect, useMemo, useState } from 'react';
import MapViewSection from '../components/MapViewSection';

const getGroupKey = (item) => {
  const driver = item?.driver || item?.assignee || 'N/A';
  const plat =
    getBasePlate(item?.plat || item?.vehicleName) || item?.plat || item?.vehicleName || '';
  return `${driver}_${plat}`;
};

export default function RoutingMapModal({ isOpen, onClose, data }) {
  const { t } = useLanguage();
  const [userSelectedGroup, setUserSelectedGroup] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [prevGroup, setPrevGroup] = useState(null);
  const [mapRo, setMapRo] = useState(null);
  const [mapReal, setMapReal] = useState(null);

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

  const groups = useMemo(() => {
    if (!data) return [];
    const map = new Map();
    data.forEach((d) => {
      const gKey = d.groupKey || getGroupKey(d);
      const driverName = d.driver && d.driver !== 'N/A' && d.driver !== 'Driver' ? d.driver : '';
      const platName = getBasePlate(d.plat || d.vehicleName) || d.plat || d.vehicleName || '';

      if (gKey && driverName && platName && !map.has(gKey)) {
        map.set(gKey, {
          value: gKey,
          label: `${driverName} (${platName})`,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [data]);

  const selectedGroup = useMemo(() => {
    if (userSelectedGroup && groups.some((g) => g.value === userSelectedGroup)) {
      return userSelectedGroup;
    }
    return groups.length > 0 ? groups[0].value : '';
  }, [userSelectedGroup, groups]);

  if (selectedGroup !== prevGroup) {
    setPrevGroup(selectedGroup);
    const tasks = data ? data.filter((d) => (d.groupKey || getGroupKey(d)) === selectedGroup) : [];
    const hasHub = tasks.some((t) => t.type === 'HUB_START');
    setSelectedCustomer(hasHub ? 'HUB' : '');
  }

  const filteredTasks = useMemo(() => {
    if (!selectedGroup || !data) return [];
    return data
      .filter((d) => (d.groupKey || getGroupKey(d)) === selectedGroup)
      .map((t) => ({
        ...t,
        longlat: t.longlat || t.rawTask?.longlat || t.coordinate || t.location || '',
      }));
  }, [data, selectedGroup]);

  const nameFrequency = useMemo(() => {
    const counts = {};
    filteredTasks.forEach((t) => {
      if (t.customerName === 'HUB') return;
      const rawStr = t.originalCustomerString || t.customerName;
      const { name } = parseCustomerString(rawStr);
      if (name) counts[name] = (counts[name] || 0) + 1;
    });
    return counts;
  }, [filteredTasks]);

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

  const customerOptions = useMemo(() => {
    if (!filteredTasks.length) return [];

    const sortedTasks = [...filteredTasks].sort(
      (a, b) => (a.realSequence ?? 999999) - (b.realSequence ?? 999999)
    );

    const options = [];
    const seen = new Set();

    sortedTasks.forEach((t) => {
      if (!t.customerName || t.customerName === 'HUB') return;

      const isPending = isEmpty(t.realSequence);

      if (t.flow === 'Pickup') {
        if (!seen.has('Pickup')) {
          seen.add('Pickup');
          options.push({ value: 'Pickup', label: 'PICKUP', isPending: false });
        }
      } else {
        const rawStr = t.originalCustomerString || t.customerName;
        const displayName = resolveDisplayName(rawStr, t.flow);
        if (!seen.has(displayName)) {
          seen.add(displayName);
          options.push({
            value: displayName,
            label: displayName,
            isPending: isPending,
          });
        }
      }
    });

    const hasHub = filteredTasks.some((t) => t.type === 'HUB_START');
    return hasHub ? [{ value: 'HUB', label: 'HUB', isPending: false }, ...options] : options;
  }, [filteredTasks, resolveDisplayName]);

  const handleFocusCustomer = async (val) => {
    setSelectedCustomer(val);
    if (!val) return;
    const targetTask = filteredTasks.find((t) => {
      if (val === 'HUB' && t.type === 'HUB_START') return true;
      if (val === 'Pickup' && t.flow === 'Pickup') return true;
      const rawStr = t.originalCustomerString || t.customerName;
      return resolveDisplayName(rawStr, t.flow) === val;
    });

    if (targetTask) {
      const coords = parseCoordinates(targetTask.longlat);
      if (coords && mapRo) {
        const zoomLevel = 16;
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

        if (isMobile) {
          const L = (await import('leaflet')).default;
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
    if (task) {
      const rawStr = task.originalCustomerString || task.customerName;
      handleFocusCustomer(resolveDisplayName(rawStr, task.flow));
    }
  };

  const handleCloseInfo = () => setSelectedCustomer('');
  const handleCloseModal = () => {
    setUserSelectedGroup('');
    setSelectedCustomer('');
    setPrevGroup(null);
    onClose();
  };

  const headerTitle = (
    <div className="text-left">
      <h2 className="text-xl font-bold">{t('dashboard.map.title')}</h2>
      <p className="text-xs font-normal mt-0.5">{t('dashboard.map.subtitle')}</p>
    </div>
  );

  const headerContent = (
    <div className="flex flex-col lg:flex-row items-end justify-between w-full">
      <div className="flex flex-row gap-2 w-full lg:w-auto items-end ml-auto">
        <div className="flex flex-col w-1/2 lg:w-64 gap-1">
          <label className="text-[10px] font-bold tracking-wide">{t('common.driver')}</label>
          <select
            value={selectedGroup}
            onChange={(e) => setUserSelectedGroup(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 outline-none bg-gray-50 cursor-pointer"
          >
            {groups.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col w-1/2 lg:w-64 gap-1">
          <label className="text-[10px] font-bold tracking-wide">
            {`${t('common.task')}  (${t('dashboard.map.real')})`}
          </label>
          <select
            value={selectedCustomer}
            onChange={(e) => handleFocusCustomer(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            disabled={!selectedGroup}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none bg-gray-50 cursor-pointer disabled:opacity-50"
          >
            {customerOptions.map((opt, i) => (
              <option
                key={`${opt.value}-${i}`}
                value={opt.value}
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
      title={headerTitle}
      headerContent={headerContent}
      maxWidth="max-w-6xl"
      contentClassName="h-[90vh]"
      bodyClassName="p-4 flex flex-col gap-4 overflow-hidden h-full"
    >
      {selectedGroup ? (
        <>
          <MapViewSection
            title={t('dashboard.map.plan')}
            tasks={filteredTasks}
            sequenceKey="roSequence"
            colorClass="bg-[#0D9488]"
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
            tasks={filteredTasks}
            sequenceKey="realSequence"
            colorClass="bg-[#16A34A]"
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
