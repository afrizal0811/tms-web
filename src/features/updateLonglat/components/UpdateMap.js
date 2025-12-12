// File: src/features/updateLonglat/components/UpdateMap.js
'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';

// Fix icon default Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const redIcon = new L.Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const blueIcon = new L.Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// --- LOGIC HIGHLIGHT ---
function HighlightEffect({ activeCoords, highlightTrigger, markerRefs }) {
  const map = useMap();

  useEffect(() => {
    if (!activeCoords) return;

    // Parsing Koordinat
    const [lat, lng] = activeCoords.split(',').map(Number);

    if (!isNaN(lat) && !isNaN(lng)) {
      // Terbang ke lokasi (Zoom level 18)
      map.flyTo([lat, lng], 18, {
        animate: true,
        duration: 1.5,
      });

      // Buka Popup jika marker tersedia
      const marker = markerRefs.current[activeCoords];
      if (marker) {
        setTimeout(() => {
          marker.openPopup();
        }, 300);
      }
    }
  }, [activeCoords, highlightTrigger, map, markerRefs]);

  return null;
}

// --- LOGIC INITIAL ZOOM (Tanpa Lock) ---
function InitialFitBounds({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0) return;

    // Hitung area yang mencakup semua titik
    const bounds = L.latLngBounds(points);

    // Sesuaikan zoom agar semua titik terlihat (dengan padding)
    map.fitBounds(bounds, { padding: [50, 50] });

    // HAPUS LOGIKA setMinZoom DI SINI
    // User sekarang bebas zoom out setelah inisialisasi selesai.
  }, [map, points]);

  return null;
}

export default function UpdateMap({ data, activeCoords, highlightTrigger }) {
  const mapElements = [];
  const allPoints = [];
  const markerRefs = useRef({});

  data.forEach((item, index) => {
    if (!item.newLonglat || !item.oldLonglat) return;

    const [newLat, newLng] = item.newLonglat.split(',').map(Number);
    const [oldLat, oldLng] = item.oldLonglat.split(',').map(Number);

    if (isNaN(newLat) || isNaN(oldLat)) return;

    const newPos = [newLat, newLng];
    const oldPos = [oldLat, oldLng];

    allPoints.push(newPos);
    allPoints.push(oldPos);

    // Marker Baru (Biru)
    mapElements.push(
      <Marker
        key={`new-${index}`}
        position={newPos}
        icon={blueIcon}
        ref={(el) => {
          if (el) markerRefs.current[item.newLonglat] = el;
        }}
      >
        <Popup>
          <strong>Lokasi Baru (Input User)</strong>
          <br />
          Driver: {item.driverName}
          <br />
          Tgl: {item.date}
        </Popup>
      </Marker>
    );

    // Marker Lama (Merah)
    mapElements.push(
      <Marker key={`old-${index}`} position={oldPos} icon={redIcon} opacity={0.6}>
        <Popup>
          <strong>Lokasi Master (Lama)</strong>
          <br />
          Referensi Awal
        </Popup>
      </Marker>
    );

    mapElements.push(
      <Polyline
        key={`line-${index}`}
        positions={[oldPos, newPos]}
        pathOptions={{ color: 'blue', dashArray: '5, 10', opacity: 0.5 }}
      />
    );
  });

  if (allPoints.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 text-gray-400 text-sm">
        Data koordinat tidak valid untuk ditampilkan di peta.
      </div>
    );
  }

  return (
    <MapContainer
      center={allPoints[0]}
      zoom={13}
      style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {mapElements}

      {/* Gunakan komponen baru tanpa lock */}
      <InitialFitBounds points={allPoints} />

      <HighlightEffect
        activeCoords={activeCoords}
        highlightTrigger={highlightTrigger}
        markerRefs={markerRefs}
      />
    </MapContainer>
  );
}
