import { formatMinutesToHHMM, getBasePlate } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import { getRawPlate, STYLES } from './shared';

export function buildDistanceSummary(wb, driverData, routingMap, timeDataObjects, t) {
  let estDryT = 0,
    estDryD = 0,
    estFrzT = 0,
    estFrzD = 0;
  let actDryT = 0,
    actDryD = 0,
    actFrzT = 0,
    actFrzD = 0;

  const seenGroupsEst = new Set();
  routingMap.forEach((rData, key) => {
    if (seenGroupsEst.has(key)) return;
    seenGroupsEst.add(key);

    if (rData?.hasTrips) {
      const dist = rData.totalDistance || 0;
      const dur = rData.shipDurationRaw || 0;
      const driverName = rData.driver || key.split('_')[0] || '';
      if (driverName.toUpperCase().includes('DRY')) {
        estDryT += dur;
        estDryD += dist;
      } else if (driverName.toUpperCase().includes('FRZ')) {
        estFrzT += dur;
        estFrzD += dist;
      }
    }
  });

  const mergedTimeMap = new Map();
  (timeDataObjects || []).forEach((i) => {
    const rawPlat = getRawPlate(i);
    const basePlat = getBasePlate(rawPlat) || rawPlat || '';
    const key = `${i.driver}_${basePlat}`;
    if (!mergedTimeMap.has(key)) {
      mergedTimeMap.set(key, { ...i, plat: rawPlat || i.plat });
    } else {
      const ext = mergedTimeMap.get(key);
      ext.travelTimeVal = (Number(ext.travelTimeVal) || 0) + (Number(i.travelTimeVal) || 0);
      ext.totalDistance = (Number(ext.totalDistance) || 0) + (Number(i.totalDistance) || 0);
    }
  });

  Array.from(mergedTimeMap.values()).forEach((i) => {
    if (i.driver.toUpperCase().includes('DRY')) {
      actDryT += i.travelTimeVal || 0;
      actDryD += i.totalDistance || 0;
    } else if (i.driver.toUpperCase().includes('FRZ')) {
      actFrzT += i.travelTimeVal || 0;
      actFrzD += i.totalDistance || 0;
    }
  });

  const sheetData = [
    [
      t('excel.reports.dist_summary.estimation'),
      null,
      null,
      '',
      t('excel.reports.dist_summary.actual'),
      null,
      null,
    ],
    [
      t('excel.reports.dist_summary.category'),
      t('common.travel_time'),
      t('common.distance'),
      '',
      t('excel.reports.dist_summary.category'),
      t('common.travel_time'),
      t('common.distance'),
    ],
    [
      'Dry',
      formatMinutesToHHMM(estDryT),
      Number((estDryD / 1000).toFixed(2)),
      '',
      'Dry',
      formatMinutesToHHMM(actDryT),
      Number(actDryD.toFixed(2)),
    ],
    [
      'Frozen',
      formatMinutesToHHMM(estFrzT),
      Number((estFrzD / 1000).toFixed(2)),
      '',
      'Frozen',
      formatMinutesToHHMM(actFrzT),
      Number(actFrzD.toFixed(2)),
    ],
    [
      'Total',
      formatMinutesToHHMM(estDryT + estFrzT),
      Number(((estDryD + estFrzD) / 1000).toFixed(2)),
      '',
      'Total',
      formatMinutesToHHMM(actDryT + actFrzT),
      Number((actDryD + actFrzD).toFixed(2)),
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
    { s: { r: 0, c: 4 }, e: { r: 0, c: 6 } },
  ];
  ws['!cols'] = [
    { wch: 15 },
    { wch: 20 },
    { wch: 25 },
    { wch: 3 },
    { wch: 15 },
    { wch: 20 },
    { wch: 25 },
  ];

  const borderAll = {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' },
  };

  for (let R = 0; R < sheetData.length; ++R) {
    for (let C = 0; C < 7; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
      if (C === 3) continue;

      let baseStyle = STYLES.center;
      if (R === 0 && (C === 0 || C === 4)) baseStyle = STYLES.greenHeader;
      else if (R === 1) baseStyle = STYLES.header;

      let highlightStyle = {};
      if (C === 2 && (R === 2 || R === 3)) {
        highlightStyle = STYLES.yellowFillHighlight;
      }

      ws[cellRef].s = { ...baseStyle, border: borderAll, ...highlightStyle };
    }
  }
  XLSX.utils.book_append_sheet(wb, ws, t('excel.reports.dist_summary.sheet_name'));
}
