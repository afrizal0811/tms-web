import { getBasePlate, sortRows } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';

function formatTimeStats(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return {
    minutes: totalMinutes,
    readable: `${hours} Jam ${minutes} Menit`,
    rounded: `${hours} Jam`,
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
  const normalCellStyle = { alignment: { horizontal: 'center' } };

  const errorCellStyle = {
    fill: { fgColor: { rgb: 'FADBD8' } },
    alignment: { horizontal: 'center' },
    font: { color: { rgb: '000000' } },
  };
  const missingRowStyle = {
    fill: { fgColor: { rgb: 'FADBD8' } },
    alignment: { horizontal: 'center' },
  };
  const duplicateStyle = {
    fill: { fgColor: { rgb: 'FFF2CC' } },
    alignment: { horizontal: 'center' },
  };
  const differentLabelStyle = {
    fill: { fgColor: { rgb: 'D4E6F1' } },
    alignment: { horizontal: 'center' },
  };

  const row0 = [
    { v: 'Nama Routing', s: headerStyle },
    { v: 'Plat Nomor', s: headerStyle },
    { v: 'Driver', s: headerStyle },
    { v: 'Visit (min)', s: headerStyle },
    { v: 'Travel (min)', s: headerStyle },
    { v: 'Waiting (min)', s: headerStyle },
    { v: 'Total (min)', s: headerStyle },
    { v: 'Spent Time', s: headerStyle },
    { v: 'Spent Time (hour)', s: headerStyle },
    { v: '', s: {} },
    { v: 'KATEGORI', s: headerStyle },
    { v: 'TOTAL MENIT', s: headerStyle },
    { v: 'FORMAT JAM', s: headerStyle },
    { v: 'PEMBULATAN', s: headerStyle },
  ];

  const uniqueInputRows = [];
  const seenInput = new Set();

  (g2.detailRows || []).forEach((row) => {
    const vPlatUpper = (row.plat || '').toUpperCase().trim();
    const displayPlat = getBasePlate(vPlatUpper);
    const isMissingRow = row.isNoRoutingData;

    let v = Number(row.visit) || 0;
    let t = Number(row.travel) || 0;
    let w = Number(row.wait) || 0;
    let manualTotal = v + t + w;

    let spentTimeHHMM = '';
    let spentTimeHour = '';

    if (!isMissingRow && typeof manualTotal === 'number') {
      const h = Math.floor(manualTotal / 60);
      const m = manualTotal % 60;
      spentTimeHHMM = `${h}:${String(m).padStart(2, '0')}`;
      spentTimeHour = h;
    }

    const excelValues = [
      row.routing,
      displayPlat,
      row.driver,
      row.isVisitMissing && !isMissingRow ? '' : row.visit,
      row.isTravelMissing && !isMissingRow ? '' : row.travel,
      row.isWaitMissing && !isMissingRow ? '' : row.wait,
      isMissingRow ? '' : manualTotal,
      spentTimeHHMM,
      spentTimeHour,
    ];

    const key = JSON.stringify(excelValues);
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
      if (!basePlateToOriginalPlates[basePlate]) {
        basePlateToOriginalPlates[basePlate] = new Set();
      }
      basePlateToOriginalPlates[basePlate].add(vPlat);
    }

    if (row.isNoRoutingData) {
      return { ...row, manualTotal: '' };
    }

    const v = Number(row.visit) || 0;
    const t = Number(row.travel) || 0;
    const w = Number(row.wait) || 0;
    const manualTotal = v + t + w;

    if (row.category === 'DRY') {
      recalcTotalDry += manualTotal;
    } else if (row.category === 'FROZEN') {
      recalcTotalFrz += manualTotal;
    }

    return { ...row, manualTotal };
  });

  const statsDry = formatTimeStats(recalcTotalDry);
  const statsFrz = formatTimeStats(recalcTotalFrz);
  const statsTotal = formatTimeStats(recalcTotalDry + recalcTotalFrz);

  const row1Summary = [
    { v: '', s: {} },
    { v: 'DRY', s: normalCellStyle },
    { v: statsDry.minutes, s: normalCellStyle },
    { v: statsDry.readable, s: normalCellStyle },
    { v: statsDry.rounded, s: normalCellStyle },
  ];
  const row2Summary = [
    { v: '', s: {} },
    { v: 'FROZEN', s: normalCellStyle },
    { v: statsFrz.minutes, s: normalCellStyle },
    { v: statsFrz.readable, s: normalCellStyle },
    { v: statsFrz.rounded, s: normalCellStyle },
  ];
  const row3Summary = [
    { v: '', s: {} },
    { v: 'TOTAL', s: { font: { bold: true }, alignment: { horizontal: 'center' } } },
    { v: statsTotal.minutes, s: { font: { bold: true }, alignment: { horizontal: 'center' } } },
    { v: statsTotal.readable, s: { font: { bold: true }, alignment: { horizontal: 'center' } } },
    { v: statsTotal.rounded, s: { font: { bold: true }, alignment: { horizontal: 'center' } } },
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
      const basePlate = getBasePlate(vPlatUpper);

      const isDuplicateExact = exactVehicleCounts[vPlatUpper] > 1;
      const isDifferentLabel =
        basePlateToOriginalPlates[basePlate] && basePlateToOriginalPlates[basePlate].size > 1;

      let rowStyle = normalCellStyle;
      if (isMissingRow) {
        rowStyle = missingRowStyle;
      } else if (isDifferentLabel) {
        rowStyle = differentLabelStyle;
      } else if (isDuplicateExact) {
        rowStyle = duplicateStyle;
      }

      let displayPlat = getBasePlate(row.plat);
      let spentTimeHHMM = '';
      let spentTimeHour = '';

      if (!isMissingRow && typeof row.manualTotal === 'number') {
        const h = Math.floor(row.manualTotal / 60);
        const m = row.manualTotal % 60;
        spentTimeHHMM = `${h}:${String(m).padStart(2, '0')}`;
        spentTimeHour = h;
      }

      currentRow = [
        { v: row.routing, s: rowStyle },
        { v: displayPlat, s: rowStyle },
        { v: row.driver, s: rowStyle },
        {
          v: row.isVisitMissing && !isMissingRow ? '' : row.visit,
          s: row.isVisitMissing && !isMissingRow ? errorCellStyle : rowStyle,
        },
        {
          v: row.isTravelMissing && !isMissingRow ? '' : row.travel,
          s: row.isTravelMissing && !isMissingRow ? errorCellStyle : rowStyle,
        },
        {
          v: row.isWaitMissing && !isMissingRow ? '' : row.wait,
          s: row.isWaitMissing && !isMissingRow ? errorCellStyle : rowStyle,
        },
        {
          v: isMissingRow ? '' : row.manualTotal,
          s: rowStyle,
          ...(isMissingRow ? {} : { t: 'n' }),
        },
        { v: spentTimeHHMM, s: rowStyle },
        {
          v: spentTimeHour,
          s: rowStyle,
          ...(isMissingRow ? {} : { t: 'n' }),
        },
      ];
    } else {
      currentRow = Array(9).fill({ v: '', s: {} });
    }

    currentRow.push({ v: '', s: {} });
    if (i === 0) currentRow.push(...row1Summary.slice(1));
    else if (i === 1) currentRow.push(...row2Summary.slice(1));
    else if (i === 2) currentRow.push(...row3Summary.slice(1));
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

  const noteTitleIdx = sheetData.length - 4;
  const legendErrorIdx = sheetData.length - 3;
  const legendYellowIdx = sheetData.length - 2;
  const legendBlueIdx = sheetData.length - 1;

  for (let R = 0; R < sheetData.length; ++R) {
    const rowData = sheetData[R];
    for (let C = 0; C < rowData.length; ++C) {
      if (!rowData[C] || rowData[C].v === undefined) continue;
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      newWs[cellRef] = rowData[C];

      if (R === noteTitleIdx && C === 0) {
        newWs[cellRef].s = { font: { color: { rgb: 'FF0000' }, underline: true, bold: true } };
      } else if (R === legendErrorIdx && C === 0) {
        newWs[cellRef].s = { fill: { fgColor: { rgb: 'FADBD8' } } };
      } else if (R === legendErrorIdx && C === 1) {
        newWs[cellRef].s = { alignment: { vertical: 'center', horizontal: 'left' } };
      } else if (R === legendYellowIdx && C === 0) {
        newWs[cellRef].s = { fill: { fgColor: { rgb: 'FFF2CC' } } };
      } else if (R === legendYellowIdx && C === 1) {
        newWs[cellRef].s = { alignment: { vertical: 'center', horizontal: 'left' } };
      } else if (R === legendBlueIdx && C === 0) {
        newWs[cellRef].s = { fill: { fgColor: { rgb: 'D4E6F1' } } };
      } else if (R === legendBlueIdx && C === 1) {
        newWs[cellRef].s = { alignment: { vertical: 'center', horizontal: 'left' } };
      }
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
    { s: { r: legendErrorIdx, c: 1 }, e: { r: legendErrorIdx, c: 6 } },
    { s: { r: legendYellowIdx, c: 1 }, e: { r: legendYellowIdx, c: 6 } },
    { s: { r: legendBlueIdx, c: 1 }, e: { r: legendBlueIdx, c: 6 } },
  ];

  return newWs;
}
