import { isEmpty } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';

export function generateSheetDataKPI(formattedDate, g1, g2, g3, g4, g5, sumOvertime = 0) {
  const headerTanggal = ['Tanggal'];
  const group1Headers = [
    'No of Trucks DRY',
    'No of Trucks FRZ',
    'No of Trucks',
    'No of TT DRY',
    'No of TT FRZ',
    'No of RT Dry',
    'No of RT FRZ',
  ];
  const group2Headers = [
    'RT by Routing',
    'RT by Driver',
    'RT by Sales',
    'RT by Customer',
    'RT by Other',
    'Est Operating Hours DRY',
    'Est Operating Hours FRZ',
  ];
  const group3Headers = ['Act Operating hours', 'Est Distance DRY', 'Est Distance FRZ'];
  const group4Headers = [
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
  ];
  const group5Headers = ['No of master maintenance', 'No of Route Reviewing'];

  const headers = [
    ...headerTanggal,
    ...group1Headers,
    '',
    ...group2Headers,
    '',
    ...group3Headers,
    '',
    ...group4Headers,
    '',
    ...group5Headers,
  ];

  const startIdx = headerTanggal.length;
  const sep1Index = startIdx + group1Headers.length;
  const sep2Index = sep1Index + 1 + group2Headers.length;
  const sep3Index = sep2Index + 1 + group3Headers.length;
  const sep4Index = sep3Index + 1 + group4Headers.length;
  const separatorIndices = [sep1Index, sep2Index, sep3Index, sep4Index];

  const rtOrangeStart = sep1Index + 1;
  const rtOrangeIndices = [
    rtOrangeStart,
    rtOrangeStart + 1,
    rtOrangeStart + 2,
    rtOrangeStart + 3,
    rtOrangeStart + 4,
  ];
  let totalMenitEstDry = 0;
  let totalMenitEstFrz = 0;

  if (g2 && Array.isArray(g2.detailRows)) {
    g2.detailRows.forEach((row) => {
      if (!row.isNoRoutingData) {
        const manualTotal =
          (Number(row.visit) || 0) + (Number(row.travel) || 0) + (Number(row.wait) || 0);

        if (row.category === 'DRY') {
          totalMenitEstDry += manualTotal;
        } else if (row.category === 'FROZEN') {
          totalMenitEstFrz += manualTotal;
        }
      }
    });
  }

  const finalEstOpDry = Math.floor(totalMenitEstDry / 60);
  const finalEstOpFrz = Math.floor(totalMenitEstFrz / 60);
  let exactTotalOvertime = 0;

  if (g5 && Array.isArray(g5.routeReviewRows)) {
    g5.routeReviewRows.forEach((row) => {
      const sfRow = (g5.startFinishRows || []).find(
        (r) => r.driver === row.driver && r.plat === row.plat
      );

      let estOp = '';
      if (g2 && Array.isArray(g2.detailRows) && g2.detailRows.length > 0) {
        const g2Row = g2.detailRows.find(
          (g) => (g.driver || '').toUpperCase() === (row.driver || '').toUpperCase()
        );
        if (g2Row && !g2Row.isNoRoutingData) {
          const manualTotal =
            (Number(g2Row.visit) || 0) + (Number(g2Row.travel) || 0) + (Number(g2Row.wait) || 0);
          estOp = manualTotal > 0 ? Math.floor(manualTotal / 60) : 0;
        }
      }
      if (estOp === '' && !isEmpty(row.estOpHours)) {
        estOp = Number(row.estOpHours);
      }

      let actOp = '';
      if (sfRow && sfRow.durasi && typeof sfRow.durasi === 'string' && sfRow.durasi.includes(':')) {
        const parts = sfRow.durasi.split(' ')[0].split(':');
        if (parts.length >= 2) {
          actOp = parseInt(parts[0], 10) || 0;
        }
      }
      if (actOp === '' && !isEmpty(row.actOpHours)) {
        actOp = Number(row.actOpHours);
      }

      const isEstEmpty = estOp === '' || estOp === 0;
      const isActHasValue = actOp !== '';
      const shouldHide = isEstEmpty && isActHasValue;

      let overtime = '';
      if (typeof estOp === 'number' && typeof actOp === 'number' && !shouldHide) {
        overtime = estOp - actOp;
      }

      if (typeof overtime === 'number') {
        exactTotalOvertime += overtime;
      }
    });
  }

  const finalRouteReviewingValue = Math.abs(sumOvertime);

  const dataRow = [
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
    finalEstOpDry,
    finalEstOpFrz,
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
    finalRouteReviewingValue,
  ];

  const sheetData = [headers, dataRow];

  sheetData.push([]);
  const noteRow1 = [];
  noteRow1[0] = 'NOTE';
  sheetData.push(noteRow1);

  const noteRow2 = [];
  noteRow2[0] = '1. Saat paste di google sheet, tekan kombinasi CTRL+SHIFT+V';
  sheetData.push(noteRow2);

  const noteRow3 = [];
  noteRow3[0] =
    '2. Pengisian RT by Routing/Driver/Sales/Customer/Other hanya bisa dilakukan SECARA MANUAL';
  sheetData.push(noteRow3);

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

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
  const separatorStyle = { fill: { fgColor: { rgb: 'FF0000' } } };
  const orangeStyle = {
    fill: { fgColor: { rgb: 'FFC000' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
  const dataCenterStyle = { alignment: { horizontal: 'center', vertical: 'center' } };

  const noteTitleStyle = {
    font: { color: { rgb: 'FF0000' }, underline: true, bold: true },
    alignment: { horizontal: 'left', vertical: 'center' },
  };

  const noteTextStyle = {
    font: { italic: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'left', vertical: 'center' },
  };

  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellAddress]) ws[cellAddress] = { v: '', t: 's' };

      if (R === 3 && C === 0) {
        ws[cellAddress].s = noteTitleStyle;
        continue;
      }
      if ((R === 4 || R === 5) && C === 0) {
        ws[cellAddress].s = noteTextStyle;
        continue;
      }

      if (R <= 1) {
        if (separatorIndices.includes(C)) {
          ws[cellAddress].s = separatorStyle;
        } else if (rtOrangeIndices.includes(C) && R === 1) {
          ws[cellAddress].s = orangeStyle;
        } else {
          if (R === 0) ws[cellAddress].s = headerStyle;
          else {
            ws[cellAddress].s = dataCenterStyle;

            if (typeof ws[cellAddress].v === 'number') {
              ws[cellAddress].t = 'n';
              if ((C >= 18 && C <= 19) || (C >= 21 && C <= 31)) {
                ws[cellAddress].z = '0.00';
              }
              if (C >= 33) {
                ws[cellAddress].z = '0';
              }
            }
          }
        }
      }
    }
  }

  ws['!cols'] = headers.map((h, i) =>
    separatorIndices.includes(i) ? { wch: 2 } : i === 0 ? { wch: 15 } : { wch: 20 }
  );

  ws['!merges'] = [
    { s: { r: 3, c: 0 }, e: { r: 3, c: 6 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 6 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 6 } },
  ];

  return ws;
}
