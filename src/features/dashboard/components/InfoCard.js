import { parseCustomerString } from '@/lib/utils';

const InfoCard = ({ task, onClose, customTitle }) => {
  if (!task) return null;

  const custInfo = parseCustomerString(task.customerName);
  const cleanName = custInfo.name || 'HUB';
  const custId = custInfo.id || '-';
  const flowType = task.flow || '-';
  const isManual = task.isManualAssign;

  const displayTitle = customTitle || cleanName;

  if (task.type === 'HUB_START' || task.type === 'HUB_END') {
    return (
      <div className="absolute top-12 right-4 z-900 w-72 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="bg-green-50 p-3 border-b border-green-100 flex justify-between items-center">
          <h3 className="font-bold text-sm text-green-800">HUB LOCATION</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>
        <div className="p-4 text-xs text-gray-600">
          <p>Titik awal/akhir pengiriman (Hub/Depot).</p>
          <p className="mt-2 font-mono">{task.time}</p>
        </div>
      </div>
    );
  }

  const planVisit = parseFloat(task.visitTime) || 0;
  const actVisit = parseFloat(task.actualVisitTime) || 0;
  const diffVisit = actVisit - planVisit;
  const isFaster = diffVisit <= 0;
  const diffText = isFaster ? `${diffVisit} min` : `+${diffVisit} min`;
  const diffColor = isFaster ? 'text-green-600' : 'text-red-600';

  const timeToMin = (t) => {
    if (!t || !t.includes(':')) return null;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const etaMin = timeToMin(task.eta);
  const etdMin = timeToMin(task.etd);
  const arrMin = timeToMin(task.actualArrival);

  let timeStatus = 'Belum Ada Data';
  let timeStatusColor = 'text-gray-500';
  let statusBg = 'bg-gray-100';

  if (isManual) {
    timeStatus = 'Tidak Diketahui';
    timeStatusColor = 'text-gray-500';
    statusBg = 'bg-gray-100';
  } else if (etaMin !== null && etdMin !== null && arrMin !== null) {
    if (arrMin <= etaMin) {
      timeStatus = 'Tiba Lebih Awal';
      timeStatusColor = 'text-green-700';
      statusBg = 'bg-green-50';
    } else if (arrMin > etaMin && arrMin <= etdMin) {
      timeStatus = 'Tiba Sesuai Rentang Waktu';
      timeStatusColor = 'text-green-700';
      statusBg = 'bg-green-50';
    } else {
      timeStatus = 'Melewati Batas Waktu';
      timeStatusColor = 'text-red-700';
      statusBg = 'bg-red-50';
    }
  }

  return (
    <div className="absolute top-12 right-4 z-900 w-72 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="bg-slate-50 p-3 border-b border-gray-100 flex justify-between items-start">
        <div>
          <h3 className="font-bold text-sm text-slate-800 leading-tight">{displayTitle}</h3>
          <p className="text-[10px] text-gray-500 mt-1 flex flex-wrap items-center gap-1">
            {custId} <span className="mx-1 text-gray-300">|</span>
            <span className="font-semibold text-sky-600">{flowType}</span>
            {isManual && (
              <span className="text-gray-600 font-bold ml-1 bg-gray-100 px-1 py-0.5 rounded border border-gray-300 text-[9px]">
                Manual Assign
              </span>
            )}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            ></path>
          </svg>
        </button>
      </div>

      <div className="p-3 text-xs space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-blue-50 p-2 rounded border border-blue-100">
            <span className="block text-[10px] text-blue-500 font-semibold mb-0.5">
              RENCANA (ETA-ETD)
            </span>
            <span className="font-mono font-bold text-slate-700">
              {task.eta || '--:--'} - {task.etd || '--:--'}
            </span>
          </div>
          <div className="bg-orange-50 p-2 rounded border border-orange-100">
            <span className="block text-[10px] text-orange-500 font-semibold mb-0.5">
              AKTUAL (ARR-DEP)
            </span>
            <span className="font-mono font-bold text-slate-700">
              {task.actualArrival || '--:--'} - {task.actualDeparture || '--:--'}
            </span>
          </div>
        </div>

        <div
          className={`flex items-center justify-between p-2 rounded border ${statusBg} border-opacity-50`}
        >
          <span className="text-gray-500 font-semibold">Status Waktu</span>
          <span
            className={`font-bold ${timeStatusColor} px-2 py-0.5 bg-white rounded shadow-sm text-[11px]`}
          >
            {timeStatus}
          </span>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-2 items-center pt-2 border-t border-dashed border-gray-200">
          <div>
            <span className="block text-gray-500">Visit Plan</span>
            <span className="font-semibold text-slate-700">{planVisit} menit</span>
          </div>
          <div className="text-right">
            <span className="block text-gray-500">Actual Visit</span>
            <div className="flex items-center justify-end gap-2">
              <span className="font-bold text-slate-700">
                {actVisit > 0 ? actVisit : '-'} menit
              </span>
              {actVisit > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${diffColor} bg-white border-current`}
                >
                  {diffText}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoCard;
