import { toastError, toastSuccess, toastWarning } from '@/lib/toastHelper';
import { formatYYYYMMDDToDDMMYYYY } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';

export const handleDownloadExcel = (processedData, setIsDownloading, selectedDate, hubName) => {
  if (processedData.length === 0) {
    toastWarning('Tidak ada data untuk diunduh.');
    return;
  }
  const yyyyMmDd = selectedDate.toISOString().slice(0, 10);

  setIsDownloading(true);
  try {
    const wb = XLSX.utils.book_new();
    const headers = [
      'No',
      'Customer Name',
      'Customer ID',
      'Location ID',
      'New Longlat',
      'Beda Jarak (m)',
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
    ws['!cols'] = [{ wch: 5 }, { wch: 40 }, { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 15 }];

    for (let R = range.s.r; R <= range.e.r; ++R) {
      const rowData = R > 0 ? processedData[R - 1] : null;
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
        if (R === 0) {
          ws[cellRef].s = headerStyle;
        } else {
          if (rowData && rowData.isIncomplete) ws[cellRef].s = redFillStyle;
          if (C !== 1) {
            if (!ws[cellRef].s) ws[cellRef].s = {};
            ws[cellRef].s.alignment = { horizontal: 'center' };
          }
        }
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Update Longlat');
    const fileName = `Update Longlat - ${formatYYYYMMDDToDDMMYYYY(yyyyMmDd)} ${hubName && `- ${hubName}`}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toastSuccess('Berhasil mengunduh data.');
  } catch (e) {
    console.error(e);
    toastError('Gagal membuat Excel.');
  } finally {
    setIsDownloading(false);
  }
};
