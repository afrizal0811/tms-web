'use client';

import Map from '@/components/Map';
import Modal from '@/components/modal/Modal';
import Tooltip from '@/components/Tooltip';
import {
  formatDateUniversal,
  formatLongDate,
  isEmpty,
  parseCoordinates,
  parseCustomerString,
} from '@/lib/utils';
import { useState } from 'react';

export default function TruckDetailModal({
  isOpen,
  onClose,
  data,
  translate,
  localeCode,
  isIndonesian,
}) {
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
    SPLIT: 'border border-orange-400 text-orange-400 dark:border-orange-400 dark:text-orange-400',
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

  const dPos = selectedTask ? parseCoordinates(selectedTask.doneCoord) : null;
  const ePos = selectedTask ? parseCoordinates(selectedTask.expectedCoord) : null;
  const bounds = [dPos, ePos].filter(Boolean).map((p) => [p.lat, p.lon]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      maxWidth={selectedTask ? 'max-w-5xl' : 'max-w-lg'}
      title={driverName}
      subtitle={formatLongDate(dateStr, localeCode)}
      bodyClassName="p-0 bg-gray-50 dark:bg-slate-900 overflow-hidden"
      footer={
        <span className="text-sm text-slate-400 italic">
          *{translate('common.click_for_detail')}
        </span>
      }
    >
      <div className={`flex ${selectedTask ? 'flex-row' : 'flex-col'} h-[70vh]`}>
        <div
          className={`w-full ${selectedTask ? 'md:w-1/2 border-r border-gray-200 dark:border-slate-700' : ''} h-full overflow-y-auto divide-y divide-gray-200 dark:divide-slate-700`}
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
                  className={`px-6 py-4 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 dark:bg-slate-700/80' : 'bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}
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
                        className={`text-[10px] font-bold px-2 py-1 rounded-md shadow-sm whitespace-nowrap cursor-help ${getSeqColor(displayRO, task.realSequence)}`}
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
                        tooltipContent={formatDateUniversal(task.doneTime, 'DD-MM-YYYY HH:mm')}
                      >
                        <span
                          className={`cursor-help text-[10px] font-bold px-2 py-1 rounded shadow-sm ${ERROR_COLORS.DATE_DIFF}`}
                        >
                          {`${translate('common.status.diff_day').toUpperCase()} (+${task.dayDiff})`}
                        </span>
                      </Tooltip>
                    )}
                    {task.isSplitTask && (
                      <span
                        className={`text-[10px] font-bold px-2 py-1 rounded shadow-sm ${ERROR_COLORS.SPLIT}`}
                      >
                        {translate('summary.tabs.truck_detail.split_task').toUpperCase()}
                      </span>
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
              className="absolute top-4 right-4 z-50 pointer-events-auto cursor-pointer bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-full w-8 h-8 flex items-center justify-center shadow-md hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors border border-gray-200 dark:border-slate-700"
            >
              &times;
            </button>
            <div className="absolute bottom-4 left-4 z-50 pointer-events-auto bg-white/95 dark:bg-slate-800/95 backdrop-blur shadow-lg rounded-lg p-3 border border-gray-200 dark:border-slate-700 min-w-[130px]">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  {translate('common.weight')}
                </span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                  {Number(selectedTask.weight || 0).toFixed(2)} Kg
                </span>
              </div>
              <div className="w-full h-px bg-gray-200 dark:bg-slate-700 my-2"></div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  {translate('common.volume')}
                </span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                  {Number(selectedTask.volume || 0).toFixed(2)} Cbm
                </span>
              </div>
            </div>

            {bounds.length > 0 ? (
              <Map bounds={bounds}>
                {({ Marker, Tooltip: LeafletTooltip }, L, icons) => (
                  <>
                    {dPos && (
                      <Marker
                        position={[dPos.lat, dPos.lon]}
                        icon={icons.circle(isIndonesian ? 'S' : 'D', 'bg-[#16a34a]', 'text-[14px]')}
                      >
                        <LeafletTooltip direction="top" offset={[0, -14]} opacity={1}>
                          {translate('summary.tabs.truck_detail.modal.done_point')}
                        </LeafletTooltip>
                      </Marker>
                    )}
                    {ePos && (
                      <Marker
                        position={[ePos.lat, ePos.lon]}
                        icon={icons.circle(isIndonesian ? 'P' : 'C', 'bg-[#2563eb]', 'text-[14px]')}
                      >
                        <LeafletTooltip direction="top" offset={[0, -14]} opacity={1}>
                          {translate('summary.tabs.truck_detail.modal.customer_point')}
                        </LeafletTooltip>
                      </Marker>
                    )}
                  </>
                )}
              </Map>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500 bg-gray-100 dark:bg-slate-800">
                {translate('common.no_data')}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
