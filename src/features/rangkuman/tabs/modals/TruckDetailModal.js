// File: features/rangkuman/tabs/components/TruckDetailModal.js
import Tooltip from '@/components/Tooltip';
import BaseModal from '@/components/BaseModal';

export default function TruckDetailModal({ isOpen, onClose, data }) {
  if (!isOpen || !data) return null;

  const { driverName, dateStr, tasks } = data;

  const formatHeaderDate = (str) => {
    if (!str) return '-';
    try {
      const d = new Date(str);
      if (isNaN(d.getTime())) return str;
      return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
        .format(d)
        .replace(/\//g, '-');
    } catch {
      return str;
    }
  };

  const STATUS_COLORS = {
    SUKSES: 'bg-[#16a34a] text-white',
    PENDING: 'bg-[#ca8a04] text-white',
    'TERIMA SEBAGIAN': 'bg-[#ea580c] text-white',
    BATAL: 'bg-[#dc2626] text-white',
    'PENDING GR': 'bg-[#d97706] text-white',
    DEFAULT: 'bg-slate-100 text-slate-600',
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
    if (ro === null || ro === undefined || ro === '-')
      return 'bg-red-100 text-red-600 border border-red-200';
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
          <p className="text-slate-300 text-sm font-normal">{formatHeaderDate(dateStr)}</p>
        </div>
      }
      bodyClassName="p-0 bg-gray-50" // Override padding body
    >
      {/* Content */}
      {tasks && tasks.length > 0 ? (
        <div className="divide-y divide-gray-200">
          {tasks.map((task, idx) => {
            const displayRO = task.roSequence ?? '-';
            const displayReal = task.realSequence || '-';

            return (
              <div key={idx} className="px-6 py-4 bg-white hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1 max-w-[70%]">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                      {task.flow} <span className="text-slate-300 mx-1">|</span>{' '}
                      {task.soNumber || '-'}
                    </span>
                    <span className="text-sm font-semibold text-slate-800 leading-tight">
                      {task.customerName || 'No Name'}
                    </span>
                  </div>
                  <Tooltip
                    tooltipContent={
                      <span>
                        Urutan Routing: <b>{displayRO}</b> <br />
                        Urutan Aktual: <b>{displayReal}</b>
                      </span>
                    }
                  >
                    <div
                      className={`text-[10px] font-bold px-2 py-1 rounded-md shadow-sm whitespace-nowrap cursor-help ${getSeqColor(displayRO, displayReal)}`}
                    >
                      {displayRO === '-' ? '-' : `#${displayRO}`} &rarr; #{displayReal}
                    </div>
                  </Tooltip>
                </div>
                {/* ... (Tags Status, Manual, DateDiff - Copy Paste) ... */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {task.status && (
                    <span
                      className={`text-[10px] font-bold px-2 py-1 rounded shadow-sm ${getStatusClass(task.status)}`}
                    >
                      {task.status}
                    </span>
                  )}
                  {task.isManual && (
                    <span
                      className={`text-[10px] font-bold px-2 py-1 rounded shadow-sm ${ERROR_COLORS.MANUAL}`}
                    >
                      MANUAL ASSIGN
                    </span>
                  )}
                  {task.isDateDiff && (
                    <span
                      className={`text-[10px] font-bold px-2 py-1 rounded shadow-sm ${ERROR_COLORS.DATE_DIFF}`}
                    >
                      BEDA HARI
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center text-gray-500">Tidak ada data detail pengiriman.</div>
      )}
    </BaseModal>
  );
}
