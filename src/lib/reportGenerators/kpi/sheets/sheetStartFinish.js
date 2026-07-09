import { getBasePlate, isEmpty, sortRows } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';

export function generateSheetStartFinish(startFinishRows, routeReviewRows = []) {
  const rrMap = new Map();
  routeReviewRows.forEach((r) => rrMap.set(`${r.driver}|${r.plat}`, Number(r.estOpHours) || 0));

  const uniqueProcessed = [];
  const seenSF = new Set();
  let totalMenit = 0;

  startFinishRows.forEach((row) => {
    let durasiHour = '';
    if (typeof row.durasi === 'string' && row.durasi.includes(':')) {
      durasiHour = parseInt(row.durasi.split(':')[0], 10) || 0;
    }

    const key = `${row.tipe}|${getBasePlate(row.plat)}|${row.driver}|${row.jamStart}|${row.jamFinish}|${row.durasi}|${durasiHour}`;

    if (!seenSF.has(key)) {
      seenSF.add(key);
      const estOp = rrMap.get(`${row.driver}|${row.plat}`) || 0;
      uniqueProcessed.push({ ...row, durasiHour, isErrorRed: estOp > 0 && isEmpty(row.jamStart) });

      if (typeof row.durasi === 'string' && row.durasi.includes(':')) {
        const parts = row.durasi.split(':')[0];
        totalMenit +=
          (parseInt(parts, 10) || 0) * 60 + (parseInt(row.durasi.split(':')[1], 10) || 0);
      }
    }
  });

  const finalJam = Math.floor(totalMenit / 60);
  const sortedRows = sortRows(uniqueProcessed, 'plat', 'driver');

  const sheetData = [
    ['Tipe', 'Plat Nomor', 'Driver', 'Jam Start', 'Jam Finish', 'Durasi', 'Durasi (hour)'],
    ...sortedRows.map((r) => [
      r.tipe,
      getBasePlate(r.plat),
      r.driver,
      r.jamStart,
      r.jamFinish,
      r.durasi,
      r.durasiHour,
    ]),
    [
      'TOTAL',
      '',
      '',
      '',
      '',
      `${String(finalJam).padStart(2, '0')}:${String(totalMenit % 60).padStart(2, '0')}`,
      finalJam,
    ],
    [],
    ['NOTE'],
    ['', 'Terdapat data routing tapi tidak ada waktu start-finish'],
    ['', 'Driver klik Start-Finish lebih dari 1x dalam sehari'],
  ];

  const wsSF = XLSX.utils.aoa_to_sheet(sheetData);
  const styleHeader = {
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
  const styleCenter = { alignment: { horizontal: 'center', vertical: 'center' } };
  const styleError = {
    alignment: { horizontal: 'center', vertical: 'center' },
    fill: { fgColor: { rgb: 'FADBD8' } },
    font: { color: { rgb: '000000' } },
  };
  const styleMultiple = {
    alignment: { horizontal: 'center', vertical: 'center' },
    fill: { fgColor: { rgb: 'FFF2CC' } },
    font: { color: { rgb: '000000' } },
  };

  const sfLastRow = sheetData.length - 5;
  for (let R = 0; R < sheetData.length; ++R) {
    for (let C = 0; C < 7; ++C) {
      const cell = XLSX.utils.encode_cell({ r: R, c: C });
      if (!wsSF[cell]) wsSF[cell] = { v: '' };

      if (R === 0) wsSF[cell].s = styleHeader;
      else if (R === sfLastRow) {
        wsSF[cell].s = { font: { bold: true }, alignment: { horizontal: 'center' } };
        if (typeof wsSF[cell].v === 'number') {
          wsSF[cell].t = 'n';
          wsSF[cell].z = '0';
        }
      } else if (R === sheetData.length - 3 && C === 0)
        wsSF[cell].s = { font: { color: { rgb: 'FF0000' }, underline: true, bold: true } };
      else if (R === sheetData.length - 2 && C === 0)
        wsSF[cell].s = { fill: { fgColor: { rgb: 'FADBD8' } } };
      else if (R === sheetData.length - 1 && C === 0)
        wsSF[cell].s = { fill: { fgColor: { rgb: 'FFF2CC' } } };
      else if (R >= sheetData.length - 2 && C === 1)
        wsSF[cell].s = { alignment: { vertical: 'center', horizontal: 'left' } };
      else if (R > 0 && R < sfLastRow) {
        const rowData = sortedRows[R - 1];
        wsSF[cell].s = rowData?.isErrorRed
          ? styleError
          : rowData?.isMultipleSessions
            ? styleMultiple
            : styleCenter;
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
    { s: { r: sheetData.length - 2, c: 1 }, e: { r: sheetData.length - 2, c: 6 } },
    { s: { r: sheetData.length - 1, c: 1 }, e: { r: sheetData.length - 1, c: 6 } },
  ];

  return wsSF;
}
