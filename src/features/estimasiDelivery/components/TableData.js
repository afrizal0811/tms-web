// File: src/features/estimasiDelivery/components/TableData.js
import HighlightText from '@/components/HighlightText'; // Import komponen baru
import Td from '@/components/table/Td';
import Th from '@/components/table/Th';
import { formatSimpleTime, parseCustomerString } from '@/lib/utils';
import { parseSONumber } from '../help';

export default function TableData({ activeRoute, searchQuery, t }) {
  // Hapus fungsi escapeRegExp dan HighlightText lokal yang lama

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
          const soNumber = isHub ? null : parseSONumber(trip.visitName);

          let isMatch = false;
          if (searchQuery && !isHub) {
            const lowerQuery = searchQuery.toLowerCase();
            if (outletName && outletName.toLowerCase().includes(lowerQuery)) isMatch = true;
            if (soNumber && soNumber.toLowerCase().includes(lowerQuery)) isMatch = true;
          }

          const rowClass = isMatch ? 'bg-yellow-100' : '';

          return (
            <tr key={`${trip.visitId}-${trip.order}`} className={`hover:bg-gray-50 ${rowClass}`}>
              <Td>
                <p className={redText}>{trip.order}</p>
              </Td>
              <Td>
                {isHub ? (
                  <strong className={redText}>HUB</strong>
                ) : (
                  // Gunakan Komponen Global
                  <HighlightText text={outletName} highlight={searchQuery} />
                )}
              </Td>
              <Td>
                {isHub ? (
                  ''
                ) : (
                  // Gunakan Komponen Global
                  <HighlightText text={soNumber} highlight={searchQuery} />
                )}
              </Td>
              <Td>{isHub ? '' : formatSimpleTime(trip.timeWindow?.startTime)}</Td>
              <Td>{isHub ? '' : formatSimpleTime(trip.timeWindow?.endTime)}</Td>
              <Td>
                <p className={redText}>{isFirstHub ? '' : formatSimpleTime(trip.eta)}</p>
              </Td>
              <Td>
                <p className={redText}>{isLastHub ? '' : formatSimpleTime(trip.etd)}</p>
              </Td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
