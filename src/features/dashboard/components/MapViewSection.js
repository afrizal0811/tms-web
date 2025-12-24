import { parseCoordinates } from '@/lib/utils';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import dynamic from 'next/dynamic';
import { useEffect, useMemo } from 'react';
import { useMap } from 'react-leaflet';
import InfoCard from './InfoCard';

const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), {
  ssr: false,
});
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), {
  ssr: false,
});
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then((mod) => mod.Polyline), { ssr: false });

const getAngle = (lat1, lng1, lat2, lng2) => {
  const dy = lat2 - lat1;
  const dx = lng2 - lng1;
  let theta = Math.atan2(dy, dx);
  theta *= 180 / Math.PI;
  return theta;
};

const createArrowIcon = (angle, color, isHighlight = false) => {
  const size = isHighlight ? 24 : 16; // Lebih besar jika highlight
  const fontSize = isHighlight ? '20px' : '14px';

  return new L.DivIcon({
    className: 'arrow-icon',
    html: `
      <div style="
        transform: rotate(${-angle}deg); 
        color: ${color}; 
        font-size: ${fontSize}; 
        font-weight: 900;
        filter: drop-shadow(1px 1px 0px white);
        display: flex; justify-content: center; align-items: center;
        width: 100%; height: 100%;
      ">
        ➤
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2], // Center anchor dynamic
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
        const startArrowLat = start[0] + (end[0] - start[0]) * 0.1;
        const startArrowLng = start[1] + (end[1] - start[1]) * 0.1;
        const midLat = (start[0] + end[0]) / 2;
        const midLng = (start[1] + end[1]) / 2;
        const endLat = start[0] + (end[0] - start[0]) * 0.9;
        const endLng = start[1] + (end[1] - start[1]) * 0.9;
        const arrowZIndex = isHighlight ? 1000 : -50;

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
              position={[startArrowLat, startArrowLng]}
              icon={createArrowIcon(angle, color, isHighlight)}
              zIndexOffset={arrowZIndex}
              interactive={false}
            />
            <Marker
              position={[midLat, midLng]}
              icon={createArrowIcon(angle, color, isHighlight)}
              zIndexOffset={arrowZIndex}
              interactive={false}
            />
            <Marker
              position={[endLat, endLng]}
              icon={createArrowIcon(angle, color, isHighlight)}
              zIndexOffset={arrowZIndex}
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
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 400);
    return () => {
      setMap(null);
      clearTimeout(timer);
    };
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
      .filter((t) => t.longlat && t.longlat.includes(','))
      .map((t) => {
        const parsed = parseCoordinates(t.longlat);
        if (parsed) return { ...t, lat: parsed.lat, lng: parsed.lon };
        const [lat, lng] = t.longlat.split(',').map(Number);
        return { ...t, lat, lng };
      })
      .sort((a, b) => (a[sequenceKey] || 9999) - (b[sequenceKey] || 9999));
    return applyJitter(valid);
  }, [tasks, sequenceKey]);

  // FIX ERROR 2: Gunakan disable-line jika linter salah deteksi, tapi pastikan variabel benar-benar dipakai
  const pathSegments = useMemo(() => {
    if (sortedTasks.length === 0) return [];

    const hubTask = sortedTasks.find((t) => t.type === 'HUB_START');
    if (!hubTask || !hubTask.lat || !hubTask.lng) return [];
    const hubCoords = [hubTask.lat, hubTask.lng];

    const routeTasks = sortedTasks.filter((t) => t.type !== 'HUB_START' && t.type !== 'HUB_END');
    let points = [];

    // Menggunakan isActualMap
    if (!isActualMap) {
      points.push({ coords: hubCoords, name: 'HUB' });
      routeTasks.forEach((t) => {
        // Menggunakan resolveDisplayName
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
      points.push({ coords: hubCoords, name: 'HUB_END' });
    }

    let segments = [];
    for (let i = 0; i < points.length - 1; i++) {
      const currentPoint = points[i];
      const nextPoint = points[i + 1];
      let isHighlight = false;

      // Menggunakan selectedCustomer
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

  // FIX ERROR 3: Sama, suppress jika perlu
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
    <div className="flex flex-col flex-1 bg-white border rounded-lg overflow-hidden shadow-sm relative min-h-0">
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

      <div className="flex-1 w-full relative z-0 min-h-0 bg-slate-50">
        {sortedTasks.length > 0 ? (
          <div className="absolute inset-0 w-full h-full">
            <MapContainer
              center={[-6.2, 106.8]}
              zoom={10}
              className="w-full h-full"
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution="&copy; OpenStreetMap"
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
                if (isHub) {
                  finalColorClass = 'bg-green-600';
                  finalContent = 'HUB';
                } else if (task.isManualAssign) {
                  finalColorClass = 'bg-gray-400';
                  finalContent = isActualMap ? seqNum : '-';
                } else if (task.flow && task.flow.toLowerCase().includes('pickup')) {
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
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 text-gray-400 text-sm">
            Tidak ada data koordinat.
          </div>
        )}
      </div>

      <div className="px-4 py-2 bg-gray-50 border-t flex flex-wrap gap-4 text-[10px] text-gray-600 font-medium z-10 shrink-0">
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

export default MapViewSection;
