// File: src/features/vehicleData/help.js
import { getLocalStorage } from '@/lib/localStorageHandler';
import { formatDateUniversal, isEmpty } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import { toastError, toastSuccess } from '../../lib/toastHelper';

export const formatVolume = (vol) => {
  if (vol === null || vol === undefined) return null;
  const num = parseFloat(vol);
  if (isNaN(num)) return null;
  return parseFloat(num.toFixed(12));
};

export const handleConfirmDownload = ({
  conditionalData,
  masterData,
  setIsDownloadDropdownOpen = () => {},
  setIsDownloading,
  sheetSelection,
  t,
  templateData,
}) => {
  setIsDownloading(true);
  try {
    const wb = XLSX.utils.book_new();
    const headerStyle = { font: { bold: true } };

    if (sheetSelection.master) {
      const headers1 = ['Plat', 'Type', 'Name', 'Email'];
      const data1 = masterData.map((v) => [v.plat, v.type || null, v.name || null, v.email]);
      const ws1 = XLSX.utils.aoa_to_sheet([headers1, ...data1]);
      ws1['!cols'] = [{ wch: 25 }, { wch: 25 }, { wch: 30 }, { wch: 30 }];
      ['A1', 'B1', 'C1', 'D1'].forEach((cell) => {
        if (ws1[cell]) ws1[cell].s = headerStyle;
      });
      XLSX.utils.book_append_sheet(wb, ws1, t('vehicle.tabs.master_title'));
    }

    if (sheetSelection.conditional && conditionalData.length > 0) {
      const headersC = ['Plat', 'Type', 'Name', 'Email'];
      const dataC = conditionalData.map((v) => [v.plat, v.type || null, v.name || null, v.email]);
      const wsC = XLSX.utils.aoa_to_sheet([headersC, ...dataC]);
      wsC['!cols'] = [{ wch: 25 }, { wch: 25 }, { wch: 30 }, { wch: 30 }];
      ['A1', 'B1', 'C1', 'D1'].forEach((cell) => {
        if (wsC[cell]) wsC[cell].s = headerStyle;
      });
      XLSX.utils.book_append_sheet(wb, wsC, t('vehicle.tabs.conditional_title'));
    }

    if (sheetSelection.template) {
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
        v.plat,
        v.email,
        v.startTime || null,
        v.endTime || null,
        v.startBreakTime || null,
        v.endBreakTime || null,
        v.multiday || 0,
        v.speed,
        v.costFactor,
        v.parsedTags?.join('; ') || null,
        v.oddEven,
        v.minWeight || 0,
        v.maxWeight || null,
        v.minVolume || 0,
        formatVolume(v.maxVolume),
      ]);
      const ws2 = XLSX.utils.aoa_to_sheet([headers2, ...data2]);
      ws2['!cols'] = Array(headers2.length).fill({ wch: 20 });
      headers2.forEach((h, i) => {
        const cellRef = XLSX.utils.encode_cell({ c: i, r: 0 });
        if (ws2[cellRef]) ws2[cellRef].s = headerStyle;
      });
      XLSX.utils.book_append_sheet(wb, ws2, t('vehicle.tabs.template_title'));
    }

    if (isEmpty(wb.SheetNames)) {
      toastError(t('vehicle.toast.choose_one'));
    } else {
      const { storedLocationAcronym: locationName } = getLocalStorage() || '-';
      const date = formatDateUniversal(new Date(), 'DD.MM.YYYY');
      const fileName = `${t('vehicle.title')} - ${date} - ${locationName}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toastSuccess(t('common.toast.success'));
    }
  } catch (err) {
    toastError(t('common.toast.error', { err: err.message }));
  } finally {
    setIsDownloading(false);
    setIsDownloadDropdownOpen(false);
  }
};
