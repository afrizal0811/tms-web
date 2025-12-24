import { getLocalStorage } from '@/lib/localStorageHandler';
import { normalizeEmail } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import { toastError, toastSuccess } from '../../lib/toastHelper';

export const formatVolume = (vol) => {
  if (vol === null || vol === undefined) return null;
  const num = parseFloat(vol);
  if (isNaN(num)) return null;
  return parseFloat(num.toFixed(12));
};

export const handleConfirmDownload = ({
  masterData,
  driverMap,
  conditionalData,
  sheetSelection,
  templateData,
  setIsDownloading,
  setIsDownloadDropdownOpen,
}) => {
  setIsDownloading(true);
  try {
    const wb = XLSX.utils.book_new();
    const headerStyle = { font: { bold: true } };

    if (sheetSelection.master) {
      const headers1 = ['Plat', 'Type', 'Name', 'Email'];
      const data1 = masterData.map((v) => [
        v.name,
        v.tags?.[0] || null,
        driverMap.get(normalizeEmail(v.assignee)) || null,
        v.assignee,
      ]);
      const ws1 = XLSX.utils.aoa_to_sheet([headers1, ...data1]);
      ws1['!cols'] = [{ wch: 25 }, { wch: 25 }, { wch: 30 }, { wch: 30 }];
      ['A1', 'B1', 'C1', 'D1'].forEach((cell) => {
        if (ws1[cell]) ws1[cell].s = headerStyle;
      });
      XLSX.utils.book_append_sheet(wb, ws1, 'Master Vehicle');
    }
    if (sheetSelection.conditional && conditionalData.length > 0) {
      const headersC = ['Plat', 'Type', 'Name', 'Email'];
      const dataC = conditionalData.map((v) => [
        v.name,
        v.tags?.[0] || null,
        driverMap.get(normalizeEmail(v.assignee)) || null,
        v.assignee,
      ]);
      const wsC = XLSX.utils.aoa_to_sheet([headersC, ...dataC]);
      wsC['!cols'] = [{ wch: 25 }, { wch: 25 }, { wch: 30 }, { wch: 30 }];
      ['A1', 'B1', 'C1', 'D1'].forEach((cell) => {
        if (wsC[cell]) wsC[cell].s = headerStyle;
      });
      XLSX.utils.book_append_sheet(wb, wsC, 'Conditional Vehicle');
    }
    if (sheetSelection.template) {
      // Template menggunakan templateData (Data Murni)
      const headers2 = [
        'Name*',
        'Assignee',
        'Start Time',
        'End Time',
        'Break Start',
        'Break End',
        'Multiday',
        'Speed Km/h',
        'Cost Factor',
        'Vehicle Tags',
        'Odd Even',
        'weight Min',
        'weight Max',
        'volume Min',
        'volume Max',
      ];
      const data2 = templateData.map((v) => [
        v.name,
        v.assignee,
        v.workingTime?.startTime || null,
        v.workingTime?.endTime || null,
        v.breaktime?.startTime || null,
        v.breaktime?.endTime || null,
        v.workingTime?.multiday || 0,
        v.speed,
        null,
        v.tags?.join('; ') || null,
        v.oddEven,
        0,
        v.capacity?.weight?.max || null,
        0,
        formatVolume(v.capacity?.volume?.max),
      ]);
      const ws2 = XLSX.utils.aoa_to_sheet([headers2, ...data2]);
      ws2['!cols'] = Array(headers2.length).fill({ wch: 20 });
      headers2.forEach((h, i) => {
        const cellRef = XLSX.utils.encode_cell({ c: i, r: 0 });
        if (ws2[cellRef]) ws2[cellRef].s = headerStyle;
      });
      XLSX.utils.book_append_sheet(wb, ws2, 'Template Vehicle');
    }

    if (wb.SheetNames.length === 0) {
      toastError('Pilih setidaknya satu sheet untuk diunduh.');
    } else {
      const { storedLocationName: locationName } = getLocalStorage() || '-';
      const fileName = `Data Kendaraan - ${locationName}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toastSuccess('File Data Kendaraan berhasil diunduh!');
    }
  } catch (err) {
    toastError(err.message);
  } finally {
    setIsDownloading(false);
    setIsDownloadDropdownOpen(false);
  }
};
