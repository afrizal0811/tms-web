// File: features/rangkuman/tabs/components/TruckDetailModal.js
import BaseModal from '@/components/BaseModal';
import Tooltip from '@/components/Tooltip';
import { formatLongDate, isEmpty, parseCustomerString } from '@/lib/utils';

export default function TruckDetailModal({ isOpen, onClose, data, translate, language }) {
  if (!isOpen || !data) return null;

  const { driverName, dateStr, tasks } = data;

  const STATUS_COLORS = {
    SUKSES: 'bg-[#16a34a] text-white',
    PENDING: 'bg-[#ca8a04] text-white',
    'TERIMA SEBAGIAN': 'bg-[#ea580c] text-white',
    BATAL: 'bg-[#dc2626] text-white',
    'PENDING GR': 'bg-[#d97706] text-white',
    DEFAULT: 'bg-slate-100 text-slate-600',
    DONE: 'bg-[#16a34a] text-white',
    ONGOING: 'bg-[#ca8a04] text-white',
  };

  const STATUS_LANGUAGE = {
    SUKSES: translate('common.status.success'),
    PENDING: translate('common.status.pending'),
    'TERIMA SEBAGIAN': translate('common.status.pending_gr'),
    BATAL: translate('common.status.cancel'),
    'PENDING GR': translate('common.status.pending_gr'),
    DONE: translate('summary.tabs.truck_detail.modal.done'),
    ONGOING: translate('summary.tabs.truck_detail.modal.ongoing'),
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
    if (isEmpty(ro)) return 'bg-red-100 text-red-600 border border-red-200';
    if (isEmpty(real)) return 'bg-gray-100 text-gray-500 border border-gray-300';
    if (ro == real) return 'bg-green-100 text-green-600 border border-green-200';
    return 'bg-red-100 text-red-600 border border-red-200';
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-lg"
      title={
        <div>
          <h3 className="text-lg font-bold">{driverName}</h3>
          <p className="text-slate-300 text-sm font-normal">{formatLongDate(dateStr, language)}</p>
        </div>
      }
      bodyClassName="p-0 bg-gray-50 overflow-y-auto" // Override padding body
    >
      {/* Content */}
      {tasks && tasks.length > 0 ? (
        <div className="divide-y divide-gray-200">
          {tasks.map((task, idx) => {
            const displayRO = task.roSequence ?? '-';
            const displayReal = task.realSequence || '-';
            const { name: customerName } = parseCustomerString(task.customerName);
            return (
              <div key={idx} className="px-6 py-4 bg-white hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1 max-w-[70%]">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                      {task.flow} <span className="text-slate-300 mx-1">|</span>{' '}
                      {task.soNumber || '-'}
                    </span>
                    <span className="text-sm font-semibold text-slate-800 leading-tight">
                      {customerName}
                    </span>
                  </div>
                  <Tooltip
                    tooltipContent={
                      <span>
                        {translate('summary.tabs.truck_detail.modal.ro_seq')}: <b>{displayRO}</b>{' '}
                        <br />
                        {translate('summary.tabs.truck_detail.modal.act_seq')}: <b>{displayReal}</b>
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
                {/* ... (Tags Status, Manual, DateDiff - Copy Paste) ... */}
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
                      {translate('summary.tabs.truck_detail.modal.manual').toUpperCase()}
                    </span>
                  )}
                  {task.isDateDiff && (
                    <span
                      className={`text-[10px] font-bold px-2 py-1 rounded shadow-sm ${ERROR_COLORS.DATE_DIFF}`}
                    >
                      {translate('summary.tabs.truck_detail.modal.diff_day').toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center text-gray-500">{translate('common.no_data')}</div>
      )}
    </BaseModal>
  );
}
