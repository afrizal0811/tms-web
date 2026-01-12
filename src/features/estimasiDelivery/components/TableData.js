// File: src/features/estimasiDelivery/components/TableData.js
import HighlightText from '@/components/HighlightText';
import Td from '@/components/table/Td';
import Th from '@/components/table/Th';
import Tooltip from '@/components/Tooltip'; // 1. Import Tooltip
import { formatSimpleTime, isEmpty, parseCustomerString } from '@/lib/utils';
import { parseSONumber } from '../help';

export default function TableData({ activeRoute, searchQuery, t }) {
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
        {activeRoute.trips.map((trip, tripIndex) => {
          const isHub = trip.isHub;
          const isFirstHub = isHub && trip.order === 0;
          const isLastHub = isHub && tripIndex === activeRoute.trips.length - 1;
          const redText = isHub ? 'text-red-600' : '';
          const outletName = isHub ? null : parseCustomerString(trip.visitName).name;
          let soNumber = isHub
            ? null
            : parseSONumber(trip.visitGroup) || parseSONumber(trip.visitName);

          // Logika Manual Assign
          const isManualAssign = isEmpty(soNumber) && !isHub;
          soNumber = isManualAssign ? '-' : soNumber;

          let isMatch = false;
          if (searchQuery && !isHub) {
            const lowerQuery = searchQuery.toLowerCase();
            if (outletName && outletName.toLowerCase().includes(lowerQuery)) isMatch = true;
            if (soNumber && soNumber.toLowerCase().includes(lowerQuery)) isMatch = true;
          }

          const rowClass = isMatch ? 'bg-yellow-100' : '';
          const manualAssignCLass = isManualAssign
            ? 'bg-red-100 hover:cursor-help'
            : 'hover:bg-gray-50 ';

          // Definisi konten baris (Cells) dipisah agar rapi
          const rowContent = (
            <>
              <Td>
                <p className={redText}>{trip.order}</p>
              </Td>
              <Td>
                {isHub ? (
                  <strong className={redText}>HUB</strong>
                ) : (
                  <HighlightText text={outletName} highlight={searchQuery} />
                )}
              </Td>
              <Td>{isHub ? '' : <HighlightText text={soNumber} highlight={searchQuery} />}</Td>
              <Td>{isHub ? '' : formatSimpleTime(trip.timeWindow?.startTime)}</Td>
              <Td>{isHub ? '' : formatSimpleTime(trip.timeWindow?.endTime)}</Td>
              <Td>
                <p className={redText}>{isFirstHub ? '' : formatSimpleTime(trip.eta)}</p>
              </Td>
              <Td>
                <p className={redText}>{isLastHub ? '' : formatSimpleTime(trip.etd)}</p>
              </Td>
            </>
          );

          // 2. Jika Manual Assign, bungkus tr dengan Tooltip
          if (isManualAssign) {
            return (
              <Tooltip
                key={`${trip.visitId}-${trip.order}`}
                tooltipContent={t('estimation.manual_assign')}
              >
                <tr className={`${rowClass} ${manualAssignCLass}`}>{rowContent}</tr>
              </Tooltip>
            );
          }

          return (
            <tr
              key={`${trip.visitId}-${trip.order}`}
              className={`${rowClass} ${manualAssignCLass}`}
            >
              {rowContent}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
