// File: src/features/summary/tabs/modals/TruckDetailModal.js
import BaseModal from '@/components/BaseModal';
import Tooltip from '@/components/Tooltip';
import {
  formatDateUniversal,
  formatLongDate,
  isEmpty,
  parseCoordinates,
  parseCustomerString,
} from '@/lib/utils';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const TaskMap = dynamic(
  async () => {
    const reactLeaflet = await import('react-leaflet');
    const leaflet = await import('leaflet');
    const L = leaflet.default || leaflet;
    const { MapContainer, TileLayer, Marker, Tooltip: LeafletTooltip, useMap } = reactLeaflet;

    const createIcon = (initial, bgColor) =>
      L.divIcon({
        className: 'bg-transparent border-0',
        html: `<div style="background-color: ${bgColor}; color: white; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.4); font-size: 14px;">${initial}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

    function BoundsUpdater({ d, e }) {
      const map = useMap();
      useEffect(() => {
        const bounds = L.latLngBounds();
        let hasPoint = false;
        if (d) {
          bounds.extend([d.lat, d.lon]);
          hasPoint = true;
        }
        if (e) {
          bounds.extend([e.lat, e.lon]);
          hasPoint = true;
        }
        if (hasPoint) {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
        }
      }, [d, e, map]);
      return null;
    }

    return function MapView({ doneCoord, expectedCoord, translate, isIndonesian }) {
      const dPos = parseCoordinates(doneCoord);
      const ePos = parseCoordinates(expectedCoord);

      if (!dPos && !ePos) {
        return (
          <div className="w-full h-full flex items-center justify-center text-slate-500 bg-gray-100 dark:bg-slate-800">
            {translate('common.no_data')}
          </div>
        );
      }

      return (
        <MapContainer
          center={dPos || ePos}
          zoom={13}
          style={{ height: '100%', width: '100%', zIndex: 10 }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <BoundsUpdater d={dPos} e={ePos} />
          {dPos && (
            <Marker
              position={[dPos.lat, dPos.lon]}
              icon={createIcon(isIndonesian ? 'S' : 'D', '#16a34a')}
            >
              <LeafletTooltip direction="top" offset={[0, -14]} opacity={1}>
                {translate('summary.tabs.truck_detail.modal.done_point')}
              </LeafletTooltip>
            </Marker>
          )}
          {ePos && (
            <Marker
              position={[ePos.lat, ePos.lon]}
              icon={createIcon(isIndonesian ? 'P' : 'C', '#2563eb')}
            >
              <LeafletTooltip direction="top" offset={[0, -14]} opacity={1}>
                {translate('summary.tabs.truck_detail.modal.customer_point')}
              </LeafletTooltip>
            </Marker>
          )}
        </MapContainer>
      );
    };
  },
  {
    ssr: false,
    loading: () => <div className="w-full h-full bg-gray-100 dark:bg-slate-800 animate-pulse" />,
  }
);

export default function TruckDetailModal({ isOpen, onClose, data, translate, localeCode, isIndonesian }) {
  const [selectedTask, setSelectedTask] = useState(null);

  if (!isOpen || !data) return null;

  const { driverName, dateStr, tasks } = data;

  const STATUS_COLORS = {
    SUKSES: 'bg-[#16a34a] text-white',
    PENDING: 'bg-[#ca8a04] text-white',
    'TERIMA SEBAGIAN': 'bg-[#ea580c] text-white',
    BATAL: 'bg-[#dc2626] text-white',
    'PENDING GR': 'bg-[#b45309] text-white',
    DEFAULT: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
    DONE: 'bg-[#16a34a] text-white',
    ONGOING: 'bg-[#7C3AED] text-white',
  };

  const STATUS_LANGUAGE = {
    SUKSES: translate('common.status.success'),
    PENDING: translate('common.status.pending'),
    'TERIMA SEBAGIAN': translate('common.status.partial'),
    BATAL: translate('common.status.cancel'),
    'PENDING GR': translate('common.status.pending_gr'),
    DONE: translate('common.status.done'),
    ONGOING: translate('common.status.ongoing'),
  };

  const ERROR_COLORS = {
    MANUAL: 'bg-[#4F76C7] text-white',
    DATE_DIFF: 'bg-[#C85D86] text-white',
  };

  const getStatusClass = (status) => {
    if (!status) return STATUS_COLORS.DEFAULT;
    const s = status.toUpperCase();
    return STATUS_COLORS[s] || STATUS_COLORS.DEFAULT;
  };

  const getSeqColor = (ro, real) => {
    if (isEmpty(ro))
      return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800';
    if (isEmpty(real))
      return 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-300 border border-gray-300 dark:border-slate-600';
    if (ro == real)
      return 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800';
    return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800';
  };

  const handleClose = () => {
    setSelectedTask(null);
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      maxWidth={selectedTask ? 'max-w-5xl' : 'max-w-lg'}
      title={
        <div>
          <h3 className="text-lg font-bold">{driverName}</h3>
          <p className="text-slate-300 text-sm font-normal">
            {formatLongDate(dateStr, localeCode)}
          </p>
        </div>
      }
      bodyClassName="p-0 bg-gray-50 dark:bg-slate-900 overflow-hidden"
      footer={
        <span className="text-sm text-slate-400 italic">
          *
          {translate('common.click_for_detail_param', {
            parameter: translate('common.task').toLowerCase(),
          })}
        </span>
      }
    >
      <div className={`flex ${selectedTask ? 'flex-row h-[70vh]' : 'flex-col'}`}>
        <div
          className={`${
            selectedTask
              ? 'w-1/2 overflow-y-auto border-r border-gray-200 dark:border-slate-700'
              : 'w-full max-h-[80vh] overflow-y-auto'
          } divide-y divide-gray-200 dark:divide-slate-700`}
        >
          {tasks && tasks.length > 0 ? (
            tasks.map((task, idx) => {
              const displayRO = task.roSequence ?? '-';
              const displayReal = task.realSequence || '-';
              const { name: customerName } = parseCustomerString(task.customerName);
              const isSelected = selectedTask === task;

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedTask(task)}
                  className={`px-6 py-4 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-slate-700/80'
                      : 'bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1 max-w-[70%]">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        {task.flow}{' '}
                        <span className="text-slate-300 dark:text-slate-500 mx-1">|</span>{' '}
                        {task.soNumber || '-'}
                      </span>
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                        {customerName}
                      </span>
                    </div>
                    <Tooltip
                      tooltipContent={
                        <span>
                          {translate('common.ro_seq')}: <b>{displayRO}</b> <br />
                          {translate('common.actual_seq')}: <b>{displayReal}</b>
                        </span>
                      }
                    >
                      <div
                        className={`text-[10px] font-bold px-2 py-1 rounded-md shadow-sm whitespace-nowrap cursor-help ${getSeqColor(
                          displayRO,
                          task.realSequence
                        )}`}
                      >
                        {isEmpty(displayRO) ? '-' : `#${displayRO}`} &rarr;{' '}
                        {isEmpty(task.realSequence) ? '-' : `#${displayReal}`}
                      </div>
                    </Tooltip>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {task.status && (
                      <span
                        className={`text-[10px] font-bold px-2 py-1 rounded shadow-sm ${getStatusClass(task.status)}`}
                      >
                        {STATUS_LANGUAGE[task.status]
                          ? STATUS_LANGUAGE[task.status].toUpperCase()
                          : '-'}
                      </span>
                    )}
                    {task.isManual && (
                      <span
                        className={`text-[10px] font-bold px-2 py-1 rounded shadow-sm ${ERROR_COLORS.MANUAL}`}
                      >
                        {translate('common.status.manual_assign').toUpperCase()}
                      </span>
                    )}
                    {task.isDateDiff && (
                      <Tooltip
                        tooltipContent={formatDateUniversal(task.startTimeStr, 'DD/MM/YYYY')}
                      >
                        <span
                          className={`cursor-help text-[10px] font-bold px-2 py-1 rounded shadow-sm ${ERROR_COLORS.DATE_DIFF}`}
                        >
                          {`${translate('summary.tabs.truck_detail.modal.diff_day').toUpperCase()} (+${task.dayDiff})`}
                        </span>
                      </Tooltip>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-gray-500 dark:text-slate-400">
              {translate('common.no_data')}
            </div>
          )}
        </div>

        {selectedTask && (
          <div className="w-1/2 h-full relative bg-gray-100 dark:bg-slate-800">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedTask(null);
              }}
              className="cursor-pointer absolute top-4 right-4 z-999 bg-white text-slate-800 rounded-full w-8 h-8 flex items-center justify-center shadow-md hover:bg-gray-100 transition-colors border border-gray-200"
              aria-label="Tutup Map"
            >
              &times;
            </button>
            <TaskMap
              doneCoord={selectedTask.doneCoord}
              expectedCoord={selectedTask.expectedCoord}
              translate={translate}
              isIndonesian={isIndonesian}
            />
          </div>
        )}
      </div>
    </BaseModal>
  );
}
