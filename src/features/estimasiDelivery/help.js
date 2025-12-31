import { getLocalStorage } from '@/lib/localStorageHandler';
import { formatSimpleTime, parseCustomerString } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import { toastError, toastSuccess } from '../../lib/toastHelper';

export function parseSONumber(visitName) {
  if (!visitName) return '';
  const matches = visitName.match(/(SO|SS)\d{4}-\d+/g);
  return matches ? matches.join(', ') : null;
}

export const handleConfirmDownload = ({ filteredVehicleRoutes, setIsDownloading, t }) => {
  setIsDownloading(true);
  try {
    const wb = XLSX.utils.book_new();
    const headerStyle = { font: { bold: true } };
    const redStyle = { font: { color: { rgb: 'FF0000' }, bold: true } };
    const redStyleNoBold = { font: { color: { rgb: 'FF0000' } } };
    filteredVehicleRoutes.forEach((route, index) => {
      let sheetName = route.vehicleName.replace(/['"]/g, '');
      sheetName = sheetName.substring(0, 31);
      if (wb.SheetNames.includes(sheetName)) {
        sheetName = `${sheetName.substring(0, 28)} (${index})`;
      }
      const headers = [
        'No.',
        t('estimation.visit'),
        t('estimation.no_so'),
        t('estimation.open_time'),
        t('estimation.close_time'),
        t('estimation.est_arrival'),
        t('estimation.est_depart'),
      ];
      const dataForSheet = [];
      dataForSheet.push(headers.map((h) => ({ v: h, s: headerStyle })));
      route.trips.forEach((trip, tripIndex) => {
        const isHub = trip.isHub;
        const isFirstHub = isHub && trip.order === 0;
        const isLastHub = isHub && tripIndex === route.trips.length - 1;
        const style = isHub ? redStyleNoBold : undefined;
        const hubStyle = isHub ? redStyle : undefined;
        const row = [
          { v: trip.order, s: style },
          { v: isHub ? 'HUB' : parseCustomerString(trip.visitName).name, s: hubStyle || style },
          { v: isHub ? '' : parseSONumber(trip.visitName), s: style },
          { v: isHub ? '' : formatSimpleTime(trip.timeWindow?.startTime), s: style },
          { v: isHub ? '' : formatSimpleTime(trip.timeWindow?.endTime), s: style },
          { v: isFirstHub ? '' : formatSimpleTime(trip.eta), s: style },
          { v: isLastHub ? '' : formatSimpleTime(trip.etd), s: style },
        ];
        dataForSheet.push(row);
      });
      const ws = XLSX.utils.aoa_to_sheet(dataForSheet, { cellStyles: true });
      ws['!cols'] = [
        { wch: 5 },
        { wch: 40 },
        { wch: 25 },
        { wch: 12 },
        { wch: 12 },
        { wch: 18 },
        { wch: 20 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });
    if (wb.SheetNames.length === 0) {
      toastError(t('estimation.toast.no_data'));
      return;
    } else {
      const { storedLocationName: locationName } = getLocalStorage() || '-';
      const fileName = `${t('estimation.title')} - ${locationName}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toastSuccess(t('estimation.toast.success'));
    }
  } catch (e) {
    toastError(e.message);
  } finally {
    setIsDownloading(false);
  }
};
