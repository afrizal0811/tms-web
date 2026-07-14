import { getBasePlate, sortRows } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';

function formatTimeStats(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return {
    minutes: totalMinutes,
    readable: `${hours}:${String(minutes).padStart(2, '0')}`,
    rounded: Math.round(totalMinutes / 60),
  };
}

export function generateSheetDataRouting(g2) {
  const headerStyle = {
    font: { bold: true },
    alignment: { horizontal: 'center', vertical: 'center' },
    fill: { fgColor: { rgb: 'EFEFEF' } },
    border: {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    },
  };
  const styleNormal = { alignment: { horizontal: 'center' } };
  const styleLeftNormal = { alignment: { horizontal: 'left', vertical: 'center' } };
  const styleError = {
    fill: { fgColor: { rgb: 'FADBD8' } },
    alignment: { horizontal: 'center' },
    font: { color: { rgb: '000000' } },
  };
  const styleLeftError = {
    fill: { fgColor: { rgb: 'FADBD8' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    font: { color: { rgb: '000000' } },
  };
  const styleDuplicate = {
    fill: { fgColor: { rgb: 'FFF2CC' } },
    alignment: { horizontal: 'center' },
  };
  const styleLeftDuplicate = {
    fill: { fgColor: { rgb: 'FFF2CC' } },
    alignment: { horizontal: 'left', vertical: 'center' },
  };
  const styleDiffLabel = {
    fill: { fgColor: { rgb: 'D4E6F1' } },
    alignment: { horizontal: 'center' },
  };
  const styleLeftDiffLabel = {
    fill: { fgColor: { rgb: 'D4E6F1' } },
    alignment: { horizontal: 'left', vertical: 'center' },
  };
  const styleBoldCenter = { font: { bold: true }, alignment: { horizontal: 'center' } };

  const row0 = [
    'Nama Routing',
    'Plat Nomor',
    'Driver',
    'Visit (min)',
    'Travel (min)',
    'Waiting (min)',
    'Total (min)',
    'Spent Time',
    'Spent Time (hour)',
    '',
    'KATEGORI',
    'TOTAL MENIT',
    'FORMAT JAM',
    'PEMBULATAN',
  ].map((v) => ({ v, s: v === '' ? {} : headerStyle }));

  const uniqueInputRows = [];
  const seenInput = new Set();

  (g2.detailRows || []).forEach((row) => {
    const manualTotal =
      (Number(row.visit) || 0) + (Number(row.travel) || 0) + (Number(row.wait) || 0);
    const spentTimeHHMM = !row.isNoRoutingData
      ? `${Math.floor(manualTotal / 60)}:${String(manualTotal % 60).padStart(2, '0')}`
      : '';
    const key = `${row.routing}|${getBasePlate((row.plat || '').toUpperCase().trim())}|${row.driver}|${row.visit}|${row.travel}|${row.wait}|${manualTotal}|${spentTimeHHMM}`;
    if (!seenInput.has(key)) {
      seenInput.add(key);
      uniqueInputRows.push(row);
    }
  });

  let recalcTotalDry = 0;
  let recalcTotalFrz = 0;
  const exactVehicleCounts = {};
  const basePlateToOriginalPlates = {};

  const processedDetailRows = uniqueInputRows.map((row) => {
    const vPlat = (row.plat || '').toUpperCase().trim();
    if (vPlat && !row.isNoRoutingData) {
      exactVehicleCounts[vPlat] = (exactVehicleCounts[vPlat] || 0) + 1;
      const basePlate = getBasePlate(vPlat);
      if (!basePlateToOriginalPlates[basePlate]) basePlateToOriginalPlates[basePlate] = new Set();
      basePlateToOriginalPlates[basePlate].add(vPlat);
    }

    if (row.isNoRoutingData) return { ...row, manualTotal: '' };

    const manualTotal =
      (Number(row.visit) || 0) + (Number(row.travel) || 0) + (Number(row.wait) || 0);
    if (row.category === 'DRY') recalcTotalDry += manualTotal;
    else if (row.category === 'FROZEN') recalcTotalFrz += manualTotal;

    return { ...row, manualTotal };
  });

  const statsDry = formatTimeStats(recalcTotalDry);
  const statsFrz = formatTimeStats(recalcTotalFrz);
  const statsTotal = formatTimeStats(recalcTotalDry + recalcTotalFrz);

  const summaries = [
    [
      { v: 'DRY', s: styleNormal },
      { v: statsDry.minutes, s: styleNormal },
      { v: statsDry.readable, s: styleNormal },
      { v: statsDry.rounded, s: styleNormal },
    ],
    [
      { v: 'FROZEN', s: styleNormal },
      { v: statsFrz.minutes, s: styleNormal },
      { v: statsFrz.readable, s: styleNormal },
      { v: statsFrz.rounded, s: styleNormal },
    ],
    [
      { v: 'TOTAL', s: styleBoldCenter },
      { v: statsTotal.minutes, s: styleBoldCenter },
      { v: statsTotal.readable, s: styleBoldCenter },
      { v: statsTotal.rounded, s: styleBoldCenter },
    ],
  ];

  const sheetData = [row0];
  const sortedDetailRows = sortRows(processedDetailRows, 'plat', 'driver');
  const maxRows = Math.max(sortedDetailRows.length, 3);

  for (let i = 0; i < maxRows; i++) {
    let currentRow = [];
    if (i < sortedDetailRows.length) {
      const row = sortedDetailRows[i];
      const isMissingRow = row.isNoRoutingData;
      const vPlatUpper = (row.plat || '').toUpperCase().trim();

      let rowStyle = styleNormal;
      let driverStyle = styleLeftNormal;
      if (isMissingRow) {
        rowStyle = styleError;
        driverStyle = styleLeftError;
      } else if (basePlateToOriginalPlates[getBasePlate(vPlatUpper)]?.size > 1) {
        rowStyle = styleDiffLabel;
        driverStyle = styleLeftDiffLabel;
      } else if (exactVehicleCounts[vPlatUpper] > 1) {
        rowStyle = styleDuplicate;
        driverStyle = styleLeftDuplicate;
      }

      const spentH = typeof row.manualTotal === 'number' ? Math.round(row.manualTotal / 60) : '';

      currentRow = [
        { v: row.routing, s: rowStyle },
        { v: getBasePlate(row.plat), s: rowStyle },
        { v: row.driver, s: driverStyle },
        {
          v: row.isVisitMissing && !isMissingRow ? '' : row.visit,
          s: row.isVisitMissing && !isMissingRow ? styleError : rowStyle,
        },
        {
          v: row.isTravelMissing && !isMissingRow ? '' : row.travel,
          s: row.isTravelMissing && !isMissingRow ? styleError : rowStyle,
        },
        {
          v: row.isWaitMissing && !isMissingRow ? '' : row.wait,
          s: row.isWaitMissing && !isMissingRow ? styleError : rowStyle,
        },
        {
          v: isMissingRow ? '' : row.manualTotal,
          s: rowStyle,
          ...(isMissingRow ? {} : { t: 'n' }),
        },
        {
          v:
            !isMissingRow && spentH !== ''
              ? `${Math.floor(row.manualTotal / 60)}:${String(row.manualTotal % 60).padStart(2, '0')}`
              : '',
          s: rowStyle,
        },
        { v: spentH, s: rowStyle, ...(isMissingRow ? {} : { t: 'n' }) },
      ];
    } else {
      currentRow = Array(9).fill({ v: '', s: {} });
    }

    currentRow.push({ v: '', s: {} });
    if (i < 3 && summaries[i]) {
      for (let j = 0; j < summaries[i].length; j++) {
        currentRow.push(summaries[i][j]);
      }
    }
    sheetData.push(currentRow);
  }

  sheetData.push(Array(14).fill({ v: '', s: {} }));
  sheetData.push([{ v: 'NOTE', s: {} }]);
  sheetData.push([
    { v: '', s: {} },
    { v: 'Kendaraan tidak digunakan dalam routing', s: {} },
  ]);
  sheetData.push([
    { v: '', s: {} },
    { v: 'Kendaraan sama digunakan di beberapa routing berbeda', s: {} },
  ]);
  sheetData.push([
    { v: '', s: {} },
    { v: 'kendaraan sama tapi digunakan pelabelan berbeda', s: {} },
  ]);

  const newWs = {};
  const range = { s: { c: 0, r: 0 }, e: { c: 13, r: sheetData.length - 1 } };

  for (let R = 0; R < sheetData.length; ++R) {
    for (let C = 0; C < sheetData[R].length; ++C) {
      if (!sheetData[R][C] || sheetData[R][C].v === undefined) continue;
      const cell = XLSX.utils.encode_cell({ r: R, c: C });
      newWs[cell] = sheetData[R][C];

      if (R === sheetData.length - 4 && C === 0)
        newWs[cell].s = { font: { color: { rgb: 'FF0000' }, underline: true, bold: true } };
      else if (R === sheetData.length - 3 && C === 0)
        newWs[cell].s = { fill: { fgColor: { rgb: 'FADBD8' } } };
      else if (R === sheetData.length - 2 && C === 0)
        newWs[cell].s = { fill: { fgColor: { rgb: 'FFF2CC' } } };
      else if (R === sheetData.length - 1 && C === 0)
        newWs[cell].s = { fill: { fgColor: { rgb: 'D4E6F1' } } };
      else if (R >= sheetData.length - 3 && C === 1)
        newWs[cell].s = { alignment: { vertical: 'center', horizontal: 'left' } };
    }
  }

  newWs['!ref'] = XLSX.utils.encode_range(range);
  newWs['!cols'] = [
    { wch: 30 },
    { wch: 18 },
    { wch: 30 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 15 },
    { wch: 15 },
    { wch: 2 },
    { wch: 15 },
    { wch: 15 },
    { wch: 25 },
    { wch: 20 },
  ];
  newWs['!merges'] = [
    { s: { r: sheetData.length - 3, c: 1 }, e: { r: sheetData.length - 3, c: 6 } },
    { s: { r: sheetData.length - 2, c: 1 }, e: { r: sheetData.length - 2, c: 6 } },
    { s: { r: sheetData.length - 1, c: 1 }, e: { r: sheetData.length - 1, c: 6 } },
  ];

  return newWs;
}
