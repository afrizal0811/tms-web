'use client';

import Modal from '@/components/Modal';
import CustomTable from '@/components/table/CustomTable';
import Tooltip from '@/components/Tooltip';
import { formatDateUniversal, isEmpty } from '@/lib/utils';
import { useEffect, useMemo, useRef } from 'react';

const parseDurationToMinutes = (str) => {
  if (!str) return 0;
  const [hours, minutes] = str.split(':').map(Number);
  return hours * 60 + (minutes || 0);
};

export default function TimeDriverModal({ isOpen, onClose, data, translate }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const hasMultipleData = data && data.entries.length > 1;

  useEffect(() => {
    if (!isOpen || !data || !mapContainerRef.current) return;

    let isMounted = true;

    (async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      if (!isMounted) return;

      if (!mapInstanceRef.current) {
        mapInstanceRef.current = L.map(mapContainerRef.current);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(
          mapInstanceRef.current
        );
      }

      const map = mapInstanceRef.current;

      map.eachLayer((layer) => {
        if (layer instanceof L.Marker || layer instanceof L.Circle || layer instanceof L.Tooltip) {
          map.removeLayer(layer);
        }
      });

      const bounds = [];
      const activeHubLocation = data.activeHubLocation;

      // Render Hub & Radius
      if (activeHubLocation) {
        bounds.push([activeHubLocation.lat, activeHubLocation.lng]);
        L.circle([activeHubLocation.lat, activeHubLocation.lng], {
          radius: 500,
          color: '#22c55e',
          fillColor: '#22c55e',
          fillOpacity: 0.2,
          weight: 1,
        }).addTo(map);

        const hubIcon = L.divIcon({
          className: 'bg-transparent border-none',
          html: `<div class="flex items-center justify-center rounded-full text-white font-bold text-[10px] w-8 h-8 bg-green-500 border-2 border-white shadow-md">HUB</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
        L.marker([activeHubLocation.lat, activeHubLocation.lng], { icon: hubIcon }).addTo(map);
      }

      // Helper for repetitive marker creation
      const addMarker = (lat, lon, labelText, isOut, tooltipContent, hasDayDiff = false) => {
        bounds.push([lat, lon]);
        const bgColor = isOut ? 'bg-red-500' : 'bg-sky-500';
        const dayDiffBorder = hasDayDiff ? 'border-red-500' : 'border-white';
        const icon = L.divIcon({
          className: 'bg-transparent border-none',
          html: `<div class="flex items-center justify-center rounded-full text-white font-bold text-[10px] w-8 h-8 ${bgColor} border-2 ${dayDiffBorder} shadow-md">${labelText}</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
        L.marker([lat, lon], { icon })
          .bindTooltip(tooltipContent, { direction: 'top', offset: [0, -10] })
          .addTo(map);
      };

      // Render Start / Finish markers
      data.entries.forEach((entry, idx) => {
        const sText = data.entries.length > 1 ? `S${idx + 1}` : 'S';
        const fText = data.entries.length > 1 ? `F${idx + 1}` : 'F';
        const hasDayDiff = entry.dayDiff > 0;
        if (entry.startLat && entry.startLon) {
          const tooltipContent = `<b>${translate('summary.tabs.time_driver.modal.start_time')}</b><br>${formatDateUniversal(entry.startTime, 'DD/MM/YYYY HH:mm')}`;
          addMarker(entry.startLat, entry.startLon, sText, entry.isStartOutRadius, tooltipContent);
        }

        if (entry.finishLat && entry.finishLon) {
          const tooltipContent = `<b>${translate('summary.tabs.time_driver.modal.finish_time')}</b><br>${formatDateUniversal(entry.finishTime, 'DD/MM/YYYY HH:mm')} <span class="text-red-500">${hasDayDiff ? `(+${entry.dayDiff})` : ''}</span>`;
          addMarker(
            entry.finishLat,
            entry.finishLon,
            fText,
            entry.isFinishOutRadius,
            tooltipContent,
            hasDayDiff
          );
        }
      });

      if (bounds.length > 0) {
        map.fitBounds(L.latLngBounds(bounds), { padding: [30, 30], maxZoom: 16 });
      }

      setTimeout(() => {
        if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
      }, 100);
    })();

    return () => {
      isMounted = false;
    };
  }, [isOpen, data, translate]);

  useEffect(() => {
    if (!isOpen && mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
  }, [isOpen]);

  const tableEntries = useMemo(() => {
    if (!data || !data.entries) return [];
    return data.entries.map((entry, index) => ({
      ...entry,
      no: index + 1,
    }));
  }, [data]);

  if (!data) return null;

  const { driverName, dateStr, entries } = data;

  const totalMinutes = entries.reduce(
    (acc, curr) => acc + parseDurationToMinutes(curr.durationDisplay),
    0
  );
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  const totalDurationFormatted = `${String(totalHours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}`;

  const columns = [
    {
      key: 'no',
      width: 'w-[10%]',
      sortable: false,
      label: '#',
      align: 'center',
      render: (row) => (
        <div className="text-center text-gray-500 dark:text-slate-400 font-medium w-full">
          {row.no}
        </div>
      ),
    },
    {
      key: 'start',
      width: 'w-[30%]',
      sortable: false,
      align: 'center',
      label: translate('summary.tabs.time_driver.modal.start_time'),
      render: (row) => {
        const hasOutStart = row.isStartOutRadius;
        const content = (
          <div
            className={`w-full text-center px-2 py-1 rounded ${hasOutStart ? 'bg-red-100 dark:bg-red-900/40 text-slate-700 dark:text-slate-300' : 'text-slate-700 dark:text-slate-300'}`}
          >
            {row.startDisplay}
          </div>
        );
        return hasOutStart ? (
          <Tooltip tooltipContent={translate('summary.tabs.time_driver.tooltip.out_start')}>
            {content}
          </Tooltip>
        ) : (
          content
        );
      },
    },
    {
      key: 'finish',
      width: 'w-[30%]',
      sortable: false,
      align: 'center',
      label: translate('summary.tabs.time_driver.modal.finish_time'),
      render: (row) => {
        const hasOutFinish = row.isFinishOutRadius;
        const diffDay = row.dayDiff;
        const hasDiffDay = !isEmpty(diffDay);
        const diffDayTooltip = hasDiffDay
          ? `${hasOutFinish ? '\n- ' : ''}${translate('summary.tabs.time_driver.tooltip.diff_day', { days: diffDay })} `
          : '';
        const outFinishTooltip = `${hasDiffDay ? '- ' : ''}${translate('summary.tabs.time_driver.tooltip.out_finish')} ${diffDayTooltip}`;

        const content = (
          <div
            className={`w-full text-center px-2 py-1 rounded ${hasOutFinish ? 'bg-red-100 dark:bg-red-900/40 text-slate-700 dark:text-slate-300' : 'text-slate-700 dark:text-slate-300'}`}
          >
            {row.finishDisplay}
            {row.dayDiff > 0 && (
              <span className="text-red-600 dark:text-red-400 text-xs ml-1 font-bold">
                (+{row.dayDiff})
              </span>
            )}
          </div>
        );

        return hasOutFinish || hasDiffDay ? (
          <Tooltip tooltipContent={hasOutFinish ? outFinishTooltip : diffDayTooltip}>
            {content}
          </Tooltip>
        ) : (
          content
        );
      },
    },
    {
      key: 'duration',
      width: 'w-[30%]',
      sortable: false,
      align: 'center',
      label: translate('summary.tabs.time_driver.modal.duration'),
      render: (row) => (
        <div className="text-center font-medium text-slate-700 dark:text-slate-200 w-full">
          {row.durationDisplay}
        </div>
      ),
    },
  ];

  const tableData = (
    <>
      <div className="overflow-hidden border border-gray-200 dark:border-slate-700 rounded-lg flex flex-col">
        <CustomTable columns={columns} data={tableEntries} />
        <div className="flex bg-gray-50 dark:bg-slate-800/50 font-bold border-t-2 border-gray-200 dark:border-slate-700">
          <div className="w-[70%] px-4 py-3 text-center text-gray-600 dark:text-slate-400 uppercase text-[10px] tracking-wider">
            Total
          </div>
          <div className="w-[30%] text-sm px-4 py-3 text-center text-slate-800 dark:text-slate-200">
            {totalDurationFormatted}
          </div>
        </div>
      </div>
      <div className="mt-1 mb-2 text-xs text-slate-500 dark:text-slate-400 italic">
        {translate('summary.tabs.time_driver.modal.footer_note')}
      </div>
    </>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={driverName} subtitle={dateStr}>
      <div className="flex flex-col gap-4">
        <div className="h-[450px] w-full rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 relative z-0">
          <div ref={mapContainerRef} className="w-full h-full" />
        </div>
        {hasMultipleData && tableData}
      </div>
    </Modal>
  );
}
