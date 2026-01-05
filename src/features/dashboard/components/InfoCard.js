import { useLanguage } from '@/context/LanguageContext';
import { parseCustomerString } from '@/lib/utils';
import { useState } from 'react';

const InfoCard = ({ task, onClose, customTitle }) => {
  const { t } = useLanguage();
  const [isMinimized, setIsMinimized] = useState(false);

  if (!task) return null;

  const custInfo = parseCustomerString(task.customerName);
  const cleanName = custInfo.name || 'HUB';
  const custId = custInfo.id || '-';
  const flowType = task.flow || '-';
  const isManual = task.isManualAssign;

  const displayTitle = customTitle || cleanName;

  const cardClasses = `
    z-[2000] bg-white overflow-hidden border-gray-200 shadow-2xl transition-all duration-300
    
    /* Mobile Styles (Bottom Sheet) */
    fixed bottom-0 left-0 right-0 w-full
    rounded-t-2xl border-t
    animate-in slide-in-from-bottom-full fade-in

    /* Desktop/Tablet Styles (Floating Card) */
    md:absolute md:right-2 md:bottom-auto md:left-auto md:w-72
    md:rounded-lg md:border
    md:animate-in md:slide-in-from-right-4
    
    /* FIX POSISI DESKTOP: Turunkan agar tidak menutupi Header 'Aktual Real Sequence' */
    md:top-10 
  `;

  // --- RENDER UNTUK HUB (Start/End) ---
  if (task.type === 'HUB_START' || task.type === 'HUB_END') {
    return (
      <>
        {!isMinimized && (
          <div className="fixed inset-0 bg-black/20 z-1999 md:hidden" onClick={onClose} />
        )}

        <div className={cardClasses}>
          <div className="bg-green-50 p-3 border-b border-green-100 flex justify-between items-center">
            <h3 className="font-bold text-sm text-green-800">
              {t('dashboard.map.card.hub_location')}
            </h3>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-green-600 hover:bg-green-100 p-1 rounded transition-colors"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 15l7-7 7 7"
                    />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                )}
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 cursor-pointer p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              <div className="p-4 text-xs text-gray-600">
                <p>{t('dashboard.map.card.hub_info')}</p>
                <p className="mt-2 font-mono text-sm font-bold">{task.time}</p>
              </div>
              <div className="h-6 w-full bg-white md:hidden"></div>
            </>
          )}
        </div>
      </>
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

  let timeStatus = t('dashboard.map.status.no_data');
  let timeStatusColor = 'text-gray-500';
  let statusBg = 'bg-gray-100';
  let statusBorder = 'border-gray-100';

  if (isManual) {
    timeStatus = t('dashboard.map.status.unknown');
  } else if (etaMin !== null && etdMin !== null && arrMin !== null) {
    if (arrMin <= etaMin) {
      timeStatus = t('dashboard.map.status.early');
      timeStatusColor = 'text-green-700';
      statusBg = 'bg-green-50';
      statusBorder = 'border-green-100';
    } else if (arrMin > etaMin && arrMin <= etdMin) {
      timeStatus = t('dashboard.map.status.ontime');
      timeStatusColor = 'text-green-700';
      statusBg = 'bg-green-50';
      statusBorder = 'border-green-100';
    } else {
      timeStatus = t('dashboard.map.status.late');
      timeStatusColor = 'text-red-700';
      statusBg = 'bg-red-50';
      statusBorder = 'border-red-100';
    }
  }

  return (
    <>
      {!isMinimized && (
        <div className="fixed inset-0 bg-black/20 z-1999 md:hidden" onClick={onClose} />
      )}

      <div className={cardClasses}>
        <div className="bg-slate-50 p-3 border-b border-gray-100 flex justify-between items-start">
          <div>
            <h3 className="font-bold text-sm text-slate-800 leading-tight pr-4">{displayTitle}</h3>
            <p className="text-[10px] text-gray-500 mt-1 flex flex-wrap items-center gap-1">
              {custId} <span className="mx-1 text-gray-300">|</span>
              <span className="font-semibold text-sky-600">{flowType}</span>
              {isManual && (
                <span className="text-gray-600 font-bold ml-1 bg-gray-100 px-1 py-0.5 rounded border border-gray-300 text-[9px]">
                  Manual
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="text-slate-500 hover:bg-slate-200 p-1 rounded transition-colors cursor-pointer"
              title={isMinimized ? 'Expand' : 'Minimize'}
            >
              {isMinimized ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 15l7-7 7 7"
                  />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              )}
            </button>

            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 cursor-pointer bg-white rounded-full shadow-sm border border-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                ></path>
              </svg>
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            <div className="p-4 text-xs space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 p-2 rounded border border-blue-100">
                  <span className="block text-[10px] text-blue-500 font-semibold mb-0.5">
                    {t('dashboard.map.card.plan')}
                  </span>
                  <span className="font-mono font-bold text-slate-700 text-sm">
                    {task.eta || '--:--'} - {task.etd || '--:--'}
                  </span>
                </div>
                <div className="bg-orange-50 p-2 rounded border border-orange-100">
                  <span className="block text-[10px] text-orange-500 font-semibold mb-0.5">
                    {t('dashboard.map.card.actual')}
                  </span>
                  <span className="font-mono font-bold text-slate-700 text-sm">
                    {task.actualArrival || '--:--'} - {task.actualDeparture || '--:--'}
                  </span>
                </div>
              </div>

              <div
                className={`flex items-center justify-between p-2.5 rounded border ${statusBorder} ${statusBg} border-opacity-50`}
              >
                <span className="text-gray-500 font-semibold">
                  {t('dashboard.map.card.time_status')}
                </span>
                <span
                  className={`font-bold ${timeStatusColor} px-2 py-0.5 bg-white rounded shadow-sm text-[11px]`}
                >
                  {timeStatus}
                </span>
              </div>

              <div className="grid grid-cols-[1fr_auto] gap-2 items-center pt-3 border-t border-dashed border-gray-200">
                <div>
                  <span className="block text-gray-500 text-[11px]">
                    {t('dashboard.map.card.visit_plan')}
                  </span>
                  <span className="font-semibold text-slate-700 text-sm">
                    {planVisit} {t('common.minute')}
                  </span>
                </div>
                <div className="text-right">
                  <span className="block text-gray-500 text-[11px]">
                    {t('dashboard.map.card.visit_actual')}
                  </span>
                  <div className="flex items-center justify-end gap-2">
                    <span className="font-bold text-slate-700 text-sm">
                      {actVisit > 0 ? actVisit : '-'} {t('common.minute')}
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
            <div className="h-6 w-full bg-white md:hidden"></div>
          </>
        )}
      </div>
    </>
  );
};

export default InfoCard;
