import { formatMinutesToHHMM, getBasePlate, heatMap, isEmpty, sortRows } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import { isValidValue, STYLES } from './shared';

export function buildTruckDetailSheet(wb, driverData, routingMap, deliveryMap, t) {
  const headers = [
    t('common.license_number'),
    t('common.driver'),
    t('common.weight'),
    t('common.volume'),
    t('common.distance'),
    t('excel.reports.truck_detail.total_visit'),
    t('excel.reports.truck_detail.total_delivery'),
    t('excel.reports.truck_detail.ship_duration'),
    t('excel.reports.truck_detail.delivered'),
    t('excel.reports.truck_detail.eta_first'),
    t('excel.reports.truck_detail.etd_hub'),
    t('common.status.manual_assign'),
    t('common.status.diff_day'),
  ];

  const allVehicleGroups = new Map();
  const registerGroup = (cleanDriver, cleanPlat) => {
    if (!cleanDriver || !cleanPlat || cleanPlat.toUpperCase().includes('DEMO')) return;
    const basePlat = getBasePlate(cleanPlat) || cleanPlat;
    const key = `${cleanDriver}_${basePlat}`;
    if (!allVehicleGroups.has(key)) {
      allVehicleGroups.set(key, { driver: cleanDriver, plat: cleanPlat, key });
    }
  };

  (driverData || []).forEach((d) =>
    registerGroup(isValidValue(d.name) ? d.name : '', isValidValue(d.plat) ? d.plat : '')
  );
  routingMap.forEach((r, key) =>
    registerGroup(
      isValidValue(r.driver) ? r.driver : key.split('_')[0] || '',
      isValidValue(r.plat) ? r.plat : ''
    )
  );
  deliveryMap.forEach((d, key) =>
    registerGroup(
      isValidValue(d.driver) ? d.driver : key.split('_')[0] || '',
      isValidValue(d.plat) ? d.plat : ''
    )
  );

  const excelDataRows = [];
  const seenGroups = new Set();

  allVehicleGroups.forEach((item, key) => {
    if (
      !item.driver ||
      !item.plat ||
      item.plat === '-' ||
      item.driver === '-' ||
      item.plat?.toUpperCase().includes('DEMO') ||
      seenGroups.has(key)
    )
      return;
    seenGroups.add(key);

    const rData = routingMap.get(key);
    const dData = deliveryMap.get(key);
    const hasRouting = rData?.hasTrips;
    const hasDelivery = dData && dData.totalOutlet > 0;

    let wPct = null,
      vPct = null,
      dist = null,
      vis = null,
      del = null,
      dur = null,
      pct = null,
      eta = null,
      etd = null,
      man = null,
      diff = null;
    let hType = 'none';

    if (hasRouting && !hasDelivery) {
      wPct = rData.weightPercentage > 0 ? `${rData.weightPercentage}%` : null;
      vPct = rData.volumePercentage > 0 ? `${rData.volumePercentage}%` : null;
      dist = rData.totalDistance > 0 ? (rData.totalDistance / 1000).toFixed(2) : null;
      dur = formatMinutesToHHMM(rData.shipDurationRaw);
      eta = rData.etaFirstStore;
      etd = rData.etdHub;
    } else if (!hasRouting && hasDelivery) {
      vis = dData.totalOutlet;
      del = dData.totalOutlet - (dData.failedCount || 0);
      man = dData.missingDataCustomers.map((m) => `• ${m.name}`).join('\n') || null;
      diff = dData.mismatchCustomers.map((m) => `• ${m.name}`).join('\n') || null;
      hType = dData.mismatchCustomers.length > 0 ? 'green' : 'blue';
    } else if (hasRouting && hasDelivery) {
      wPct = rData.weightPercentage > 0 ? `${rData.weightPercentage}%` : null;
      vPct = rData.volumePercentage > 0 ? `${rData.volumePercentage}%` : null;
      dist = rData.totalDistance > 0 ? (rData.totalDistance / 1000).toFixed(2) : '-';
      dur = rData.shipDurationRaw > 0 ? formatMinutesToHHMM(rData.shipDurationRaw) : '-';
      eta = rData.etaFirstStore;
      etd = rData.etdHub;
      vis = dData.totalOutlet;
      del = dData.totalOutlet - (dData.failedCount || 0);
      man = dData.missingDataCustomers.map((m) => `• ${m.name}`).join('\n') || null;
      diff = dData.mismatchCustomers.map((m) => `• ${m.name}`).join('\n') || null;

      const hasMan = dData.missingDataCustomers.length > 0;
      const hasDif = dData.mismatchCustomers.length > 0;
      if (hasMan && hasDif) hType = 'indigo';
      else if (hasMan) hType = 'blue';
      else if (hasDif) hType = 'magenta';
    }

    if (!isEmpty(del) || !isEmpty(vis)) {
      pct = (del / vis) * 100;
      pct = isNaN(pct) ? '0%' : `${pct.toFixed(2)}%`;
    }

    excelDataRows.push({
      plat: getBasePlate(item.plat) || item.plat || '-',
      driver: item.driver || '-',
      wPct,
      vPct,
      dist,
      vis,
      del,
      dur,
      pct,
      eta,
      etd,
      man,
      diff,
      hType,
      hasSplitTask: dData?.hasSplitTask || false,
    });
  });

  const sortData = sortRows(excelDataRows, 'plat', 'driver');
  const sheetData = [
    headers,
    ...sortData.map((r) => [
      r.plat,
      r.driver,
      r.wPct,
      r.vPct,
      r.dist,
      r.vis,
      r.del,
      r.dur,
      r.pct,
      r.eta,
      r.etd,
      r.man,
      r.diff,
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!view'] = { state: 'frozen', ySplit: 1 };
  ws['!cols'] = [
    { wch: 15 },
    { wch: 25 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 30 },
    { wch: 30 },
  ];
  ws['!rows'] = [{ hpt: 40 }];

  const fillMap = {
    orange: STYLES.redFill.fill,
    blue: STYLES.blueFill.fill,
    magenta: STYLES.magentaFill.fill,
    indigo: STYLES.indigoFill.fill,
  };

  for (let R = 0; R < sheetData.length; ++R) {
    const rType = R > 0 ? sortData[R - 1].hType : 'none';
    const rowFill = fillMap[rType] || null;

    for (let C = 0; C < headers.length; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };

      if (R === 0) {
        const baseHeaderStyle = C >= 2 && C <= 7 ? STYLES.greenHeader : STYLES.header;
        ws[cellRef].s = {
          ...baseHeaderStyle,
          alignment: { ...baseHeaderStyle.alignment, wrapText: true, vertical: 'center' },
        };
      } else {
        ws[cellRef].s = C <= 1 ? STYLES.left : [11, 12].includes(C) ? STYLES.wrap : STYLES.center;
        if (rowFill && C >= 2 && C <= 7) {
          ws[cellRef].s = { ...ws[cellRef].s, fill: rowFill, font: { color: { rgb: 'FFFFFF' } } };
        }
        if ((rType === 'blue' || rType === 'indigo') && [2, 3, 4, 7].includes(C)) {
          ws[cellRef].s = { ...ws[cellRef].s, font: { bold: true, color: { rgb: 'FFB3B3' } } };
        }

        if (C === 8) {
          const heatColor = heatMap(sortData[R - 1]?.pct);
          if (heatColor) {
            ws[cellRef].s = {
              ...ws[cellRef].s,
              fill: { patternType: 'solid', fgColor: { rgb: heatColor } },
            };
          }
        }

        if (C === 5 && sortData[R - 1]?.hasSplitTask) {
          const splitBorder = { style: 'medium', color: { rgb: 'ffbe7d' } };
          ws[cellRef].s = {
            ...ws[cellRef].s,
            border: {
              top: splitBorder,
              bottom: splitBorder,
              left: splitBorder,
              right: splitBorder,
            },
          };
        }
      }
    }
  }

  const dataCount = sheetData.length;
  XLSX.utils.sheet_add_aoa(
    ws,
    [
      [],
      [t('common.color_exp')],
      ['', t('excel.reports.truck_detail.orange')],
      ['', t('excel.reports.truck_detail.blue')],
      ['', t('excel.reports.truck_detail.magenta')],
      ['', t('excel.reports.truck_detail.indigo')],
      ['', t('excel.reports.truck_detail.red_text')],
    ],
    { origin: -1 }
  );

  ws[XLSX.utils.encode_cell({ r: dataCount + 1, c: 0 })] = {
    t: 's',
    v: t('common.color_exp'),
    s: { font: { bold: true, underline: true } },
  };
  ws[XLSX.utils.encode_cell({ r: dataCount + 2, c: 0 })] = {
    t: 's',
    v: '',
    s: { border: STYLES.orangeBorder.border, font: { color: { rgb: 'FFFFFF' } } },
  };
  ws[XLSX.utils.encode_cell({ r: dataCount + 3, c: 0 })] = {
    t: 's',
    v: '',
    s: { fill: STYLES.blueFill.fill, font: { color: { rgb: 'FFFFFF' } } },
  };
  ws[XLSX.utils.encode_cell({ r: dataCount + 4, c: 0 })] = {
    t: 's',
    v: '',
    s: { fill: STYLES.magentaFill.fill, font: { color: { rgb: 'FFFFFF' } } },
  };
  ws[XLSX.utils.encode_cell({ r: dataCount + 5, c: 0 })] = {
    t: 's',
    v: '',
    s: { fill: STYLES.indigoFill.fill, font: { color: { rgb: 'FFFFFF' } } },
  };
  ws[XLSX.utils.encode_cell({ r: dataCount + 6, c: 0 })] = {
    t: 's',
    v: 'Text',
    s: { font: { color: { rgb: 'ffb3b3' }, bold: true }, alignment: { horizontal: 'center' } },
  };

  XLSX.utils.book_append_sheet(wb, ws, t('excel.reports.truck_detail.sheet_name'));
}
