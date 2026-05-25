import { isEmpty, parseCustomerString } from '@/lib/utils';
import { useMemo, useState } from 'react';

const HeaderComponent = ({ title, subtitle, style, isMinimized, onToggleMinimize, onClose }) => (
  <div className={`${style.bgHeader} p-3 flex justify-between items-start`}>
    <div>
      <h3 className={`font-bold text-sm ${style.textHeader} leading-tight`}>{title}</h3>
      <p className={`text-[10px] ${style.textSub} mt-0.5 font-medium opacity-90`}>{subtitle}</p>
    </div>
    <div className="flex items-center gap-1">
      <button
        onClick={onToggleMinimize}
        className={`hover:bg-black/10 p-1 rounded transition-colors cursor-pointer ${style.textHeader}`}
      >
        {isMinimized ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>
      <button
        onClick={onClose}
        className={`hover:bg-black/10 p-1 rounded cursor-pointer ${style.textHeader}`}
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
);

const InfoCard = ({
  task,
  onClose,
  customTitle,
  pickupCount,
  completedPickupCount,
  isActualMap,
  t,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);

  // --- HELPER: Styles berdasarkan Flow & Status ---
  const style = useMemo(() => {
    if (!task) return {};

    // 1. HUB (Highest Priority)
    if (task.type === 'HUB_START' || task.type === 'HUB_END') {
      return {
        bgHeader: 'bg-[#000000]', // HUB: Black
        bgBody: 'bg-gray-50',
        textHeader: 'text-white',
        textSub: 'text-gray-300',
        border: 'border-[#000000]',
        iconColor: 'text-black',
      };
    }

    // 2. Status Completed (Check realSequence)
    const isCompleted = !isEmpty(task.realSequence);

    if (isCompleted) {
      if (isActualMap) {
        return {
          bgHeader: 'bg-[#16A34A]', // Actual Completed: Green
          bgBody: 'bg-green-50',
          textHeader: 'text-white',
          textSub: 'text-green-100',
          border: 'border-[#16A34A]',
          iconColor: 'text-green-600',
        };
      } else {
        return {
          bgHeader: 'bg-[#0D9488]', // Plan Completed: Teal
          bgBody: 'bg-teal-50',
          textHeader: 'text-white',
          textSub: 'text-teal-100',
          border: 'border-[#0D9488]',
          iconColor: 'text-teal-600',
        };
      }
    }

    // 3. Manual Assign
    if (task.isManualAssign) {
      return {
        bgHeader: 'bg-[#64748B]', // Manual: Slate
        bgBody: 'bg-slate-50',
        textHeader: 'text-white',
        textSub: 'text-slate-100',
        border: 'border-[#64748B]',
        iconColor: 'text-slate-600',
      };
    }

    // 4. Status Not Completed
    const flow = (task.flow || '').toLowerCase();

    if (flow.includes('pickup')) {
      return {
        bgHeader: 'bg-[#9333EA]', // Pickup: Purple
        bgBody: 'bg-purple-50',
        textHeader: 'text-white',
        textSub: 'text-purple-100',
        border: 'border-[#9333EA]',
        iconColor: 'text-purple-600',
      };
    }

    if (flow.includes('re delivery')) {
      return {
        bgHeader: 'bg-[#F97316]', // Re Delivery: Orange
        bgBody: 'bg-orange-50',
        textHeader: 'text-white',
        textSub: 'text-orange-100',
        border: 'border-[#F97316]',
        iconColor: 'text-orange-600',
      };
    }

    if (flow.includes('pending gr')) {
      return {
        bgHeader: 'bg-[#FFDE21]', // Pending GR: Yellow
        bgBody: 'bg-yellow-50',
        textHeader: 'text-slate-900',
        textSub: 'text-slate-700',
        border: 'border-[#FFDE21]',
        iconColor: 'text-yellow-600',
      };
    }

    // Default (Delivery)
    return {
      bgHeader: 'bg-[#2563EB]', // Delivery: Blue
      bgBody: 'bg-blue-50',
      textHeader: 'text-white',
      textSub: 'text-blue-100',
      border: 'border-[#2563EB]',
      iconColor: 'text-blue-600',
    };
  }, [task, isActualMap]);

  if (!task) return null;

  const custInfo = parseCustomerString(task.customerName);
  const cleanName = custInfo.name || 'HUB';
  const custId = custInfo.id || '-';
  const flowType = task.flow || '-';
  const isManual = task.isManualAssign;
  const displayTitle = customTitle || cleanName;

  const cardClasses = `
    z-[2000] bg-white overflow-hidden shadow-2xl transition-all duration-300 ${style.border} 
    fixed bottom-0 left-0 right-0 w-full rounded-t-2xl border-gray-200
    animate-in slide-in-from-bottom-full fade-in
    md:absolute md:right-2 md:bottom-auto md:left-auto md:w-72
    md:rounded-lg md:border
    md:animate-in md:slide-in-from-right-4 md:top-10 
  `;

  // Render HUB
  if (task.type === 'HUB_START' || task.type === 'HUB_END') {
    return (
      <>
        {!isMinimized && (
          <div className="fixed inset-0 bg-black/20 z-1999 md:hidden" onClick={onClose} />
        )}
        <div className={cardClasses}>
          <HeaderComponent
            title="HUB"
            subtitle={t('dashboard.map.card.hub_location')}
            style={style}
            isMinimized={isMinimized}
            onToggleMinimize={() => setIsMinimized(!isMinimized)}
            onClose={onClose}
          />
          {!isMinimized && (
            <div className="p-4 text-xs text-gray-600">
              <p>{t('dashboard.map.card.hub_info')}</p>
              <p className="mt-2 font-mono text-sm font-bold text-slate-700">{task.time}</p>
            </div>
          )}
        </div>
      </>
    );
  }

  // Render PICKUP
  if (flowType === 'Pickup') {
    return (
      <>
        {!isMinimized && (
          <div className="fixed inset-0 bg-black/20 z-1999 md:hidden" onClick={onClose} />
        )}
        <div className={cardClasses}>
          <HeaderComponent
            title="PICKUP"
            subtitle={t('dashboard.map.card.subtitle')}
            style={style}
            isMinimized={isMinimized}
            onToggleMinimize={() => setIsMinimized(!isMinimized)}
            onClose={onClose}
          />
          {!isMinimized && (
            <div className="p-6 flex flex-col items-center justify-center space-y-2">
              <div className={`p-3 rounded-full bg-purple-50 ${style.iconColor} mb-1`}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
              <span className="text-sm text-gray-500 font-medium">Total Task Pickup</span>
              <span className="text-3xl font-bold text-slate-700">
                {completedPickupCount}/{pickupCount}
              </span>
            </div>
          )}
        </div>
      </>
    );
  }

  // Render DEFAULT
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

  let timeStatus = t('common.no_data');
  let timeStatusColor = 'text-gray-500';
  let statusBg = 'bg-gray-100';

  if (isManual) {
    timeStatus = t('dashboard.map.status.unknown');
  } else if (etaMin !== null && etdMin !== null && arrMin !== null) {
    if (arrMin <= etaMin) {
      timeStatus = t('dashboard.map.status.early');
      timeStatusColor = 'text-green-700';
      statusBg = 'bg-green-50';
    } else if (arrMin > etaMin && arrMin <= etdMin) {
      timeStatus = t('dashboard.map.status.ontime');
      timeStatusColor = 'text-green-700';
      statusBg = 'bg-green-50';
    } else {
      timeStatus = t('dashboard.map.status.late');
      timeStatusColor = 'text-red-700';
      statusBg = 'bg-red-50';
    }
  }

  return (
    <>
      {!isMinimized && (
        <div className="fixed inset-0 bg-black/20 z-1999 md:hidden" onClick={onClose} />
      )}
      <div className={cardClasses}>
        <HeaderComponent
          title={displayTitle}
          subtitle={`${custId} | ${flowType} ${isManual ? '(Manual)' : ''}`}
          style={style}
          isMinimized={isMinimized}
          onToggleMinimize={() => setIsMinimized(!isMinimized)}
          onClose={onClose}
        />

        {!isMinimized && (
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
                  {!(isEmpty(task.actualArrival) || isEmpty(task.actualDeparture))
                    ? `${task.actualArrival} - ${task.actualDeparture}`
                    : '-'}
                </span>
              </div>
            </div>

            <div
              className={`flex items-center justify-between p-2.5 rounded border border-gray-100 ${statusBg}`}
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
                <span className="block text-gray-500 text-[11px]">{t('common.visit_plan')}</span>
                <span className="font-semibold text-slate-700 text-sm">
                  {planVisit} {t('common.minute')}
                </span>
              </div>
              <div className="text-right">
                <span className="block text-gray-500 text-[11px]">{t('common.visit_actual')}</span>
                <div className="flex items-center justify-end gap-2">
                  <span className="font-bold text-slate-700 text-sm">
                    {actVisit >= 0 &&
                    !(isEmpty(task.actualArrival) || isEmpty(task.actualDeparture))
                      ? `${actVisit} ${t('common.minute')}`
                      : '-'}
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
        )}
      </div>
    </>
  );
};

export default InfoCard;
