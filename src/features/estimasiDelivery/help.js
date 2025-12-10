import { formatSimpleTime, parseOutletName } from '@/lib/utils';
import { toastError, toastSuccess } from '../../lib/toastHelper';
import * as XLSX from 'xlsx-js-style';

export function parseSONumber(visitName) {
  if (!visitName) return '';
  const matches = visitName.match(/(SO|SS)\d{4}-\d+/g);
  return matches ? matches.join(', ') : null;
}

export const handleConfirmDownload = ({ filteredVehicleRoutes, setIsDownloading }) => {
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
        'Visit',
        'Nomor SO',
        'Jam Buka',
        'Jam Tutup',
        'Estimasi Sampai',
        'Estimasi Berangkat',
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
          { v: isHub ? 'HUB' : parseOutletName(trip.visitName), s: hubStyle || style },
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
      toastError('Tidak ada data untuk diunduh.');
      return;
    } else {
      const locationName = localStorage.getItem('userLocationName') || 'Lokasi_Tidak_Ditemukan';
      const fileName = `Estimasi Delivery - ${locationName}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toastSuccess('File Estimasi Delivery berhasil diunduh!');
    }
  } catch (e) {
    toastError(e.message);
  } finally {
    setIsDownloading(false);
  }
};
