import HighlightText from '@/components/HighlightText';
import Tooltip from '@/components/Tooltip';
import Td from '@/components/table/Td';
import Th from '@/components/table/Th';
import {
  checkInvalidSo,
  checkInvalidSoList,
  formatDateUniversal,
  isEmpty,
  parseCustomerString,
} from '@/lib/utils';
import { useMemo } from 'react';

export default function TableData({
  activeRoute,
  searchQuery,
  setSearchQuery,
  t,
  isDetailView,
  sortConfig,
  setSortConfig,
}) {
  const hasManualTaskInRoute = useMemo(
    () => activeRoute.trips.some((trip) => trip.isManual),
    [activeRoute]
  );
  const handleSort = (key) => {
    const newDirection =
      sortConfig?.key === key && sortConfig?.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction: newDirection });
  };

  const renderSortIcon = (key) => {
    if (sortConfig?.key !== key)
      return <span className="text-gray-300 dark:text-slate-600 opacity-50">↕</span>;
    return sortConfig.direction === 'asc' ? <span>↑</span> : <span>↓</span>;
  };
  const processedTrips = useMemo(() => {
    const list = [];
    activeRoute.trips.forEach((trip, index) => {
      const isHub = trip.isHub;
      const parsedCust = parseCustomerString(trip.visitName);
      const isBadCust = isEmpty(parsedCust?.id) || isEmpty(parsedCust?.location);

      const outletName = isHub
        ? trip.visitName
        : trip.flow === 'Pickup' && trip.warehouseName
          ? trip.warehouseName
          : parsedCust?.name || trip.visitName;
      const custId = isHub ? '' : parsedCust?.id || '-';
      const locId = isHub ? '' : parsedCust?.location || '-';
      const mapping = trip.soWarehouseMapping || [];

      if (!isHub && isDetailView && mapping.length > 0) {
        mapping.forEach((item, idx) => {
          const letter = mapping.length > 1 ? String.fromCharCode(65 + idx) : '';
          const soPartner = trip.syncDetails?.[item.so] || null;
          list.push({
            ...trip,
            outletName,
            custId,
            locId,
            displaySo: item.so,
            displayNo: trip.isManual ? '-' : `${trip.routePlannedOrder}${letter}`,
            pickupWh: trip.flow !== 'Pickup' ? item.wh : null,
            isSplit: mapping.length > 1,
            originalIndex: index,
            isUnsync: !!soPartner,
            partnerVehicle: soPartner,
            hasPartner: trip.partnerSOs?.includes(item.so) || false,
            isInvalidSo: checkInvalidSo(item.so, isBadCust),
          });
        });
        return;
      }

      const isInvalidSo = isHub
        ? false
        : checkInvalidSoList(parsedCust?.invoiceNumber || trip.orderId || '', isBadCust);

      const displaySo = isHub
        ? '-'
        : mapping.length > 0
          ? mapping
              .map((item) =>
                item.wh && trip.flow !== 'Pickup' ? `${item.so} (${item.wh})` : item.so
              )
              .join(', ')
          : parsedCust?.invoiceNumber || trip.orderId || '-';

      list.push({
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
        isInvalidSo,
      });
    });
    if (sortConfig) {
      list.sort((a, b) => {
        // Kunci Hub di atas & bawah
        if (a.isHub && a.originalIndex === 0) return -1;
        if (b.isHub && b.originalIndex === 0) return 1;
        if (a.isHub) return 1;
        if (b.isHub) return -1;

        if (sortConfig.key === 'no') {
          const noA = parseInt(a.displayNo) || (a.isManual ? 9999 : 0);
          const noB = parseInt(b.displayNo) || (b.isManual ? 9999 : 0);
          return sortConfig.direction === 'asc' ? noA - noB : noB - noA;
        }
        if (sortConfig.key === 'so') {
          const soA = String(a.displaySo || '');
          const soB = String(b.displaySo || '');
          return sortConfig.direction === 'asc' ? soA.localeCompare(soB) : soB.localeCompare(soA);
        }
        return 0;
      });
    }

    return list;
  }, [activeRoute, isDetailView, sortConfig]);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl h-full flex flex-col border-none transition-colors relative">
      <div className="overflow-y-auto grow h-full m-0 dark:border-slate-700 rounded-b-xl">
        <table className="w-full border-collapse min-w-4xl text-slate-700">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <Th widthClass="w-[7%]" alignClass="text-center relative">
                <div
                  className="flex items-center justify-center gap-1 cursor-pointer select-none"
                  onClick={() => handleSort('no')}
                >
                  <span>No.</span>
                  {renderSortIcon('no')}
                </div>
              </Th>
              <Th widthClass="w-[20%]" alignClass="text-center">
                {t('delivery.visit')}
              </Th>
              <Th widthClass="w-[10%]" alignClass="text-center">
                {t('common.customer_id') || 'ID Customer'}
              </Th>
              <Th widthClass="w-[10%]" alignClass="text-center">
                {t('common.location_id') || 'ID Location'}
              </Th>
              <Th widthClass="w-[15%]" alignClass="text-center">
                <div
                  className="flex items-center justify-center gap-1 cursor-pointer select-none"
                  onClick={() => handleSort('so')}
                >
                  <span>{t('common.so_number')}</span>
                  {renderSortIcon('so')}
                </div>
              </Th>
              <Th widthClass="w-[10%]" alignClass="text-center">
                {t('common.open_time')}
              </Th>
              <Th widthClass="w-[10%]" alignClass="text-center">
                {t('common.close_time')}
              </Th>
              <Th widthClass="w-[10%]" alignClass="text-center">
                {t('delivery.est_arrival')}
              </Th>
              <Th widthClass="w-[10%]" alignClass="text-center">
                {t('delivery.est_depart')}
              </Th>
            </tr>
          </thead>
          <tbody className="bg-transparent">
            {processedTrips.map((trip, idx) => {
              const isHub = trip.isHub;
              const isFirstHub = trip.originalIndex === 0 && isHub;
              const isLastHub = trip.originalIndex === activeRoute.trips.length - 1 && isHub;
              const isManual = trip.isManual;
              const hasPartner = trip.hasPartner;

              const textClass = isHub ? 'text-red-600 dark:text-red-300 font-semibold' : '';
              const rowClass = `transition-colors border-b border-gray-100 dark:border-slate-700/80 ${
                isManual
                  ? 'bg-[#E6EEFF] hover:bg-[#C9D9FF] dark:bg-blue-900/40 dark:hover:bg-blue-900/70'
                  : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'
              }`;

              const tooltipMsg = hasPartner
                ? t('delivery.tooltip.find_so')
                : isManual
                  ? t('delivery.tooltip.manual_assign')
                  : '';

              const rowKey = `${trip.visitId}-${idx}`;

              const handleRowClick = () => {
                if (hasPartner && setSearchQuery) {
                  const target = trip.isSplit
                    ? trip.displaySo
                    : trip.partnerSOs?.[0] || trip.orderId?.split(',')[0].trim();
                  if (target) setSearchQuery(target);
                }
              };

              const RowContent = (
                <tr
                  key={rowKey}
                  className={`${rowClass} ${tooltipMsg ? (hasPartner ? 'cursor-pointer' : 'cursor-help') : ''}`}
                  onClick={handleRowClick}
                >
                  <Td>
                    <p
                      className={`text-center w-full ${trip.isSplit ? 'text-green-600 dark:text-green-400 font-bold' : isManual ? 'text-[#4F76C7] dark:text-blue-400 font-medium' : ''}`}
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
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-900 tracking-tight shadow-sm">
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

                  <Td alignClass="text-center">
                    <p className={textClass}>{trip.custId}</p>
                  </Td>
                  <Td alignClass="text-center">
                    <p className={textClass}>{trip.locId}</p>
                  </Td>

                  <Td alignClass={isDetailView ? 'text-center' : 'text-left'}>
                    {isHub ? (
                      ''
                    ) : trip.isInvalidSo ? (
                      <Tooltip tooltipContent={t('delivery.tooltip.invalid_so')}>
                        <span className="text-red-600 dark:text-red-400 font-bold cursor-help border-b border-dashed border-red-400">
                          <HighlightText text={trip.displaySo} highlight={searchQuery} />
                        </span>
                      </Tooltip>
                    ) : (
                      <HighlightText text={trip.displaySo} highlight={searchQuery} />
                    )}
                  </Td>

                  <Td alignClass="text-center">{isHub ? '' : trip.openTime || '-'}</Td>
                  <Td alignClass="text-center">{isHub ? '' : trip.closeTime || '-'}</Td>

                  <Td alignClass="text-center">
                    {isFirstHub
                      ? ''
                      : (() => {
                          const timeStr = trip.eta ? formatDateUniversal(trip.eta, 'HH:mm') : '-';
                          if (isLastHub && hasManualTaskInRoute && trip.eta) {
                            return (
                              <Tooltip tooltipContent={t('delivery.tooltip.hub_eta')}>
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
                      {isLastHub ? '' : trip.etd ? formatDateUniversal(trip.etd, 'HH:mm') : '-'}
                    </p>
                  </Td>
                </tr>
              );

              return tooltipMsg ? (
                <Tooltip key={`${rowKey}-tooltip`} tooltipContent={tooltipMsg}>
                  {RowContent}
                </Tooltip>
              ) : (
                RowContent
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
