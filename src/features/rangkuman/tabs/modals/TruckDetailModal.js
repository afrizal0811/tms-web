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
    DEFAULT: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
    DONE: 'bg-[#16a34a] text-white',
    ONGOING: 'bg-[#ca8a04] text-white',
  };

  const STATUS_LANGUAGE = {
    SUKSES: translate('common.status.success'),
    PENDING: translate('common.status.pending'),
    'TERIMA SEBAGIAN': translate('common.status.pending_gr'),
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
      bodyClassName="p-0 bg-gray-50 dark:bg-slate-900 overflow-y-auto"
    >
      {tasks && tasks.length > 0 ? (
        <div className="divide-y divide-gray-200 dark:divide-slate-700">
          {tasks.map((task, idx) => {
            const displayRO = task.roSequence ?? '-';
            const displayReal = task.realSequence || '-';
            const { name: customerName } = parseCustomerString(task.customerName);
            return (
              <div
                key={idx}
                className="px-6 py-4 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1 max-w-[70%]">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      {task.flow} <span className="text-slate-300 dark:text-slate-500 mx-1">|</span>{' '}
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
        <div className="p-8 text-center text-gray-500 dark:text-slate-400">
          {translate('common.no_data')}
        </div>
      )}
    </BaseModal>
  );
}
