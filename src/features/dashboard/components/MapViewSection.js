import { useLanguage } from '@/context/LanguageContext';
import { isEmpty, parseCoordinates } from '@/lib/utils';
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
  const size = isHighlight ? 24 : 16;
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
    iconAnchor: [size / 2, size / 2],
  });
};

const createNumberedIcon = (content, bgClassName) => {
  let fontSize = 'text-xs';
  if (isEmpty(content) || content === '?') fontSize = 'text-lg';
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
  if (!segments || isEmpty(segments)) return null;
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

const LegendItem = ({ color, label }) => (
  <div className="flex items-center gap-1.5">
    <span className={`w-3 h-3 rounded-full ${color}`}></span>
    <span className="whitespace-nowrap">{label}</span>
  </div>
);

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
  const { t } = useLanguage();
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

  // REQ 1: Hitung Completed Pickups
  const { pickupCount, completedPickupCount } = useMemo(() => {
    if (!tasks) return { pickupCount: 0, completedPickupCount: 0 };
    const pickups = tasks.filter((t) => t.flow === 'Pickup');
    const done = pickups.filter((t) => !isEmpty(t.realSequence));
    return { pickupCount: pickups.length, completedPickupCount: done.length };
  }, [tasks]);

  const pathSegments = useMemo(() => {
    if (isEmpty(sortedTasks)) return [];

    const hubTask = sortedTasks.find((t) => t.type === 'HUB_START');
    if (!hubTask || !hubTask.lat || !hubTask.lng) return [];
    const hubCoords = [hubTask.lat, hubTask.lng];

    const routeTasks = sortedTasks.filter((t) => t.type !== 'HUB_START' && t.type !== 'HUB_END');
    let points = [];

    // REQ 3: Logic Panah Actual Map
    if (!isActualMap) {
      // PLAN MAP (Semua connected sesuai roSequence)
      points.push({ coords: hubCoords, name: 'HUB', flow: 'HUB' });
      routeTasks.forEach((t) => {
        const displayName = resolveDisplayName(t.customerName, t.flow);
        points.push({ coords: [t.lat, t.lng], name: displayName, flow: t.flow });
      });
      points.push({ coords: hubCoords, name: 'HUB_END', flow: 'HUB' });
    } else {
      // ACTUAL MAP
      // 1. Mulai dari HUB
      points.push({ coords: hubCoords, name: 'HUB', flow: 'HUB' });

      // 2. Ambil hanya task yang sudah punya realSequence (sudah dikunjungi)
      const doneTasks = routeTasks.filter((t) => !isEmpty(t.realSequence));

      // 3. Urutkan berdasarkan realSequence (1, 2, 3...)
      doneTasks.sort((a, b) => (a.realSequence || 0) - (b.realSequence || 0));

      doneTasks.forEach((t) => {
        const displayName = resolveDisplayName(t.customerName, t.flow);
        points.push({ coords: [t.lat, t.lng], name: displayName, flow: t.flow });
      });

      // 4. Cek apakah SEMUA task sudah selesai?
      // Jika jumlah yang selesai == total route tasks, baru tarik garis balik ke HUB
      if (doneTasks.length === routeTasks.length && routeTasks.length > 0) {
        points.push({ coords: hubCoords, name: 'HUB_END', flow: 'HUB' });
      }
    }

    let segments = [];
    for (let i = 0; i < points.length - 1; i++) {
      const currentPoint = points[i];
      const nextPoint = points[i + 1];
      let isHighlight = false;

      if (selectedCustomer) {
        if (selectedCustomer === 'HUB') {
          if (currentPoint.name === 'HUB') isHighlight = true;
        } else if (selectedCustomer === 'Pickup') {
          if (currentPoint.flow === 'Pickup') isHighlight = true;
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
      const displayName = resolveDisplayName(t.customerName, t.flow);
      if (selectedCustomer === 'HUB' && (t.type === 'HUB_START' || t.type === 'HUB_END'))
        return true;
      if (selectedCustomer === 'Pickup' && t.flow === 'Pickup') return true;
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
          {sortedTasks.length} {t('common.point')}
        </span>
      </div>

      {showInfoCard && activeTask && (
        <InfoCard
          task={activeTask}
          onClose={onCloseCard}
          customTitle={
            selectedCustomer === 'Pickup'
              ? 'Pickup'
              : resolveDisplayName(activeTask.customerName, activeTask.flow)
          }
          pickupCount={pickupCount}
          completedPickupCount={completedPickupCount} // REQ 1: Pass Prop
          isActualMap={isActualMap}
          t={t}
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
                let finalContent = seqNum;
                let markerBgClass = 'bg-[#2563EB]';

                const isHub = task.type === 'HUB_START' || task.type === 'HUB_END';
                const flow = (task.flow || '').toLowerCase();
                const isCompleted = !isEmpty(task.realSequence);

                if (isHub) {
                  markerBgClass = 'bg-[#000000]';
                  finalContent = 'HUB';
                } else if (isCompleted) {
                  if (flow.includes('pickup')) {
                    // REQ 1: Pickup hanya hijau jika SEMUA pickup sudah selesai
                    const allPickupDone = pickupCount > 0 && completedPickupCount === pickupCount;
                    if (allPickupDone) {
                      markerBgClass = isActualMap ? 'bg-[#16A34A]' : 'bg-[#0D9488]';
                    } else {
                      // Jika belum semua selesai, tetap Ungu meski yang ini sudah selesai
                      markerBgClass = 'bg-[#9333EA]';
                    }
                  } else {
                    // Flow Lain: Langsung Hijau/Teal jika completed
                    if (isActualMap) {
                      markerBgClass = 'bg-[#16A34A]';
                    } else {
                      markerBgClass = 'bg-[#0D9488]';
                    }
                  }
                } else {
                  // Not Completed
                  if (task.isManualAssign) {
                    markerBgClass = 'bg-[#64748B]';
                    finalContent = isActualMap ? seqNum : '-';
                  } else if (flow.includes('pickup')) {
                    markerBgClass = 'bg-[#9333EA]';
                  } else if (flow.includes('re delivery')) {
                    markerBgClass = 'bg-[#F97316]';
                  } else if (flow.includes('pending gr')) {
                    markerBgClass = 'bg-[#FFDE21]';
                  } else {
                    markerBgClass = 'bg-[#2563EB]';
                  }
                }

                return (
                  <Marker
                    key={`${sequenceKey}-${idx}`}
                    position={[task.lat, task.lng]}
                    icon={createNumberedIcon(finalContent, markerBgClass)}
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
            {t('dashboard.map.no_coordinate')}
          </div>
        )}
      </div>

      <div className="hidden md:flex flex-wrap px-4 py-2 bg-gray-50 border-t  gap-x-4 gap-y-2 text-[10px] text-gray-600 font-medium z-10 shrink-0">
        {!isActualMap ? (
          <LegendItem
            color="bg-[#0D9488]"
            label={`${t('dashboard.map.plan')} ${t('dashboard.map.completed')}`}
          />
        ) : (
          <LegendItem
            color="bg-[#16A34A]"
            label={`${t('dashboard.map.real')} ${t('dashboard.map.completed')}`}
          />
        )}
        <LegendItem color="bg-[#000000]" label="HUB" />
        <LegendItem color="bg-[#2563EB]" label="Delivery" />
        <LegendItem color="bg-[#F97316]" label="Re Delivery" />
        <LegendItem color="bg-[#FFDE21]" label="Pending GR" />
        <LegendItem color="bg-[#9333EA]" label="Pickup" />
        <LegendItem color="bg-[#64748B]" label="Manual Assign" />
      </div>
    </div>
  );
};

export default MapViewSection;
