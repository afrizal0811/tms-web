import { getBasePlate, isEmpty, sortRows } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';

export function generateSheetRouteReview(routeReviewRows, startFinishRows = [], g2DetailRows = []) {
  const headers = [
    'Tipe',
    'Plat Nomor',
    'Driver',
    'Est Operating Hours',
    'Act Operating Hours',
    'Overtime',
  ];
  const sheetData = [headers];

  const tempProcessed = routeReviewRows.map((row) => {
    const sfRows = startFinishRows.filter((r) => {
      const rDriver = (r.driver || '').toUpperCase().trim();
      const rowDriver = (row.driver || '').toUpperCase().trim();
      const rPlat = (r.plat || '').toUpperCase().trim();
      const rowPlat = (row.plat || '').toUpperCase().trim();
      return rDriver === rowDriver && rPlat === rowPlat;
    });

    let estOp = '';
    if (g2DetailRows && g2DetailRows.length > 0) {
      const matchingG2 = g2DetailRows.filter((g) => {
        if (g.isNoRoutingData) return false;
        const gDriver = (g.driver || '').toUpperCase().trim();
        const rDriver = (row.driver || '').toUpperCase().trim();

        return gDriver && rDriver && gDriver === rDriver;
      });

      if (matchingG2.length > 0) {
        let totalEstHours = 0;
        matchingG2.forEach((g) => {
          const manualTotal =
            (Number(g.visit) || 0) + (Number(g.travel) || 0) + (Number(g.wait) || 0);
          if (manualTotal > 0) {
            totalEstHours += Math.floor(manualTotal / 60);
          }
        });
        estOp = totalEstHours;
      }
    }

    if (estOp === '' && !isEmpty(row.estOpHours)) {
      estOp = Number(row.estOpHours);
    }

    let actOp = '';
    let totalActMins = 0;
    let hasDurasi = false;

    sfRows.forEach((sf) => {
      if (sf.durasi && typeof sf.durasi === 'string' && sf.durasi.includes(':')) {
        const parts = sf.durasi.split(' ')[0].split(':');
        if (parts.length >= 2) {
          totalActMins += (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
          hasDurasi = true;
        }
      }
    });

    if (hasDurasi) {
      actOp = Math.floor(totalActMins / 60);
    } else if (!isEmpty(row.actOpHours)) {
      actOp = Number(row.actOpHours);
    }

    const isEstEmpty = estOp === '' || estOp === 0;
    const isActHasValue = actOp !== '';
    const shouldHide = isEstEmpty && isActHasValue;

    if (shouldHide) {
      estOp = null;
      actOp = null;
    }

    let overtime = '';
    if (typeof estOp === 'number' && typeof actOp === 'number') {
      overtime = estOp - actOp;
    }

    const hasOperatingHours = typeof estOp === 'number' || typeof actOp === 'number';
    let isErrorRed = false;

    const isAnyJamStartMissing = sfRows.some((sf) => isEmpty(sf.jamStart));
    if (hasOperatingHours && (sfRows.length === 0 || isAnyJamStartMissing)) {
      isErrorRed = true;
    }

    return {
      ...row,
      estOp,
      actOp,
      overtime,
      isErrorRed,
      isMultipleSessions: sfRows.some((sf) => sf.isMultipleSessions) || sfRows.length > 1,
    };
  });

  const uniqueProcessed = [];
  const seenRR = new Set();
  let sumEstHours = 0;
  let sumActHours = 0;
  let sumOvertime = 0;

  tempProcessed.forEach((row) => {
    const excelValues = [
      row.tipe,
      getBasePlate(row.plat),
      row.driver,
      row.estOp,
      row.actOp,
      row.overtime,
    ];
    const key = JSON.stringify(excelValues);

    if (!seenRR.has(key)) {
      seenRR.add(key);
      uniqueProcessed.push(row);
      if (typeof row.estOp === 'number') sumEstHours += row.estOp;
      if (typeof row.actOp === 'number') sumActHours += row.actOp;
      if (typeof row.overtime === 'number') sumOvertime += row.overtime;
    }
  });

  const sortedRows = sortRows([...uniqueProcessed], 'plat', 'driver');

  sortedRows.forEach((row) => {
    sheetData.push([
      row.tipe,
      getBasePlate(row.plat),
      row.driver,
      row.estOp,
      row.actOp,
      row.overtime,
    ]);
  });

  sheetData.push(['TOTAL', '', '', sumEstHours, sumActHours, sumOvertime]);

  sheetData.push([]);
  sheetData.push(['NOTE']);
  sheetData.push(['', 'Terdapat data routing tapi tidak ada waktu start-finish']);
  sheetData.push(['', 'Driver klik Start-Finish lebih dari 1x dalam sehari']);
  sheetData.push(['Est Operating Hours', 'Spent Time di Data Routing']);
  sheetData.push(['Act Operating Hours', 'Durasi di Start & Finish']);

  const wsRR = XLSX.utils.aoa_to_sheet(sheetData);

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

  const rangeRR = XLSX.utils.decode_range(wsRR['!ref']);

  const totalRowIndex = sheetData.length - 7;
  const noteTitleIdx = sheetData.length - 5;
  const legendErrorIdx = sheetData.length - 4;
  const legendYellowIdx = sheetData.length - 3;
  const estLegendIdx = sheetData.length - 2;
  const actLegendIdx = sheetData.length - 1;

  for (let R = rangeRR.s.r; R <= rangeRR.e.r; ++R) {
    for (let C = rangeRR.s.c; C <= rangeRR.e.c; ++C) {
      const cell = XLSX.utils.encode_cell({ r: R, c: C });
      if (!wsRR[cell]) wsRR[cell] = { v: '' };

      if (R === 0) {
        wsRR[cell].s = headerStyle;
      } else if (R === totalRowIndex) {
        wsRR[cell].s = { font: { bold: true }, alignment: { horizontal: 'center' } };
        if (typeof wsRR[cell].v === 'number') {
          wsRR[cell].t = 'n';
          wsRR[cell].z = '0';
        }
      } else if (R === noteTitleIdx && C === 0) {
        wsRR[cell].s = { font: { color: { rgb: 'FF0000' }, underline: true, bold: true } };
      } else if (R === legendErrorIdx && C === 0) {
        wsRR[cell].s = { fill: { fgColor: { rgb: 'FADBD8' } } };
      } else if (R === legendErrorIdx && C === 1) {
        wsRR[cell].s = { alignment: { vertical: 'center', horizontal: 'left' } };
      } else if (R === legendYellowIdx && C === 0) {
        wsRR[cell].s = { fill: { fgColor: { rgb: 'FFF2CC' } } };
      } else if (R === legendYellowIdx && C === 1) {
        wsRR[cell].s = { alignment: { vertical: 'center', horizontal: 'left' } };
      } else if ((R === estLegendIdx || R === actLegendIdx) && C === 0) {
        wsRR[cell].s = {
          font: { bold: true, color: { rgb: '333333' } },
          alignment: { vertical: 'center', horizontal: 'left' },
        };
      } else if ((R === estLegendIdx || R === actLegendIdx) && C === 1) {
        wsRR[cell].s = { alignment: { vertical: 'center', horizontal: 'left' } };
      } else if (R > 0 && R < totalRowIndex) {
        const rowData = sortedRows[R - 1];

        if (rowData && rowData.isErrorRed) {
          wsRR[cell].s = { ...errorRedStyle };
        } else if (rowData && rowData.isMultipleSessions) {
          wsRR[cell].s = { ...multipleYellowStyle };
        } else {
          wsRR[cell].s = { ...dataCenterStyle };
        }

        if (typeof wsRR[cell].v === 'number') {
          wsRR[cell].t = 'n';
          wsRR[cell].z = '0';
        }
      }
    }
  }

  wsRR['!cols'] = [{ wch: 10 }, { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 15 }];

  wsRR['!merges'] = [
    { s: { r: legendErrorIdx, c: 1 }, e: { r: legendErrorIdx, c: 5 } },
    { s: { r: legendYellowIdx, c: 1 }, e: { r: legendYellowIdx, c: 5 } },
    { s: { r: estLegendIdx, c: 1 }, e: { r: estLegendIdx, c: 5 } },
    { s: { r: actLegendIdx, c: 1 }, e: { r: actLegendIdx, c: 5 } },
  ];

  return { wsRR, sumOvertime };
}
