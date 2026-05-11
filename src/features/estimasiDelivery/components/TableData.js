import HighlightText from '@/components/HighlightText';
import Tooltip from '@/components/Tooltip';
import Td from '@/components/table/Td';
import Th from '@/components/table/Th';
import { getColumnPreferences, setColumnPreferences } from '@/lib/localStorageHandler';
import { formatSimpleTime, parseCustomerString } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';
import { parseSONumber } from '../help';

export default function TableData({ activeRoute, searchQuery, setSearchQuery, t, isDetailView }) {
  const hasManualTaskInRoute = activeRoute.trips.some((t) => t.isManual);

  const [prefs, setPrefs] = useState(() => {
    const savedPrefs = getColumnPreferences();
    return {
      custId: false,
      locId: false,
      ...savedPrefs,
    };
  });

  const [showColMenu, setShowColMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowColMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleCol = (key) => {
    const newPrefs = { ...prefs, [key]: !prefs[key] };
    setPrefs(newPrefs);
    setColumnPreferences(newPrefs);
  };

  const processedTrips = [];
  activeRoute.trips.forEach((trip, index) => {
    const isHub = trip.isHub;
    let outletName;
    let custId = '-';
    let locId = '-';
    const parsedCust = parseCustomerString(trip.visitName);

    if (isHub) {
      outletName = trip.visitName;
      custId = '';
      locId = '';
    } else if (trip.flow === 'Pickup' && trip.warehouseName) {
      outletName = trip.warehouseName;
      custId = parsedCust?.id || '-';
      locId = parsedCust?.location || '-';
    } else {
      outletName = parsedCust?.name || trip.visitName;
      custId = parsedCust?.id || '-';
      locId = parsedCust?.location || '-';
    }

    const mapping = trip.soWarehouseMapping || [];

    if (!isHub && isDetailView && mapping.length > 0) {
      mapping.forEach((item, idx) => {
        const letter = mapping.length > 1 ? String.fromCharCode(65 + idx) : '';

        const soPartner = trip.syncDetails ? trip.syncDetails[item.so] : null;
        const soIsUnsync = !!soPartner;
        const soHasPartner = trip.partnerSOs?.includes(item.so) || false;

        processedTrips.push({
          ...trip,
          outletName,
          custId,
          locId,
          displaySo: item.so,
          displayNo: trip.isManual ? '-' : `${trip.routePlannedOrder}${letter}`,
          pickupWh: trip.flow !== 'Pickup' ? item.wh : null,
          isSplit: mapping.length > 1,
          originalIndex: index,
          isUnsync: soIsUnsync,
          partnerVehicle: soPartner,
          hasPartner: soHasPartner,
        });
      });
      return;
    }

    let displaySo = '-';
    if (!isHub) {
      if (mapping.length > 0) {
        displaySo = mapping
          .map((item) => (item.wh && trip.flow !== 'Pickup' ? `${item.so} (${item.wh})` : item.so))
          .join(', ');
      } else {
        displaySo = parseSONumber(trip.visitName) || trip.orderId || '-';
      }
    }

    processedTrips.push({
      ...trip,
      outletName,
      custId,
      locId,
      displaySo,
      displayNo: isHub ? '' : trip.isManual ? '-' : trip.routePlannedOrder,
      pickupWh: null,
      isSplit: false,
      originalIndex: index,
      hasPartner: trip.hasAnyPartner,
      partnerSOs: trip.partnerSOs,
    });
  });

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl h-full flex flex-col border-none transition-colors relative">
      <div className="overflow-y-auto grow h-full m-0 dark:border-slate-700 rounded-b-xl">
        <table className="w-full border-collapse min-w-4xl text-slate-700">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <Th widthClass="w-[7%]" alignClass="text-center relative">
                <div className="flex items-center justify-center gap-1.5">
                  <div className="relative flex items-center" ref={menuRef}>
                    <button
                      onClick={() => setShowColMenu(!showColMenu)}
                      className="p-1 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                        ></path>
                      </svg>
                    </button>
                    {showColMenu && (
                      <div className="absolute top-full mt-1 left-0 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-lg rounded z-50 p-2 min-w-40 flex flex-col gap-1 text-left font-normal">
                        <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-slate-700 rounded cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={prefs.custId}
                            onChange={() => toggleCol('custId')}
                            className="w-3.5 h-3.5 text-sky-600 rounded border-gray-300 focus:ring-sky-500 cursor-pointer"
                          />
                          <span className="text-xs text-slate-700 dark:text-slate-200 font-medium">
                            {t('common.customer_id') || 'ID Customer'}
                          </span>
                        </label>
                        <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-slate-700 rounded cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={prefs.locId}
                            onChange={() => toggleCol('locId')}
                            className="w-3.5 h-3.5 text-sky-600 rounded border-gray-300 focus:ring-sky-500 cursor-pointer"
                          />
                          <span className="text-xs text-slate-700 dark:text-slate-200 font-medium">
                            {t('common.location_id') || 'ID Location'}
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                  <span>No.</span>
                </div>
              </Th>
              <Th widthClass="w-[20%]" alignClass="text-center">
                {t('estimation.visit')}
              </Th>
              {prefs.custId && (
                <Th widthClass="w-[10%]" alignClass="text-center">
                  {t('common.customer_id') || 'ID Customer'}
                </Th>
              )}
              {prefs.locId && (
                <Th widthClass="w-[10%]" alignClass="text-center">
                  {t('common.location_id') || 'ID Location'}
                </Th>
              )}
              <Th widthClass="w-[15%]" alignClass="text-center">
                {t('common.so_number')}
              </Th>
              <Th widthClass="w-[10%]" alignClass="text-center">
                {t('common.open_time')}
              </Th>
              <Th widthClass="w-[10%]" alignClass="text-center">
                {t('common.close_time')}
              </Th>
              <Th widthClass="w-[10%]" alignClass="text-center">
                {t('estimation.est_arrival')}
              </Th>
              <Th widthClass="w-[10%]" alignClass="text-center">
                {t('estimation.est_depart')}
              </Th>
            </tr>
          </thead>
          <tbody className="bg-transparent">
            {processedTrips.map((trip, idx) => {
              const isHub = trip.isHub;
              const isFirstHub = trip.originalIndex === 0 && isHub;
              const isLastHub = trip.originalIndex === activeRoute.trips.length - 1 && isHub;

              let textClass = '';
              const isManual = trip.isManual;
              const hasPartner = trip.hasPartner;

              if (isHub) {
                textClass = 'text-red-600 dark:text-red-300 font-semibold';
              } else if (isManual) {
                textClass = 'text-[#4F76C7] dark:text-blue-300 font-medium';
              }

              let rowClass = 'transition-colors ';
              if (isManual) {
                rowClass +=
                  'bg-[#E6EEFF] hover:bg-[#C9D9FF] dark:bg-blue-900/40 dark:hover:bg-blue-900/70 ';
              } else {
                rowClass += 'hover:bg-gray-50 dark:hover:bg-slate-700/50 ';
              }

              rowClass += 'border-b border-gray-100 dark:border-slate-700/80 ';

              let tooltipMsg = '';
              if (hasPartner) {
                tooltipMsg = t('estimation.tooltip.find_so');
              } else if (isManual) {
                tooltipMsg = t('estimation.tooltip.manual_assign');
              }

              const handleRowClick = () => {
                if (hasPartner && setSearchQuery) {
                  let filterTarget = '';

                  if (trip.isSplit) {
                    filterTarget = trip.displaySo;
                  } else {
                    const partnerSOs = trip.partnerSOs || [];
                    if (partnerSOs.length > 0) {
                      filterTarget = partnerSOs[0];
                    } else if (trip.orderId) {
                      filterTarget = trip.orderId.split(',')[0].trim();
                    }
                  }

                  if (filterTarget) {
                    setSearchQuery(filterTarget);
                  }
                }
              };

              const RowContent = (
                <tr
                  key={`${trip.visitId}-${idx}`}
                  className={`${rowClass} ${tooltipMsg ? (hasPartner ? 'cursor-pointer' : 'cursor-help') : ''}`}
                  onClick={handleRowClick}
                >
                  <Td>
                    <p
                      className={`text-center w-full ${
                        trip.isSplit
                          ? 'text-green-600 dark:text-green-400 font-bold'
                          : isManual
                            ? 'text-[#4F76C7] dark:text-blue-400 font-medium'
                            : ''
                      }`}
                    >
                      {trip.displayNo}
                    </p>
                  </Td>

                  <Td>
                    {isHub ? (
                      <strong className="text-red-600 dark:text-red-300 font-semibold">HUB</strong>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <HighlightText text={trip.outletName || ''} highlight={searchQuery} />

                          {trip.isReDelivery && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-300 uppercase tracking-tight">
                              Redelivery
                            </span>
                          )}

                          {trip.isUnsync && trip.partnerVehicle && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-900 tracking-tight shadow-sm hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
                              Partner: {trip.partnerVehicle}
                            </span>
                          )}
                        </div>

                        {isDetailView && trip.pickupWh && (
                          <span className="text-[10px] text-gray-500 dark:text-slate-400 font-medium leading-none italic">
                            ↳ Pickup: {trip.pickupWh}
                          </span>
                        )}
                      </div>
                    )}
                  </Td>

                  {prefs.custId && (
                    <Td alignClass="text-center">
                      <p className={textClass}>{trip.custId}</p>
                    </Td>
                  )}

                  {prefs.locId && (
                    <Td alignClass="text-center">
                      <p className={textClass}>{trip.locId}</p>
                    </Td>
                  )}

                  <Td>
                    {isHub ? '' : <HighlightText text={trip.displaySo} highlight={searchQuery} />}
                  </Td>

                  <Td alignClass="text-center">{isHub ? '' : trip.openTime || '-'}</Td>
                  <Td alignClass="text-center">{isHub ? '' : trip.closeTime || '-'}</Td>

                  <Td alignClass="text-center">
                    {isFirstHub
                      ? ''
                      : (() => {
                          const timeStr = trip.eta ? formatSimpleTime(trip.eta) : '-';
                          if (isLastHub && hasManualTaskInRoute && trip.eta) {
                            return (
                              <Tooltip tooltipContent={t('estimation.tooltip.hub_eta')}>
                                <span className="underline decoration-dashed decoration-red-600 dark:decoration-red-300 cursor-help text-red-600 dark:text-red-300 font-bold underline-offset-4">
                                  {timeStr}
                                </span>
                              </Tooltip>
                            );
                          }
                          return <p className={textClass}>{timeStr}</p>;
                        })()}
                  </Td>

                  <Td alignClass="text-center">
                    <p className={textClass}>
                      {isLastHub ? '' : trip.etd ? formatSimpleTime(trip.etd) : '-'}
                    </p>
                  </Td>
                </tr>
              );

              if (tooltipMsg) {
                return (
                  <Tooltip key={`${trip.visitId}-${idx}-tooltip`} tooltipContent={tooltipMsg}>
                    {RowContent}
                  </Tooltip>
                );
              }

              return RowContent;
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
