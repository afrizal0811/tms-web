import { isEmpty } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';

export function generateSheetDataKPI(formattedDate, g1, g2, g3, g4, g5, sumOvertime = 0) {
  const headers = [
    'Tanggal',
    'No of Trucks DRY',
    'No of Trucks FRZ',
    'No of Trucks',
    'No of TT DRY',
    'No of TT FRZ',
    'No of RT Dry',
    'No of RT FRZ',
    '',
    'RT by Routing',
    'RT by Driver',
    'RT by Sales',
    'RT by Customer',
    'RT by Other',
    'Est Operating Hours DRY',
    'Est Operating Hours FRZ',
    '',
    'Act Operating hours',
    'Est Distance DRY',
    'Est Distance FRZ',
    '',
    'Act Distance DRY',
    'Act Distance FRZ',
    'Act Distance',
    'Loading Capacity DRY (Kg)',
    'Loading Volume DRY (Kg)',
    'Loading Capacity DRY (Cbm)',
    'Loading Volume DRY (Cbm)',
    'Loading Capacity FRZ (Kg)',
    'Loading Volume FRZ (Kg)',
    'Loading Capacity FRZ (Cbm)',
    'Loading Volume FRZ (Cbm)',
    '',
    'No of master maintenance',
    'No of Route Reviewing',
  ];

  const separatorIndices = [8, 16, 20, 32];
  const rtOrangeIndices = [9, 10, 11, 12, 13];

  let totalMenitEstDry = 0;
  let totalMenitEstFrz = 0;

  const g2Map = new Map();
  if (g2 && Array.isArray(g2.detailRows)) {
    g2.detailRows.forEach((row) => {
      if (!row.isNoRoutingData) {
        const manualTotal =
          (Number(row.visit) || 0) + (Number(row.travel) || 0) + (Number(row.wait) || 0);
        if (row.category === 'DRY') totalMenitEstDry += manualTotal;
        else if (row.category === 'FROZEN') totalMenitEstFrz += manualTotal;
        g2Map.set(
          (row.driver || '').toUpperCase(),
          manualTotal > 0 ? Math.floor(manualTotal / 60) : 0
        );
      }
    });
  }

  const sfMap = new Map();
  if (g5 && Array.isArray(g5.startFinishRows)) {
    g5.startFinishRows.forEach((r) => {
      sfMap.set(`${r.driver}|${r.plat}`, r);
    });
  }

  let exactTotalOvertime = 0;

  if (g5 && Array.isArray(g5.routeReviewRows)) {
    g5.routeReviewRows.forEach((row) => {
      const sfRow = sfMap.get(`${row.driver}|${row.plat}`);

      let estOp = g2Map.has((row.driver || '').toUpperCase())
        ? g2Map.get((row.driver || '').toUpperCase())
        : '';
      if (estOp === '' && !isEmpty(row.estOpHours)) estOp = Number(row.estOpHours);

      let actOp = '';
      if (sfRow && typeof sfRow.durasi === 'string' && sfRow.durasi.includes(':')) {
        actOp = parseInt(sfRow.durasi.split(':')[0], 10) || 0;
      }
      if (actOp === '' && !isEmpty(row.actOpHours)) actOp = Number(row.actOpHours);

      if (
        typeof estOp === 'number' &&
        typeof actOp === 'number' &&
        !(estOp === 0 && actOp !== '')
      ) {
        exactTotalOvertime += estOp - actOp;
      }
    });
  }

  const sheetData = [
    headers,
    [
      formattedDate,
      g1.countDry,
      g1.countFrz,
      g1.countTotal,
      g1.ttDry,
      g1.ttFrz,
      g1.rtDry,
      g1.rtFrz,
      '',
      null,
      null,
      null,
      null,
      null,
      Math.floor(totalMenitEstDry / 60),
      Math.floor(totalMenitEstFrz / 60),
      '',
      g3.actOperatingHours,
      g3.estDistanceDry,
      g3.estDistanceFrz,
      '',
      g4.actDistDryKm,
      g4.actDistFrzKm,
      g4.actDistTotalKm,
      g4.capWeightDry,
      g4.actWeightDry,
      g4.capVolDry,
      g4.actVolDry,
      g4.capWeightFrz,
      g4.actWeightFrz,
      g4.capVolFrz,
      g4.actVolFrz,
      '',
      Math.round(g5.countMasterMaintenance),
      Math.abs(sumOvertime),
    ],
    [],
    ['NOTE'],
    ['1. Saat paste di google sheet, tekan kombinasi CTRL+SHIFT+V'],
    ['2. Pengisian RT by Routing/Driver/Sales/Customer/Other hanya bisa dilakukan SECARA MANUAL'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

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
  const styleSeparator = { fill: { fgColor: { rgb: 'FF0000' } } };
  const styleOrange = {
    fill: { fgColor: { rgb: 'FFC000' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
  const styleCenter = { alignment: { horizontal: 'center', vertical: 'center' } };
  const styleNoteTitle = {
    font: { color: { rgb: 'FF0000' }, underline: true, bold: true },
    alignment: { horizontal: 'left', vertical: 'center' },
  };
  const styleNoteText = {
    font: { italic: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'left', vertical: 'center' },
  };

  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cell]) ws[cell] = { v: '', t: 's' };

      if (R === 3 && C === 0) ws[cell].s = styleNoteTitle;
      else if ((R === 4 || R === 5) && C === 0) ws[cell].s = styleNoteText;
      else if (R <= 1) {
        if (separatorIndices.includes(C)) ws[cell].s = styleSeparator;
        else if (rtOrangeIndices.includes(C) && R === 1) ws[cell].s = styleOrange;
        else if (R === 0) ws[cell].s = styleHeader;
        else {
          ws[cell].s = styleCenter;
          if (typeof ws[cell].v === 'number') {
            ws[cell].t = 'n';
            if ((C >= 18 && C <= 19) || (C >= 21 && C <= 31)) ws[cell].z = '0.00';
            if (C >= 33) ws[cell].z = '0';
          }
        }
      }
    }
  }

  ws['!cols'] = headers.map((_, i) =>
    separatorIndices.includes(i) ? { wch: 2 } : i === 0 ? { wch: 15 } : { wch: 20 }
  );
  ws['!merges'] = [
    { s: { r: 3, c: 0 }, e: { r: 3, c: 6 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 6 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 6 } },
  ];

  return ws;
}
