// File: src/features/estimasiDelivery/components/TableData.js
import HighlightText from '@/components/HighlightText';
import Tooltip from '@/components/Tooltip';
import Td from '@/components/table/Td';
import Th from '@/components/table/Th';
import { formatSimpleTime, isEmpty, parseCustomerString } from '@/lib/utils'; // Pastikan isEmpty diimport
import { parseSONumber } from '../help';

export default function TableData({ activeRoute, searchQuery, t }) {
  const hasManualTaskInRoute = activeRoute.trips.some((t) => t.isManual);

  return (
    <table className="w-full border-collapse min-w-4xl">
      <thead className="bg-gray-100 font-bold text-gray-700 sticky top-0 z-10 shadow-sm">
        <tr>
          <Th widthClass="w-[5%]">No.</Th>
          <Th widthClass="w-[30%]">{t('estimation.visit')}</Th>
          <Th widthClass="w-[20%]">{t('estimation.no_so')}</Th>
          <Th widthClass="w-[10%]">{t('estimation.open_time')}</Th>
          <Th widthClass="w-[10%]">{t('estimation.close_time')}</Th>
          <Th widthClass="w-[12.5%]">{t('estimation.est_arrival')}</Th>
          <Th widthClass="w-[12.5%]">{t('estimation.est_depart')}</Th>
        </tr>
      </thead>
      <tbody className="bg-white">
        {activeRoute.trips.map((trip, index) => {
          const isHub = trip.isHub;
          const isFirstHub = index === 0 && isHub;
          const isLastHub = index === activeRoute.trips.length - 1 && isHub;
          let outletName;
          if (isHub) {
            outletName = trip.visitName;
          } else if (trip.flow === 'Pickup' && trip.warehouseName) {
            outletName = trip.warehouseName;
          } else {
            outletName = parseCustomerString(trip.visitName);
          }

          let soNumber = isHub ? '' : parseSONumber(trip.visitName);
          if (!isHub && isEmpty(soNumber)) {
            const rawOrderId = trip.orderId;
            const standardRegex = /^(SO|SC|SE)\d{4}-\d+$/;

            if (rawOrderId && standardRegex.test(rawOrderId)) {
              soNumber = rawOrderId;
            } else {
              soNumber = '-';
            }
          } else if (!isHub && isEmpty(soNumber)) {
            soNumber = '-';
          }

          let textClass = '';
          if (isHub) {
            textClass = 'text-red-600 font-semibold';
          } else if (trip.isManual) {
            textClass = 'text-red-600 font-medium';
          }

          const isManual = trip.isManual;
          const isUnsync = trip.isUnsync;

          let rowClass = 'transition-colors ';
          let rowStyle = {};

          if (isManual) {
            rowClass += 'bg-red-100 hover:bg-red-200 ';
          } else {
            rowClass += 'hover:bg-gray-50 ';
          }

          if (isUnsync) {
            rowStyle = {
              boxShadow:
                'inset 0 2px 0 0 #60a5fa, inset 0 -2px 0 0 #60a5fa, inset 2px 0 0 0 #60a5fa, inset -2px 0 0 0 #60a5fa',
              position: 'relative',
              zIndex: 1,
            };
          } else {
            rowClass += 'border-b border-gray-100 ';
          }

          let tooltipMsg = '';
          const partnerText = isUnsync ? `Grup ${trip.groupLetter} - ${trip.partnerVehicle}` : '';

          if (isManual && isUnsync) {
            tooltipMsg = `${t('estimation.tooltip.manual_assign')} (${partnerText})`;
          } else if (isManual) {
            tooltipMsg = t('estimation.tooltip.manual_assign');
          } else if (isUnsync) {
            tooltipMsg = `Tidak sinkron: ${partnerText}`;
          }

          const RowContent = (
            <tr key={`${trip.visitId}-${index}`} className={rowClass} style={rowStyle}>
              <Td>
                <p className={isManual || isUnsync ? 'text-red-600 font-medium' : ''}>
                  {trip.isManual ? '-' : trip.routePlannedOrder}
                </p>
              </Td>

              {/* Kolom Visit */}
              <Td>
                {isHub ? (
                  <strong
                    className={
                      trip.isManual || trip.isUnsync || trip.isHub
                        ? 'text-red-600 font-semibold'
                        : ''
                    }
                  >
                    HUB
                  </strong>
                ) : (
                  <HighlightText text={outletName || ''} highlight={searchQuery} />
                )}
              </Td>

              {/* Kolom SO */}
              <Td>
                {/* Tampilkan SO atau strip jika kosong/tidak valid */}
                {isHub ? '' : <HighlightText text={soNumber} highlight={searchQuery} />}
              </Td>

              {/* Kolom Open/Close */}
              <Td>{isHub ? '' : trip.openTime || '-'}</Td>
              <Td>{isHub ? '' : trip.closeTime || '-'}</Td>

              {/* Kolom ETA */}
              <Td>
                {isFirstHub
                  ? ''
                  : (() => {
                      const timeStr = trip.eta ? formatSimpleTime(trip.eta) : '-';
                      if (isLastHub && hasManualTaskInRoute && trip.eta) {
                        return (
                          <Tooltip tooltipContent={t('estimation.tooltip.hub_eta')}>
                            <span className="underline decoration-dashed decoration-red-400 cursor-help text-red-700 font-bold underline-offset-4">
                              {timeStr}
                            </span>
                          </Tooltip>
                        );
                      }
                      return <p className={textClass}>{timeStr}</p>;
                    })()}
              </Td>

              {/* Kolom ETD */}
              <Td>
                <p className={textClass}>
                  {isLastHub ? '' : trip.etd ? formatSimpleTime(trip.etd) : '-'}
                </p>
              </Td>
            </tr>
          );

          if (isManual || isUnsync) {
            return (
              <Tooltip key={trip.visitId} tooltipContent={tooltipMsg}>
                {RowContent}
              </Tooltip>
            );
          }

          return RowContent;
        })}
      </tbody>
    </table>
  );
}
