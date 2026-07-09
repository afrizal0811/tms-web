import { getBasePlate, isEmpty, sortRows } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';

export function generateSheetRouteReview(routeReviewRows, startFinishRows = [], g2DetailRows = []) {
  const sfMap = new Map();
  startFinishRows.forEach((r) => {
    const key = `${(r.driver || '').toUpperCase().trim()}|${(r.plat || '').toUpperCase().trim()}`;
    if (!sfMap.has(key)) sfMap.set(key, []);
    sfMap.get(key).push(r);
  });

  const g2Map = new Map();
  if (g2DetailRows) {
    g2DetailRows.forEach((g) => {
      if (!g.isNoRoutingData) {
        const key = (g.driver || '').toUpperCase().trim();
        if (!g2Map.has(key)) g2Map.set(key, 0);
        const manualTotal =
          (Number(g.visit) || 0) + (Number(g.travel) || 0) + (Number(g.wait) || 0);
        g2Map.set(key, g2Map.get(key) + manualTotal);
      }
    });
  }

  const uniqueProcessed = [];
  const seenRR = new Set();
  let sumEstHours = 0,
    sumActHours = 0,
    sumOvertime = 0;

  routeReviewRows.forEach((row) => {
    const driverUp = (row.driver || '').toUpperCase().trim();
    const platUp = (row.plat || '').toUpperCase().trim();
    const sfRows = sfMap.get(`${driverUp}|${platUp}`) || [];

    let estOp = g2Map.has(driverUp) ? Math.floor(g2Map.get(driverUp) / 60) : '';
    if (estOp === '' && !isEmpty(row.estOpHours)) estOp = Number(row.estOpHours);

    let actOp = '';
    let totalActMins = 0;

    sfRows.forEach((sf) => {
      if (typeof sf.durasi === 'string' && sf.durasi.includes(':')) {
        const parts = sf.durasi.split(':')[0];
        totalActMins +=
          (parseInt(parts, 10) || 0) * 60 + (parseInt(sf.durasi.split(':')[1], 10) || 0);
        actOp = true;
      }
    });

    if (actOp === true) actOp = Math.floor(totalActMins / 60);
    else if (!isEmpty(row.actOpHours)) actOp = Number(row.actOpHours);

    const isEstEmpty = estOp === '' || estOp === 0;
    if (isEstEmpty && actOp !== '') {
      estOp = null;
      actOp = null;
    }

    let overtime = '';
    if (typeof estOp === 'number' && typeof actOp === 'number') overtime = estOp - actOp;

    const hasOperatingHours = typeof estOp === 'number' || typeof actOp === 'number';
    const isErrorRed =
      hasOperatingHours && (sfRows.length === 0 || sfRows.some((sf) => isEmpty(sf.jamStart)));

    const key = `${row.tipe}|${getBasePlate(row.plat)}|${row.driver}|${estOp}|${actOp}|${overtime}`;
    if (!seenRR.has(key)) {
      seenRR.add(key);
      uniqueProcessed.push({
        ...row,
        estOp,
        actOp,
        overtime,
        isErrorRed,
        isMultipleSessions: sfRows.some((sf) => sf.isMultipleSessions) || sfRows.length > 1,
      });
      if (typeof estOp === 'number') sumEstHours += estOp;
      if (typeof actOp === 'number') sumActHours += actOp;
      if (typeof overtime === 'number') sumOvertime += overtime;
    }
  });

  const sortedRows = sortRows(uniqueProcessed, 'plat', 'driver');
  const sheetData = [
    ['Tipe', 'Plat Nomor', 'Driver', 'Est Operating Hours', 'Act Operating Hours', 'Overtime'],
    ...sortedRows.map((r) => [
      r.tipe,
      getBasePlate(r.plat),
      r.driver,
      r.estOp,
      r.actOp,
      r.overtime,
    ]),
    ['TOTAL', '', '', sumEstHours, sumActHours, sumOvertime],
    [],
    ['NOTE'],
    ['', 'Terdapat data routing tapi tidak ada waktu start-finish'],
    ['', 'Driver klik Start-Finish lebih dari 1x dalam sehari'],
    ['Est Operating Hours', 'Spent Time di Data Routing'],
    ['Act Operating Hours', 'Durasi di Start & Finish'],
  ];

  const wsRR = XLSX.utils.aoa_to_sheet(sheetData);
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

  const totalRowIdx = sheetData.length - 7;
  for (let R = 0; R < sheetData.length; ++R) {
    for (let C = 0; C < 6; ++C) {
      const cell = XLSX.utils.encode_cell({ r: R, c: C });
      if (!wsRR[cell]) wsRR[cell] = { v: '' };

      if (R === 0) wsRR[cell].s = styleHeader;
      else if (R === totalRowIdx) {
        wsRR[cell].s = { font: { bold: true }, alignment: { horizontal: 'center' } };
        if (typeof wsRR[cell].v === 'number') {
          wsRR[cell].t = 'n';
          wsRR[cell].z = '0';
        }
      } else if (R === sheetData.length - 5 && C === 0)
        wsRR[cell].s = { font: { color: { rgb: 'FF0000' }, underline: true, bold: true } };
      else if (R === sheetData.length - 4 && C === 0)
        wsRR[cell].s = { fill: { fgColor: { rgb: 'FADBD8' } } };
      else if (R === sheetData.length - 3 && C === 0)
        wsRR[cell].s = { fill: { fgColor: { rgb: 'FFF2CC' } } };
      else if (R >= sheetData.length - 2 && C === 0)
        wsRR[cell].s = {
          font: { bold: true, color: { rgb: '333333' } },
          alignment: { vertical: 'center', horizontal: 'left' },
        };
      else if (R >= sheetData.length - 4 && C === 1)
        wsRR[cell].s = { alignment: { vertical: 'center', horizontal: 'left' } };
      else if (R > 0 && R < totalRowIdx) {
        const rowData = sortedRows[R - 1];
        wsRR[cell].s = rowData?.isErrorRed
          ? styleError
          : rowData?.isMultipleSessions
            ? styleMultiple
            : styleCenter;
        if (typeof wsRR[cell].v === 'number') {
          wsRR[cell].t = 'n';
          wsRR[cell].z = '0';
        }
      }
    }
  }

  wsRR['!cols'] = [{ wch: 10 }, { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 15 }];
  wsRR['!merges'] = [
    { s: { r: sheetData.length - 4, c: 1 }, e: { r: sheetData.length - 4, c: 5 } },
    { s: { r: sheetData.length - 3, c: 1 }, e: { r: sheetData.length - 3, c: 5 } },
    { s: { r: sheetData.length - 2, c: 1 }, e: { r: sheetData.length - 2, c: 5 } },
    { s: { r: sheetData.length - 1, c: 1 }, e: { r: sheetData.length - 1, c: 5 } },
  ];

  return { wsRR, sumOvertime };
}
