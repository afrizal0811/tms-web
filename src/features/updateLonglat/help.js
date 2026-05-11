import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError, toastSuccess, toastWarning } from '@/lib/toastHelper';
import { formatDateUniversal, isEmpty } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';

export const handleDownloadExcel = (processedData, setIsDownloading, selectedDate, hubName, t) => {
  if (isEmpty(processedData)) {
    toastWarning(t('report.toast.no_data'));
    return;
  }

  setIsDownloading(true);
  try {
    const wb = XLSX.utils.book_new();
    const headers = [
      'No',
      t('common.customer_name'),
      t('common.customer_id'),
      t('common.location_id'),
      t('longlat.table.new_longlat'),
      t('longlat.table.diff_dist'),
      t('common.driver'),
      t('longlat.table.update_time'),
    ];
    const sheetData = [headers];

    processedData.forEach((row, index) => {
      const displayCustId = row.isIncomplete ? '-' : row.customerId || '';
      const displayLocId = row.isIncomplete ? '-' : row.locationId || '';
      sheetData.push([
        index + 1,
        row.customerName,
        displayCustId,
        displayLocId,
        row.newLonglat,
        row.bedaJarak,
        row.driverName,
        row.updateTime,
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const headerStyle = {
      font: { bold: true, color: { rgb: '000000' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      fill: { fgColor: { rgb: 'EFEFEF' } },
    };
    const redFillStyle = { fill: { patternType: 'solid', fgColor: { rgb: 'FFC7CE' } } };
    const range = XLSX.utils.decode_range(ws['!ref']);
    ws['!cols'] = [
      { wch: 5 },
      { wch: 30 },
      { wch: 25 },
      { wch: 20 },
      { wch: 25 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
    ];

    for (let R = range.s.r; R <= range.e.r; ++R) {
      const rowData = R > 0 ? processedData[R - 1] : null;
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
        if (R === 0) {
          ws[cellRef].s = headerStyle;
        } else {
          if (rowData && rowData.isIncomplete) ws[cellRef].s = redFillStyle;
          if (C !== 1 && C !== 6) {
            if (!ws[cellRef].s) ws[cellRef].s = {};
            ws[cellRef].s.alignment = { horizontal: 'center' };
          }
        }
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, t('longlat.title'));
    const date = formatDateUniversal(selectedDate, 'DD.MM.YYYY');
    const { storedLocationAcronym: locationName } = getLocalStorage() || '-';
    const fileName = `${t('longlat.title')} - ${date} - ${locationName}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toastSuccess(t('report.toast.success'));
  } catch (e) {
    toastError(t('report.toast.failed'));
  } finally {
    setIsDownloading(false);
  }
};
