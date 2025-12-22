'use client';

import { parseCoordinates, parseCustomerString } from '@/lib/utils';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useMap } from 'react-leaflet';

// --- Dynamic Imports ---
const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), {
  ssr: false,
});
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), {
  ssr: false,
});
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then((mod) => mod.Polyline), { ssr: false });

// --- HELPER FUNCTIONS ---
const getAngle = (lat1, lng1, lat2, lng2) => {
  const dy = lat2 - lat1;
  const dx = lng2 - lng1;
  let theta = Math.atan2(dy, dx);
  theta *= 180 / Math.PI;
  return theta;
};

const createArrowIcon = (angle, color) => {
  return new L.DivIcon({
    className: 'arrow-icon',
    html: `
      <div style="
        transform: rotate(${-angle}deg); 
        color: ${color}; 
        font-size: 14px; 
        font-weight: 900;
        filter: drop-shadow(1px 1px 0px white);
        display: flex; justify-content: center; align-items: center;
        width: 100%; height: 100%;
      ">
        ➤
      </div>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
};

const createNumberedIcon = (content, bgClassName) => {
  let fontSize = 'text-xs';
  if (content === '-' || content === '?') fontSize = 'text-lg';
  if (content === 'HUB') fontSize = 'text-[8px] tracking-tighter';

  return new L.DivIcon({
    className: 'custom-div-icon',
    html: `
      <div class="${bgClassName} w-7 h-7 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white font-bold ${fontSize} z-50 relative box-border overflow-hidden">
        ${content}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

// --- COMPONENTS ---

const ArrowPolyline = ({ segments, defaultColor }) => {
  if (!segments || segments.length === 0) return null;

  return (
    <>
      {segments.map((seg, i) => {
        const { start, end, isHighlight } = seg;

        const color = isHighlight ? '#16a34a' : defaultColor;
        const weight = isHighlight ? 5 : 3;
        const opacity = isHighlight ? 1 : 0.7;
        const dashArray = isHighlight ? null : '5, 10';

        const angle = getAngle(start[0], start[1], end[0], end[1]);

        const midLat = (start[0] + end[0]) / 2;
        const midLng = (start[1] + end[1]) / 2;
        const endLat = start[0] + (end[0] - start[0]) * 0.9;
        const endLng = start[1] + (end[1] - start[1]) * 0.9;

        return (
          <div key={`seg-${i}-${isHighlight ? 'active' : 'normal'}`}>
            <Polyline
              positions={[start, end]}
              color={color}
              weight={weight}
              opacity={opacity}
              dashArray={dashArray}
            />
            <Marker
              position={[midLat, midLng]}
              icon={createArrowIcon(angle, color)}
              zIndexOffset={-50}
              interactive={false}
            />
            <Marker
              position={[endLat, endLng]}
              icon={createArrowIcon(angle, color)}
              zIndexOffset={-50}
              interactive={false}
            />
          </div>
        );
      })}
    </>
  );
};

function MapRef({ setMap }) {
  const map = useMap();
  useEffect(() => {
    setMap(map);
    return () => setMap(null);
  }, [map, setMap]);
  return null;
}

function FitBounds({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords && coords.length > 0) {
      const bounds = L.latLngBounds(coords.map((c) => [c.lat, c.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [coords, map]);
  return null;
}

const applyJitter = (tasks) => {
  const seen = {};
  return tasks.map((t) => {
    const key = `${t.lat},${t.lng}`;
    if (!seen[key]) {
      seen[key] = 0;
      return t;
    } else {
      seen[key] += 1;
      const offset = 0.00025 * seen[key];
      return {
        ...t,
        lat: t.lat + (seen[key] % 2 === 0 ? offset : -offset),
        lng: t.lng + (seen[key] % 2 !== 0 ? offset : -offset),
      };
    }
  });
};

const InfoCard = ({ task, onClose, customTitle }) => {
  if (!task) return null;

  const custInfo = parseCustomerString(task.customerName);
  const cleanName = custInfo.name || 'HUB';
  const custId = custInfo.id || '-';
  const flowType = task.flow || '-';
  const isManual = task.isManualAssign;

  const displayTitle = customTitle || cleanName;

  if (task.type === 'HUB_START' || task.type === 'HUB_END') {
    return (
      <div className="absolute top-12 right-4 z-900 w-72 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="bg-green-50 p-3 border-b border-green-100 flex justify-between items-center">
          <h3 className="font-bold text-sm text-green-800">HUB LOCATION</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>
        <div className="p-4 text-xs text-gray-600">
          <p>Titik awal/akhir pengiriman (Hub/Depot).</p>
          <p className="mt-2 font-mono">{task.time}</p>
        </div>
      </div>
    );
  }

  const planVisit = parseFloat(task.visitTime) || 0;
  const actVisit = parseFloat(task.actualVisitTime) || 0;
  const diffVisit = actVisit - planVisit;
  const isFaster = diffVisit <= 0;
  const diffText = isFaster ? `${diffVisit} min` : `+${diffVisit} min`;
  const diffColor = isFaster ? 'text-green-600' : 'text-red-600';

  const timeToMin = (t) => {
    if (!t || !t.includes(':')) return null;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const etaMin = timeToMin(task.eta);
  const etdMin = timeToMin(task.etd);
  const arrMin = timeToMin(task.actualArrival);

  let timeStatus = 'Belum Ada Data';
  let timeStatusColor = 'text-gray-500';
  let statusBg = 'bg-gray-100';

  if (isManual) {
    timeStatus = 'Tidak Diketahui';
    timeStatusColor = 'text-gray-500';
    statusBg = 'bg-gray-100';
  } else if (etaMin !== null && etdMin !== null && arrMin !== null) {
    if (arrMin <= etaMin) {
      timeStatus = 'Tiba Lebih Awal';
      timeStatusColor = 'text-green-700';
      statusBg = 'bg-green-50';
    } else if (arrMin > etaMin && arrMin <= etdMin) {
      timeStatus = 'Tiba Sesuai Rentang Waktu';
      timeStatusColor = 'text-green-700';
      statusBg = 'bg-green-50';
    } else {
      timeStatus = 'Melewati Batas Waktu';
      timeStatusColor = 'text-red-700';
      statusBg = 'bg-red-50';
    }
  }

  return (
    <div className="absolute top-12 right-4 z-900 w-72 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="bg-slate-50 p-3 border-b border-gray-100 flex justify-between items-start">
        <div>
          <h3 className="font-bold text-sm text-slate-800 leading-tight">{displayTitle}</h3>
          <p className="text-[10px] text-gray-500 mt-1 flex flex-wrap items-center gap-1">
            {custId} <span className="mx-1 text-gray-300">|</span>
            <span className="font-semibold text-sky-600">{flowType}</span>
            {isManual && (
              <span className="text-gray-600 font-bold ml-1 bg-gray-100 px-1 py-0.5 rounded border border-gray-300 text-[9px]">
                Manual Assign
              </span>
            )}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            ></path>
          </svg>
        </button>
      </div>

      <div className="p-3 text-xs space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-blue-50 p-2 rounded border border-blue-100">
            <span className="block text-[10px] text-blue-500 font-semibold mb-0.5">
              RENCANA (ETA-ETD)
            </span>
            <span className="font-mono font-bold text-slate-700">
              {task.eta || '--:--'} - {task.etd || '--:--'}
            </span>
          </div>
          <div className="bg-orange-50 p-2 rounded border border-orange-100">
            <span className="block text-[10px] text-orange-500 font-semibold mb-0.5">
              AKTUAL (ARR-DEP)
            </span>
            <span className="font-mono font-bold text-slate-700">
              {task.actualArrival || '--:--'} - {task.actualDeparture || '--:--'}
            </span>
          </div>
        </div>

        <div
          className={`flex items-center justify-between p-2 rounded border ${statusBg} border-opacity-50`}
        >
          <span className="text-gray-500 font-semibold">Status Waktu</span>
          <span
            className={`font-bold ${timeStatusColor} px-2 py-0.5 bg-white rounded shadow-sm text-[11px]`}
          >
            {timeStatus}
          </span>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-2 items-center pt-2 border-t border-dashed border-gray-200">
          <div>
            <span className="block text-gray-500">Visit Plan</span>
            <span className="font-semibold text-slate-700">{planVisit} menit</span>
          </div>
          <div className="text-right">
            <span className="block text-gray-500">Actual Visit</span>
            <div className="flex items-center justify-end gap-2">
              <span className="font-bold text-slate-700">
                {actVisit > 0 ? actVisit : '-'} menit
              </span>
              {actVisit > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${diffColor} bg-white border-current`}
                >
                  {diffText}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MAP VIEW SECTION ---
const MapViewSection = ({
  title,
  tasks,
  sequenceKey,
  colorClass,
  lineColor,
  setMap,
  onMarkerClick,
  selectedCustomer,
  showInfoCard = false,
  onCloseCard,
  isActualMap = false,
  resolveDisplayName,
}) => {
  const sortedTasks = useMemo(() => {
    const valid = tasks
      .filter((t) => t.longlat && typeof t.longlat === 'string' && t.longlat.includes(','))
      .map((t) => {
        const parsed = parseCoordinates(t.longlat);
        if (parsed) {
          return { ...t, lat: parsed.lat, lng: parsed.lon };
        }
        const [lat, lng] = t.longlat.split(',').map(Number);
        return { ...t, lat, lng };
      })
      .sort((a, b) => (a[sequenceKey] || 9999) - (b[sequenceKey] || 9999));

    return applyJitter(valid);
  }, [tasks, sequenceKey]);

  const pathSegments = useMemo(() => {
    if (sortedTasks.length === 0) return [];

    const hubTask = sortedTasks.find((t) => t.type === 'HUB_START');
    if (!hubTask || !hubTask.lat || !hubTask.lng) return [];
    const hubCoords = [hubTask.lat, hubTask.lng];

    const routeTasks = sortedTasks.filter((t) => t.type !== 'HUB_START' && t.type !== 'HUB_END');

    let segments = [];
    let points = [];

    if (!isActualMap) {
      points.push({ coords: hubCoords, name: 'HUB' });
      routeTasks.forEach((t) => {
        const displayName = resolveDisplayName(t.customerName);
        points.push({ coords: [t.lat, t.lng], name: displayName });
      });
      points.push({ coords: hubCoords, name: 'HUB_END' });
    } else {
      points.push({ coords: hubCoords, name: 'HUB' });
      const doneTasks = routeTasks.filter((t) => !!t.actualArrival);
      doneTasks.forEach((t) => {
        const displayName = resolveDisplayName(t.customerName);
        points.push({ coords: [t.lat, t.lng], name: displayName });
      });
    }

    for (let i = 0; i < points.length - 1; i++) {
      const currentPoint = points[i];
      const nextPoint = points[i + 1];

      let isHighlight = false;

      if (selectedCustomer) {
        if (selectedCustomer === 'HUB') {
          if (currentPoint.name === 'HUB') isHighlight = true;
        } else {
          if (currentPoint.name === selectedCustomer) isHighlight = true;
        }
      }

      segments.push({
        start: currentPoint.coords,
        end: nextPoint.coords,
        isHighlight: isHighlight,
      });
    }

    return segments;
  }, [sortedTasks, isActualMap, selectedCustomer, resolveDisplayName]);

  const activeTask = useMemo(() => {
    if (!selectedCustomer) return null;
    return sortedTasks.find((t) => {
      const displayName = resolveDisplayName(t.customerName);
      if (selectedCustomer === 'HUB' && (t.type === 'HUB_START' || t.type === 'HUB_END'))
        return true;
      return displayName === selectedCustomer;
    });
  }, [selectedCustomer, sortedTasks, resolveDisplayName]);

  const coordsForZoom = sortedTasks.map((t) => ({ lat: t.lat, lng: t.lng }));

  return (
    <div className="flex flex-col h-1/2 bg-white border rounded-lg overflow-hidden shadow-sm relative">
      <div
        className={`w-full px-4 py-2 font-bold text-white text-sm ${colorClass} shadow-md flex justify-between shrink-0 z-10`}
      >
        <span>{title}</span>
        <span className="text-xs bg-black/20 px-2 py-0.5 rounded-full">
          {sortedTasks.length} Titik
        </span>
      </div>

      {showInfoCard && activeTask && (
        <InfoCard
          task={activeTask}
          onClose={onCloseCard}
          customTitle={resolveDisplayName(activeTask.customerName)}
        />
      )}

      <div className="flex-1 w-full h-full relative z-0">
        {sortedTasks.length > 0 ? (
          <MapContainer center={[-6.2, 106.8]} zoom={10} className="w-full h-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapRef setMap={setMap} />
            <FitBounds coords={coordsForZoom} />

            <ArrowPolyline segments={pathSegments} defaultColor={lineColor} />

            {sortedTasks.map((task, idx) => {
              const seqNum = task[sequenceKey] ?? '?';

              let finalColorClass = colorClass;
              let finalContent = seqNum;
              let isHub = task.type === 'HUB_START' || task.type === 'HUB_END';
              let isManual = task.isManualAssign;
              let isPickup = task.flow && task.flow.toLowerCase().includes('pickup');

              if (isHub) {
                finalColorClass = 'bg-green-600';
                finalContent = 'HUB';
              } else if (isManual) {
                finalColorClass = 'bg-gray-400';
                finalContent = isActualMap ? seqNum : '-';
              } else if (isPickup) {
                finalColorClass = 'bg-purple-600';
              }

              return (
                <Marker
                  key={`${sequenceKey}-${idx}`}
                  position={[task.lat, task.lng]}
                  icon={createNumberedIcon(finalContent, finalColorClass)}
                  zIndexOffset={isHub ? 200 : 100}
                  eventHandlers={{
                    click: () => {
                      if (onMarkerClick) onMarkerClick(task);
                    },
                  }}
                />
              );
            })}
          </MapContainer>
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-50 text-gray-400 text-sm">
            Tidak ada data koordinat.
          </div>
        )}
      </div>

      <div className="px-4 py-2 bg-gray-50 border-t flex flex-wrap gap-4 text-[10px] text-gray-600 font-medium z-10">
        <div className="flex items-center gap-1">
          <span className={`w-3 h-3 rounded-full ${colorClass}`}></span>
          <span>Selesai {title.includes('Rencana') ? '(RO)' : '(Real)'}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-green-600"></span>
          <span>Hub</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-purple-600"></span>
          <span>Pickup</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-gray-400"></span>
          <span>Manual Assign</span>
        </div>
      </div>
    </div>
  );
};

export default function RoutingMapModal({ isOpen, onClose, data }) {
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
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

  const drivers = useMemo(() => {
    if (!data) return [];
    const unique = new Set(data.map((d) => d.driver).filter(Boolean));
    return Array.from(unique).sort();
  }, [data]);

  const driverTasks = useMemo(() => {
    if (!selectedDriver || !data) return [];
    return data.filter((d) => d.driver === selectedDriver);
  }, [data, selectedDriver]);

  // FIX: Hitung frekuensi nama customer.
  // Jika > 1, berarti ada duplikat nama di lokasi berbeda.
  const nameFrequency = useMemo(() => {
    const counts = {};
    driverTasks.forEach((t) => {
      if (t.customerName === 'HUB') return;
      const { name } = parseCustomerString(t.customerName);
      if (name) {
        counts[name] = (counts[name] || 0) + 1;
      }
    });
    return counts;
  }, [driverTasks]);

  // FIX: Resolve Display Name
  // Jika duplikat: "Nama (LocationID)"
  // Jika unik: "Nama"
  const resolveDisplayName = useCallback(
    (originalCustomerString) => {
      if (!originalCustomerString || originalCustomerString === 'HUB') return 'HUB';
      // Gunakan 'location', BUKAN 'id'
      const { name, location } = parseCustomerString(originalCustomerString);
      if (!name) return '-';

      // Jika nama customer ini muncul lebih dari sekali, tambahkan Location ID
      if (nameFrequency[name] > 1) {
        // Fallback jika location null, gunakan '?'
        return `${name} (${location || '?'})`;
      }
      return name;
    },
    [nameFrequency]
  );

  // Handler Manual
  const handleDriverChange = (driverVal) => {
    setSelectedDriver(driverVal);
    const tasks = data ? data.filter((d) => d.driver === driverVal) : [];
    const hasHub = tasks.some((t) => t.type === 'HUB_START');
    setSelectedCustomer(hasHub ? 'HUB' : '');
  };

  useEffect(() => {
    if (isOpen && drivers.length > 0) {
      const isCurrentDriverValid = selectedDriver && drivers.includes(selectedDriver);

      if (!isCurrentDriverValid) {
        const firstDriver = drivers[0];
        setSelectedDriver(firstDriver);

        const tasks = data ? data.filter((d) => d.driver === firstDriver) : [];
        const hasHub = tasks.some((t) => t.type === 'HUB_START');
        setSelectedCustomer(hasHub ? 'HUB' : '');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, drivers]);

  const customerOptions = useMemo(() => {
    if (!driverTasks.length) return [];

    const sortedTasks = [...driverTasks].sort((a, b) => {
      const seqA = a.realSequence ?? 999999;
      const seqB = b.realSequence ?? 999999;
      return seqA - seqB;
    });

    const options = [];
    const seen = new Set();

    sortedTasks.forEach((t) => {
      if (!t.customerName) return;
      if (t.customerName === 'HUB') return;

      // Gunakan nama unik yang sudah di-resolve
      const displayName = resolveDisplayName(t.customerName);

      if (!seen.has(displayName)) {
        seen.add(displayName);
        options.push(displayName);
      }
    });

    const hasHub = driverTasks.some((t) => t.type === 'HUB_START');
    if (hasHub) {
      return ['HUB', ...options];
    }
    return options;
  }, [driverTasks, resolveDisplayName]);

  const handleFocusCustomer = (customerUniqueName) => {
    setSelectedCustomer(customerUniqueName);

    if (!customerUniqueName) return;

    const targetTask = driverTasks.find((t) => {
      if (customerUniqueName === 'HUB' && t.type === 'HUB_START') return true;
      const displayName = resolveDisplayName(t.customerName);
      return displayName === customerUniqueName;
    });

    if (!targetTask) return;

    const coords = parseCoordinates(targetTask.longlat);

    if (coords && mapRo) {
      mapRo.setView([coords.lat, coords.lon], 16, { animate: true, duration: 1.0 });
    }
  };

  const onMarkerClick = (task) => {
    if (task.type === 'HUB_START') {
      handleFocusCustomer('HUB');
      return;
    }
    if (task && task.customerName) {
      const displayName = resolveDisplayName(task.customerName);
      handleFocusCustomer(displayName);
    }
  };

  const handleCloseCard = () => {
    setSelectedCustomer('');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-2000 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-100 w-full max-w-6xl h-full md:h-[95vh] md:rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-4 bg-white border-b border-gray-200 flex flex-col lg:flex-row gap-4 items-center justify-between shrink-0 shadow-sm z-50">
          <div className="text-center lg:text-left w-full lg:w-auto">
            <h2 className="text-xl font-bold text-slate-800">Peta Perbandingan Rute</h2>
            <p className="text-xs text-slate-500">Bandingkan jalur Rencana vs Aktual di lapangan</p>
          </div>

          <div className="hidden lg:block h-8 w-px bg-gray-300 mx-2"></div>

          <div className="flex flex-col gap-3 w-full lg:w-auto lg:flex-row lg:items-center">
            <div className="flex flex-row gap-2 w-full lg:w-auto">
              <select
                value={selectedDriver}
                onChange={(e) => handleDriverChange(e.target.value)}
                className="w-1/2 lg:w-64 border border-gray-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-sky-500 outline-none bg-gray-50 hover:bg-white transition-colors cursor-pointer"
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
                disabled={!selectedDriver}
                className="w-1/2 lg:w-64 border border-gray-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-sky-500 outline-none bg-gray-50 hover:bg-white transition-colors cursor-pointer disabled:opacity-50"
              >
                {customerOptions.map((cust, i) => (
                  <option key={`${cust}-${i}`} value={cust}>
                    {cust}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={onClose}
              className="w-full lg:w-auto px-5 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-sm font-bold transition-all shadow-sm cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 relative p-4 gap-4 bg-slate-100">
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
                onCloseCard={handleCloseCard}
                isActualMap={true}
                resolveDisplayName={resolveDisplayName}
              />

              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-500 bg-white text-slate-600 px-3 py-1 rounded-full shadow-md border border-gray-200 text-[10px] font-bold pointer-events-none uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Map Sync Active
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              Silakan pilih driver terlebih dahulu.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
