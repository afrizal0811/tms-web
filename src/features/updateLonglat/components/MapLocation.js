'use client';

import { isEmpty } from '@/lib/utils';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';

// Fix default icon Leaflet
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

// --- Fungsi Pembantu: Format Koordinat 6 Desimal ---
const formatToSix = (coordStr) => {
  if (!coordStr) return '-';
  return coordStr
    .split(',')
    .map((num) => {
      const n = parseFloat(num.trim());
      return isNaN(n) ? num : n.toFixed(6);
    })
    .join(', ');
};

function HighlightEffect({ activeCoords, highlightTrigger, markerRefs }) {
  const map = useMap();
  useEffect(() => {
    if (!activeCoords) return;
    const [lat, lng] = activeCoords.split(',').map(Number);
    if (isNaN(lat) || isNaN(lng)) return;
    map.flyTo([lat, lng], 18, { animate: true, duration: 1.5 });
    const marker = markerRefs.current[activeCoords];
    if (marker) {
      setTimeout(() => marker.openPopup(), 300);
    }
  }, [activeCoords, highlightTrigger, map, markerRefs]);
  return null;
}

function InitialFitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points || isEmpty(points)) return;
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [map, points]);
  return null;
}

export default function MapLocation({ data, activeCoords, highlightTrigger, t, lang }) {
  const markerRefs = useRef({});

  const latestOldPoint = useMemo(() => {
    if (!data || isEmpty(data)) return null;
    let latest = null;
    for (const item of data) {
      if (!item.oldLonglat || !item.date) continue;
      const [d, m, y] = item.date.split('/');
      const parsedDate = new Date(`${y}-${m}-${d}`);
      if (!latest || parsedDate > latest.parsedDate) {
        latest = {
          oldLonglat: item.oldLonglat,
          parsedDate,
          distanceDiff: item.distanceDiff,
        };
      }
    }
    return latest;
  }, [data]);

  const { mapElements, allPoints } = useMemo(() => {
    const elements = [];
    const points = [];
    const distanceText = `${t('common.to')} ${t('longlat.modal.new_loc')}`.toLowerCase();

    if (latestOldPoint) {
      const [lat, lng] = latestOldPoint.oldLonglat.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lng)) {
        const pos = [lat, lng];
        points.push(pos);
        elements.push(
          <Marker key="old-latest" position={pos} icon={redIcon} opacity={0.7}>
            <Popup>
              <div className="flex flex-col gap-1 text-xs m-0">
                <strong className="text-gray-900 leading-none">{t('longlat.modal.old_loc')}</strong>
                <span className="font-mono leading-none">
                  {formatToSix(latestOldPoint.oldLonglat)}
                </span>
                {latestOldPoint.distanceDiff !== undefined && (
                  <span className="text-slate-500 italic border-t border-slate-200 pt-1 mt-0.5 leading-none">
                    {latestOldPoint.distanceDiff.toLocaleString(lang)} m {distanceText}
                  </span>
                )}
              </div>
            </Popup>
          </Marker>
        );
      }
    }

    data.forEach((item, index) => {
      if (!item.newLonglat || !item.oldLonglat) return;
      const [newLat, newLng] = item.newLonglat.split(',').map(Number);
      const [oldLat, oldLng] = item.oldLonglat.split(',').map(Number);
      if (isNaN(newLat) || isNaN(oldLat)) return;

      const newPos = [newLat, newLng];
      const oldPos = [oldLat, oldLng];
      points.push(newPos);

      elements.push(
        <Marker
          key={`new-${index}`}
          position={newPos}
          icon={blueIcon}
          ref={(el) => {
            if (el) markerRefs.current[item.newLonglat] = el;
          }}
        >
          <Popup>
            <div className="flex flex-col gap-1 text-xs m-0">
              <strong className="text-gray-900 leading-none">{t('longlat.modal.new_loc')}</strong>
              <span className="font-mono leading-none">{formatToSix(item.newLonglat)}</span>
              <span className="leading-none mt-0.5">
                <span className="font-semibold">{t('common.driver')}:</span> {item.driverName}
              </span>
            </div>
          </Popup>
        </Marker>
      );

      elements.push(
        <Polyline
          key={`line-${index}`}
          positions={[oldPos, newPos]}
          pathOptions={{ color: 'blue', dashArray: '5, 10', opacity: 0.5 }}
        />
      );
    });

    return { mapElements: elements, allPoints: points };
  }, [data, latestOldPoint, t, lang]);

  if (isEmpty(allPoints)) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 text-gray-400 text-sm">
        {t('longlat.map.invalid_data')}
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
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {mapElements}
      <InitialFitBounds points={allPoints} />
      <HighlightEffect
        activeCoords={activeCoords}
        highlightTrigger={highlightTrigger}
        markerRefs={markerRefs}
      />
    </MapContainer>
  );
}
