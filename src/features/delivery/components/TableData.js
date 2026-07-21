import HighlightText from '@/components/HighlightText';
import Tooltip from '@/components/Tooltip';
import Td from '@/components/table/Td';
import Th from '@/components/table/Th';
import { formatDateUniversal, parseCustomerString } from '@/lib/utils';

export default function TableData({ activeRoute, searchQuery, setSearchQuery, t, isDetailView }) {
  const hasManualTaskInRoute = activeRoute.trips.some((t) => t.isManual);
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
        displaySo = parseCustomerString(trip.visitName).invoiceNumber || trip.orderId || '-';
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
                <span>No.</span>
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
                {t('common.so_number')}
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

              let textClass = '';
              const isManual = trip.isManual;
              const hasPartner = trip.hasPartner;

              if (isHub) {
                textClass = 'text-red-600 dark:text-red-300 font-semibold';
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
                tooltipMsg = t('delivery.tooltip.find_so');
              } else if (isManual) {
                tooltipMsg = t('delivery.tooltip.manual_assign');
              }

              const soAlignClass = isDetailView ? 'text-center' : 'text-left';
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

                  <Td alignClass="text-center">
                    <p className={textClass}>{trip.custId}</p>
                  </Td>
                  <Td alignClass="text-center">
                    <p className={textClass}>{trip.locId}</p>
                  </Td>

                  <Td alignClass={soAlignClass}>
                    {isHub ? '' : <HighlightText text={trip.displaySo} highlight={searchQuery} />}
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
