'use client';

import BaseModal from '@/components/BaseModal';
import Tooltip from '@/components/Tooltip';
import { isEmpty } from '@/lib/utils';
import { useEffect, useRef } from 'react';

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
      const addMarker = (lat, lon, labelText, isOut, tooltipContent) => {
        bounds.push([lat, lon]);
        const bgColor = isOut ? 'bg-red-500' : 'bg-sky-500';
        const icon = L.divIcon({
          className: 'bg-transparent border-none',
          html: `<div class="flex items-center justify-center rounded-full text-white font-bold text-[10px] w-8 h-8 ${bgColor} border-2 border-white shadow-md">${labelText}</div>`,
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

        if (entry.startLat && entry.startLon) {
          const tooltipContent = `${translate('summary.tabs.time_driver.modal.start_time')}: ${entry.startDisplay}`;
          addMarker(entry.startLat, entry.startLon, sText, entry.isStartOutRadius, tooltipContent);
        }

        if (entry.finishLat && entry.finishLon) {
          const tooltipContent = `${translate('summary.tabs.time_driver.modal.finish_time')}: ${entry.finishDisplay}`;
          addMarker(
            entry.finishLat,
            entry.finishLon,
            fText,
            entry.isFinishOutRadius,
            tooltipContent
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

  if (!data) return null;

  const { driverName, dateStr, entries } = data;

  const totalMinutes = entries.reduce(
    (acc, curr) => acc + parseDurationToMinutes(curr.durationDisplay),
    0
  );
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  const totalDurationFormatted = `${String(totalHours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}`;

  const tableData = (
    <>
      <div className="overflow-x-auto border border-gray-200 dark:border-slate-700 rounded-lg">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 font-bold border-b border-gray-200 dark:border-slate-700">
            <tr>
              <th className="px-4 py-3 text-center">#</th>
              <th className="px-4 py-3 text-center">
                {translate('summary.tabs.time_driver.modal.start_time')}
              </th>
              <th className="px-4 py-3 text-center">
                {translate('summary.tabs.time_driver.modal.finish_time')}
              </th>
              <th className="px-4 py-3 text-center">
                {translate('summary.tabs.time_driver.modal.duration')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700 bg-white dark:bg-slate-900">
            {entries.map((entry, idx) => {
              const hasOutStart = entry.isStartOutRadius;
              const hasOutFinish = entry.isFinishOutRadius;
              const diffDay = entry.dayDiff;
              const hasDiffDay = !isEmpty(diffDay);

              const diffDayTooltip = hasDiffDay
                ? `${hasOutFinish ? '\n- ' : ''}${translate('summary.tabs.time_driver.tooltip.diff_day', { days: diffDay })} `
                : '';
              const outFinishTooltip = `${hasDiffDay ? '- ' : ''}${translate('summary.tabs.time_driver.tooltip.out_finish')} ${diffDayTooltip}`;
              return (
                <tr
                  key={idx}
                  className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <td className="px-4 py-2 text-center text-gray-500 dark:text-slate-400 font-medium">
                    {idx + 1}
                  </td>
                  <Tooltip
                    tooltipContent={
                      hasOutStart ? translate('summary.tabs.time_driver.tooltip.out_start') : ''
                    }
                  >
                    <td
                      className={`px-4 py-2 text-center dark:text-slate-300 ${hasOutStart ? 'bg-red-100 dark:bg-red-900/40' : ''}`}
                    >
                      {entry.startDisplay}
                    </td>
                  </Tooltip>
                  <Tooltip tooltipContent={hasOutFinish ? outFinishTooltip : diffDayTooltip}>
                    <td
                      className={`px-4 py-2 text-center dark:text-slate-300 ${hasOutFinish ? 'bg-red-100 dark:bg-red-900/40' : ''}`}
                    >
                      {entry.finishDisplay}
                      {entry.dayDiff > 0 && (
                        <span className="text-red-600 dark:text-red-400 text-xs ml-1 font-bold">
                          (+{entry.dayDiff})
                        </span>
                      )}
                    </td>
                  </Tooltip>
                  <td className="px-4 py-2 text-center font-medium text-slate-700 dark:text-slate-200">
                    {entry.durationDisplay}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-gray-50 dark:bg-slate-800/50 font-bold border-t-2 border-gray-200 dark:border-slate-700">
            <tr>
              <td className="px-4 py-3 text-center text-gray-600 dark:text-slate-400 uppercase text-[10px] tracking-wider">
                Total
              </td>
              <td></td>
              <td></td>
              <td className="px-4 py-3 text-center text-slate-800 dark:text-slate-200">
                {totalDurationFormatted}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="mt-1 mb-2 text-xs text-slate-500 dark:text-slate-400 italic">
        {translate('summary.tabs.time_driver.modal.footer_note')}
      </div>
    </>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div>
          <h3 className="text-lg font-bold">{driverName}</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-normal">{dateStr}</p>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="h-[450px] w-full rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 relative z-0">
          <div ref={mapContainerRef} className="w-full h-full" />
        </div>
        {hasMultipleData && tableData}
      </div>
    </BaseModal>
  );
}
