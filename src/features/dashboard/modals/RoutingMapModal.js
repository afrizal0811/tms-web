// File: src/features/dashboard/modals/RoutingMapModal.js
'use client';

import { parseCustomerString } from '@/lib/utils';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';

// --- Dynamic Imports untuk React Leaflet ---
const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), {
  ssr: false,
});
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), {
  ssr: false,
});
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((mod) => mod.Popup), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then((mod) => mod.Polyline), { ssr: false });

// --- Konfigurasi Icon ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Icon Merah (Untuk Mismatch / Tidak Sesuai Rute)
const redIcon = new L.Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Icon Biru (Untuk Match / Sesuai Rute)
const blueIcon = new L.Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// --- Helper: Time Comparison ---
const timeToMin = (t) => {
  if (!t || typeof t !== 'string' || !t.includes(':')) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

// --- Helper Component: Map Controller ---
function MapController({ points, focusCoords }) {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0) return;
    if (focusCoords) return;

    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
  }, [points, map, focusCoords]);

  useEffect(() => {
    if (!focusCoords) return;
    map.flyTo(focusCoords, 18, {
      animate: true,
      duration: 1.5,
    });
  }, [focusCoords, map]);

  return null;
}

export default function RoutingMapModal({ isOpen, onClose, data }) {
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [focusLocation, setFocusLocation] = useState(null);
  const markerRefs = useRef({});

  // Group data by driver
  const driverDataMap = useMemo(() => {
    if (!data) return {};
    const map = {};

    data.forEach((row) => {
      // Pastikan tipe TASK dan koordinat valid
      if (row.type === 'TASK' && row.longlat && row.longlat.includes(',')) {
        if (!map[row.driver]) {
          map[row.driver] = [];
        }
        map[row.driver].push(row);
      }
    });
    return map;
  }, [data]);

  const drivers = useMemo(() => Object.keys(driverDataMap).sort(), [driverDataMap]);

  // Derived State untuk default driver
  const activeDriver =
    selectedDriver && drivers.includes(selectedDriver) ? selectedDriver : drivers[0];

  if (!isOpen) return null;

  const currentTasks = activeDriver ? driverDataMap[activeDriver] : [];

  const parseCoord = (str) => {
    if (!str) return null;
    const parts = str.split(',');
    return [parseFloat(parts[0]), parseFloat(parts[1])];
  };

  const markers = currentTasks
    .map((t) => ({ ...t, pos: parseCoord(t.longlat) }))
    .filter((m) => m.pos && !isNaN(m.pos[0]));

  const roPath = currentTasks
    .filter((t) => t.roSequence > 0)
    .sort((a, b) => a.roSequence - b.roSequence)
    .map((t) => parseCoord(t.longlat))
    .filter((pos) => pos);

  const actualPath = currentTasks
    .filter((t) => t.realSequence !== null)
    .sort((a, b) => (a.realSequence || 9999) - (b.realSequence || 9999))
    .map((t) => parseCoord(t.longlat))
    .filter((pos) => pos);

  // LIST TETAP DIURUTKAN BERDASARKAN ACTUAL SEQUENCE (WAKTU)
  const customerList = [...currentTasks].sort((a, b) => {
    const seqA = a.realSequence !== null ? a.realSequence : 999999;
    const seqB = b.realSequence !== null ? b.realSequence : 999999;
    return seqA - seqB;
  });

  const handleCustomerClick = (task) => {
    const pos = parseCoord(task.longlat);
    if (pos) {
      setFocusLocation(pos);
      const key = `${task.roSequence}-${task.customerName}`;
      const marker = markerRefs.current[key];
      if (marker) {
        setTimeout(() => marker.openPopup(), 500);
      }
    }
  };

  const handleDriverChange = (drv) => {
    setSelectedDriver(drv);
    setFocusLocation(null);
  };

  const center = markers.length > 0 ? markers[0].pos : [-6.2, 106.816666];

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-7xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b bg-white z-10 shrink-0">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Peta Routing vs Aktual</h3>
            <div className="flex items-center gap-4 mt-1 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <span className="w-6 h-1 bg-blue-500 border-b-2 border-dashed border-white block"></span>
                <span>Jalur Rencana (RO)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-6 h-1 bg-red-600 block"></span>
                <span>Jalur Aktual (Real)</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-gray-600 cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex flex-col md:flex-row h-full overflow-hidden">
          {/* Sidebar: Driver & Customer List */}
          <div className="w-full md:w-80 border-r bg-gray-50 flex flex-col z-10 shadow-inner shrink-0">
            <div className="p-4 border-b bg-white font-semibold text-gray-700 text-sm flex justify-between items-center shadow-sm">
              <span>Driver List</span>
              <span className="bg-gray-200 px-2 py-0.5 rounded-full text-xs text-gray-600">
                {drivers.length}
              </span>
            </div>

            <div className="overflow-y-auto flex-1 p-3 space-y-2">
              {drivers.length === 0 && (
                <div className="text-sm text-gray-400 text-center mt-10">
                  Tidak ada data koordinat.
                </div>
              )}

              {drivers.map((drv) => {
                const isSelected = activeDriver === drv;
                return (
                  <div
                    key={drv}
                    className={`rounded-lg transition-all duration-300 border${isSelected ? 'bg-white border-sky-300 shadow-md' : 'bg-white border-transparent hover:border-gray-200'}`}
                  >
                    <button
                      onClick={() => handleDriverChange(drv)}
                      className={`w-full text-left px-4 py-3 rounded-t-lg text-sm font-bold flex justify-between items-center ${
                        isSelected
                          ? 'bg-sky-50 text-sky-700'
                          : 'text-gray-600 hover:bg-gray-50 cursor-pointer'
                      }`}
                    >
                      <span className="truncate pr-5">{drv}</span>
                      {isSelected && (
                        <span className="text-xs bg-sky-200 text-sky-800 px-2 py-0.5 rounded-full">
                          {customerList.length}
                        </span>
                      )}
                    </button>

                    {isSelected && (
                      <div className="border-t border-sky-100 bg-white max-h-64 overflow-y-auto divide-y divide-gray-50">
                        {customerList.map((cust, idx) => {
                          const { name, id } = parseCustomerString(cust.customerName);
                          const displayName = name || cust.customerName;
                          const displayId = id || '-';

                          // --- LOGIC BARU: Visual Cue Jalan Tengah ---
                          const isMatch = cust.roSequence === cust.realSequence;

                          // Style Badge: Hijau jika match, Merah Bold jika mismatch
                          const badgeClass = isMatch
                            ? 'bg-green-100 text-green-700 border-green-200'
                            : 'bg-red-100 text-red-700 border-red-200 font-bold';

                          return (
                            <button
                              key={idx}
                              onClick={() => handleCustomerClick(cust)}
                              className="cursor-pointer w-full text-left px-4 py-2 hover:bg-sky-50 transition-colors group flex items-start gap-2 border-b border-gray-50 last:border-0"
                            >
                              {/* Badge: Menampilkan RO SEQUENCE */}
                              <div
                                className={`mt-1 min-w-6 h-6 flex items-center justify-center rounded-full border text-[10px] ${badgeClass}`}
                                title={
                                  isMatch
                                    ? 'Sesuai Rute'
                                    : `Tidak Sesuai (Rencana: ${cust.roSequence})`
                                }
                              >
                                {cust.roSequence}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-semibold text-gray-700 truncate group-hover:text-sky-700">
                                  {displayName}
                                </div>

                                {/* Detail Info: Flow, ID, dan Info Mismatch */}
                                <div className="text-[10px] text-gray-400 flex flex-wrap items-center gap-1">
                                  {cust.flow ? <span>{cust.flow}</span> : null}

                                  {/* Jika Mismatch, tampilkan Actual Sequence di sini sebagai pembanding */}
                                  {!isMatch && (
                                    <>
                                      <span className="text-gray-300">|</span>
                                      <span className="text-red-600 font-bold bg-red-50 px-1 rounded">
                                        Act: {cust.realSequence}
                                      </span>
                                    </>
                                  )}

                                  <span className="text-gray-300">|</span>
                                  <span>{displayId}</span>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Map Area */}
          <div className="flex-1 relative z-0 bg-gray-100 h-full">
            {activeDriver && markers.length > 0 ? (
              <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapController points={markers.map((m) => m.pos)} focusCoords={focusLocation} />

                <Polyline
                  positions={roPath}
                  pathOptions={{ color: '#3b82f6', weight: 4, dashArray: '10, 10', opacity: 0.6 }}
                />

                <Polyline
                  positions={actualPath}
                  pathOptions={{ color: '#dc2626', weight: 3, opacity: 0.8 }}
                />

                {markers.map((m) => {
                  const isMatch = m.roSequence === m.realSequence;
                  const markerKey = `${m.roSequence}-${m.customerName}`;

                  // --- Perhitungan Waktu ---
                  const etaMin = timeToMin(m.eta);
                  const etdMin = timeToMin(m.etd);
                  const arrMin = timeToMin(m.actualArrival);
                  const depMin = timeToMin(m.actualDeparture);

                  const isArrivalOk = arrMin !== null && etaMin !== null ? arrMin <= etaMin : true;
                  const isDepartureOk =
                    depMin !== null && etdMin !== null ? depMin <= etdMin : true;
                  const isNotLate = isArrivalOk && isDepartureOk;

                  const planVisit = parseInt(m.visitTime) || 0;
                  const actVisit = parseInt(m.actualVisitTime) || 0;
                  const diffVisit = actVisit - planVisit;

                  return (
                    <Marker
                      key={markerKey}
                      position={m.pos}
                      icon={isMatch ? blueIcon : redIcon}
                      ref={(el) => {
                        if (el) markerRefs.current[markerKey] = el;
                      }}
                    >
                      <Popup>
                        <div className="p-1 min-w-60">
                          <h4 className="font-bold text-gray-900 text-sm mb-2 border-b pb-1">
                            {m.customerName}
                          </h4>
                          <div className="space-y-1.5 text-xs text-gray-600">
                            <div className="flex justify-between">
                              <span>RO Sequence:</span>
                              <span className="font-bold text-blue-600">{m.roSequence}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Actual Sequence:</span>
                              <span className="font-bold text-red-600">
                                {m.realSequence || '-'}
                              </span>
                            </div>

                            <div className="border-t border-dashed mt-2 pt-1 space-y-1">
                              <div className="flex justify-between">
                                <span>ETA - ETD:</span>
                                <span className="font-medium">
                                  {m.eta} - {m.etd}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Act Arr - Dep:</span>
                                <span className="font-medium">
                                  {m.actualArrival} - {m.actualDeparture}
                                </span>
                              </div>
                              <div className="flex justify-between items-cente">
                                <span>Status Waktu:</span>
                                <span
                                  className={`font-bold ${isNotLate ? 'text-green-600' : 'text-red-600'}`}
                                >
                                  {isNotLate ? 'Tepat Waktu' : 'Terlambat'}
                                </span>
                              </div>
                            </div>

                            <div className="border-t border-dashed pt-1 space-y-1">
                              <div className="flex justify-between">
                                <span>Visit Time:</span>
                                <span>{planVisit} min</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Actual Visit:</span>
                                <div className="flex items-center gap-1">
                                  <span className="font-bold">{actVisit} min</span>
                                  {diffVisit !== 0 && (
                                    <span
                                      className={`text-[10px] font-bold ${diffVisit > 0 ? 'text-red-600' : 'text-green-600'}`}
                                    >
                                      ({diffVisit > 0 ? '+' : ''}
                                      {diffVisit})
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <svg
                  className="w-16 h-16 mb-4 text-gray-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                  />
                </svg>
                <p>Pilih driver di sebelah kiri untuk melihat peta.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
