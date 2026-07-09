import { getBasePlate, isEmpty, sortRows } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';

export function generateSheetStartFinish(startFinishRows, routeReviewRows = []) {
  const headers = [
    'Tipe',
    'Plat Nomor',
    'Driver',
    'Jam Start',
    'Jam Finish',
    'Durasi',
    'Durasi (hour)',
  ];
  const sheetData = [headers];
  const tempProcessed = startFinishRows.map((row) => {
    const rrRow = routeReviewRows.find((r) => r.driver === row.driver && r.plat === row.plat);
    const estOp = rrRow ? Number(rrRow.estOpHours) || 0 : 0;

    let newRow = { ...row, isErrorRed: false };

    if (estOp > 0 && isEmpty(newRow.jamStart)) {
      newRow.isErrorRed = true;
    }

    newRow.durasiHour = '';
    if (newRow.durasi && typeof newRow.durasi === 'string' && newRow.durasi.includes(':')) {
      const parts = newRow.durasi.split(' ')[0].split(':');
      if (parts.length >= 2) {
        newRow.durasiHour = parseInt(parts[0], 10) || 0;
      }
    }
    return newRow;
  });

  const uniqueProcessed = [];
  const seenSF = new Set();
  let totalMenit = 0;

  tempProcessed.forEach((row) => {
    const excelValues = [
      row.tipe,
      getBasePlate(row.plat),
      row.driver,
      row.jamStart,
      row.jamFinish,
      row.durasi,
      row.durasiHour,
    ];
    const key = JSON.stringify(excelValues);

    if (!seenSF.has(key)) {
      seenSF.add(key);
      uniqueProcessed.push(row);

      if (row.durasi && typeof row.durasi === 'string' && row.durasi.includes(':')) {
        const parts = row.durasi.split(' ')[0].split(':');
        if (parts.length >= 2) {
          totalMenit += (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
        }
      }
    }
  });

  const finalJam = Math.floor(totalMenit / 60);
  const finalMenit = totalMenit % 60;
  const recalculatedTotalStr = `${String(finalJam).padStart(2, '0')}:${String(finalMenit).padStart(
    2,
    '0'
  )}`;

  const sortedRows = sortRows([...uniqueProcessed], 'plat', 'driver');

  sortedRows.forEach((row) => {
    sheetData.push([
      row.tipe,
      getBasePlate(row.plat),
      row.driver,
      row.jamStart,
      row.jamFinish,
      row.durasi,
      row.durasiHour,
    ]);
  });

  sheetData.push(['TOTAL', '', '', '', '', recalculatedTotalStr, finalJam]);
  sheetData.push([]);
  sheetData.push(['NOTE']);
  sheetData.push(['', 'Terdapat data routing tapi tidak ada waktu start-finish']);
  sheetData.push(['', 'Driver klik Start-Finish lebih dari 1x dalam sehari']);

  const wsSF = XLSX.utils.aoa_to_sheet(sheetData);

  const headerStyle = {
    font: { bold: true },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    fill: { fgColor: { rgb: 'EFEFEF' } },
    border: {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    },
  };

  const dataCenterStyle = { alignment: { horizontal: 'center', vertical: 'center' } };

  const errorRedStyle = {
    alignment: { horizontal: 'center', vertical: 'center' },
    fill: { fgColor: { rgb: 'FADBD8' } },
    font: { color: { rgb: '000000' } },
  };

  const multipleYellowStyle = {
    alignment: { horizontal: 'center', vertical: 'center' },
    fill: { fgColor: { rgb: 'FFF2CC' } },
    font: { color: { rgb: '000000' } },
  };

  const rangeSF = XLSX.utils.decode_range(wsSF['!ref']);

  const sfLastRow = sheetData.length - 5;
  const noteTitleIdx = sheetData.length - 3;
  const legendErrorIdx = sheetData.length - 2;
  const legendYellowIdx = sheetData.length - 1;

  for (let R = rangeSF.s.r; R <= rangeSF.e.r; ++R) {
    for (let C = rangeSF.s.c; C <= rangeSF.e.c; ++C) {
      const cell = XLSX.utils.encode_cell({ r: R, c: C });
      if (!wsSF[cell]) wsSF[cell] = { v: '' };

      if (R === 0) {
        wsSF[cell].s = headerStyle;
      } else if (R === sfLastRow) {
        wsSF[cell].s = { font: { bold: true }, alignment: { horizontal: 'center' } };
        if (typeof wsSF[cell].v === 'number') {
          wsSF[cell].t = 'n';
          wsSF[cell].z = '0';
        }
      } else if (R === noteTitleIdx && C === 0) {
        wsSF[cell].s = { font: { color: { rgb: 'FF0000' }, underline: true, bold: true } };
      } else if (R === legendErrorIdx && C === 0) {
        wsSF[cell].s = { fill: { fgColor: { rgb: 'FADBD8' } } };
      } else if (R === legendErrorIdx && C === 1) {
        wsSF[cell].s = { alignment: { vertical: 'center', horizontal: 'left' } };
      } else if (R === legendYellowIdx && C === 0) {
        wsSF[cell].s = { fill: { fgColor: { rgb: 'FFF2CC' } } };
      } else if (R === legendYellowIdx && C === 1) {
        wsSF[cell].s = { alignment: { vertical: 'center', horizontal: 'left' } };
      } else if (R > 0 && R < sfLastRow) {
        const rowData = sortedRows[R - 1];
        if (rowData && rowData.isErrorRed) {
          wsSF[cell].s = errorRedStyle;
        } else if (rowData && rowData.isMultipleSessions) {
          wsSF[cell].s = multipleYellowStyle;
        } else {
          wsSF[cell].s = dataCenterStyle;
        }

        if (typeof wsSF[cell].v === 'number') {
          wsSF[cell].t = 'n';
          wsSF[cell].z = '0';
        }
      }
    }
  }

  wsSF['!cols'] = [
    { wch: 10 },
    { wch: 15 },
    { wch: 25 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
  ];

  wsSF['!merges'] = [
    { s: { r: legendErrorIdx, c: 1 }, e: { r: legendErrorIdx, c: 6 } },
    { s: { r: legendYellowIdx, c: 1 }, e: { r: legendYellowIdx, c: 6 } },
  ];

  return wsSF;
}
