'use client';

import * as XLSX from 'xlsx-js-style';
// import { reportColumns, reportStyles } from './routingConfig';

export const reportStyles = {
  centerStyle: { alignment: { horizontal: 'center', vertical: 'center' } },
  defaultHeaderStyle: {
    alignment: { horizontal: 'center', vertical: 'center' },
    font: { bold: true },
  },
  greenHeaderStyle: {
    alignment: { horizontal: 'center', vertical: 'center' },
    font: { bold: true },
    fill: { patternType: 'solid', fgColor: { rgb: '84FA92' } },
  },
  distanceHeaderStyle: {
    font: { bold: true },
    alignment: { horizontal: 'center', vertical: 'center' },
  },
  distanceDataStyle: {
    alignment: { horizontal: 'center', vertical: 'center' },
    t: 'n',
    z: '0.00',
  },
  usageDataNumStyle: {
    alignment: { horizontal: 'center', vertical: 'center' },
    t: 'n',
  },
  usageDataLabelStyle: {
    alignment: { horizontal: 'left', vertical: 'center' },
  },
  helpDataStyle: {
    alignment: { horizontal: 'left', vertical: 'center' },
  },
};

export const reportColumns = {
  truckDetailCenterAligned: [2, 3, 4, 7, 8, 9],
  distanceSummary: [{ wch: 15 }, { wch: 15 }],
  truckUsage: [{ wch: 20 }, { wch: 15 }, { wch: 15 }],
  help: [{ wch: 28 }, { wch: 30 }, { wch: 20 }, { wch: 22 }, { wch: 45 }],
};

export const getRoutingHeaders = (translate) => ({
  truckDetail: [
    translate('common.license_number'),
    translate('common.driver'),
    translate('excel.routing.headers.weight_pct'),
    translate('excel.routing.headers.volume_pct'),
    translate('excel.routing.headers.total_dist'),
    translate('excel.routing.headers.total_visits'),
    translate('excel.routing.headers.total_delivery'),
    translate('excel.routing.headers.ship_dur'),
    translate('excel.routing.headers.eta_first'),
    translate('excel.routing.headers.etd_hub'),
  ],
  truckDetailGreen: [
    translate('excel.routing.headers.weight_pct'),
    translate('excel.routing.headers.volume_pct'),
    translate('excel.routing.headers.total_dist'),
    translate('excel.routing.headers.total_visits'),
    translate('excel.routing.headers.total_delivery'),
    translate('excel.routing.headers.ship_dur'),
  ],
  distanceSummary: [
    translate('excel.routing.headers.dry_km'),
    translate('excel.routing.headers.frozen_km'),
  ],
  truckUsage: [
    translate('common.vehicle_type'),
    translate('excel.routing.headers.count_dry'),
    translate('excel.routing.headers.count_frozen'),
  ],
  help: [
    translate('excel.routing.headers.routing_id'),
    translate('excel.routing.headers.routing_name'),
    translate('excel.routing.headers.created_by'),
    translate('excel.routing.headers.created_at'),
    translate('excel.routing.headers.routing_result'),
  ],
});

export const getRoutingSheetNames = (translate) => ({
  truckDetail: translate('excel.routing.sheets.truck_detail'),
  distSummary: translate('excel.routing.sheets.dist_summary'),
  truckUsage: translate('excel.routing.sheets.truck_usage'),
  help: translate('excel.routing.sheets.help'),
});


export function ultraNormalize(str) {
  if (!str) return '';
  return String(str)
    .replace(/[\s\-'"]/g, '')
    .toLowerCase();
}

export function buildDriverMaps(driverData) {
  const emailMap = new Map();
  const platMap = new Map();

  if (!Array.isArray(driverData)) return { emailMap, platMap };

  driverData.forEach((driver) => {
    let typeVal = driver.type;
    if (!typeVal && driver.tags) {
      try {
        const parsed = JSON.parse(driver.tags);
        if (Array.isArray(parsed) && parsed.length > 0) typeVal = parsed[0];
      } catch {
        typeVal = driver.tags;
      }
    }

    const storage = (driver.storage || 'DRY').toUpperCase();
    const entry = { name: driver.name, plat: driver.plat, storage, type: typeVal };

    if (driver.email) emailMap.set(driver.email.trim().toLowerCase(), entry);
    if (driver.plat) platMap.set(ultraNormalize(driver.plat), entry);
  });

  return { emailMap, platMap };
}

export function buildNormalizedMappings(mappingsObj) {
  const normalized = {};
  if (!mappingsObj) return normalized;
  Object.keys(mappingsObj).forEach((key) => {
    if (key) normalized[ultraNormalize(key)] = mappingsObj[key];
  });
  return normalized;
}

export function resolveVehicleCategory(data, normalizedMappings) {
  const basePlateStr = ultraNormalize(data.plat);
  const originalRawStr = ultraNormalize(data.originalPlateForMap || data.plat);
  const dbKeys = Object.keys(normalizedMappings);

  let category = '';
  let mapped = false;

  if (basePlateStr && normalizedMappings[basePlateStr]) {
    category = normalizedMappings[basePlateStr];
    mapped = true;
  } else if (originalRawStr && normalizedMappings[originalRawStr]) {
    category = normalizedMappings[originalRawStr];
    mapped = true;
  } else {
    for (const dbKey of dbKeys) {
      if (dbKey.length > 3 && (originalRawStr.includes(dbKey) || dbKey.includes(originalRawStr))) {
        category = normalizedMappings[dbKey];
        mapped = true;
        break;
      }
    }

    if (!mapped && basePlateStr) {
      for (const dbKey of dbKeys) {
        if (dbKey.length > 3 && (basePlateStr.includes(dbKey) || dbKey.includes(basePlateStr))) {
          category = normalizedMappings[dbKey];
          mapped = true;
          break;
        }
      }
    }
  }

  if (!mapped) {
    const tempCategory = data.vehicleType;
    if (tempCategory && typeof tempCategory === 'string') {
      const parts = tempCategory.split('-');
      let specificType = parts.length > 1 ? parts[1].toUpperCase() : parts[0].toUpperCase();
      if (parts.length > 2 && parts[2].toUpperCase() === 'LONG') {
        if (['CDE', 'CDD', 'FUSO'].includes(specificType)) {
          specificType = `${specificType}-LONG`;
        }
      }
      category = specificType;
    } else {
      category = tempCategory;
    }
  }

  if (category && typeof category === 'string') {
    category = category.toUpperCase();
  }

  return category || '';
}

export function buildTruckDetailSheet(wb, finalSheetData, headers, sheetNames) {
  const ws = XLSX.utils.aoa_to_sheet(finalSheetData);
  const range = XLSX.utils.decode_range(ws['!ref']);

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) continue;

      if (R === 0) {
        const headerName = finalSheetData[0][C];
        ws[cellRef].s = headers.truckDetailGreen.includes(headerName)
          ? reportStyles.greenHeaderStyle
          : reportStyles.defaultHeaderStyle;
      } else if (reportColumns.truckDetailCenterAligned.includes(C)) {
        ws[cellRef].s = reportStyles.centerStyle;
      }
    }
  }

  ws['!cols'] = headers.truckDetail.map((_, i) => ({
    wch:
      finalSheetData.reduce((max, row) => Math.max(max, row[i] ? String(row[i]).length : 0), 0) + 2,
  }));

  XLSX.utils.book_append_sheet(wb, ws, sheetNames.truckDetail);
}

export function buildDistanceSummarySheet(
  wb,
  dryKm,
  frozenKm,
  headers,
  sheetNames,
  decimalFormat = '0.00'
) {
  const dataStyle = { ...reportStyles.distanceDataStyle, z: decimalFormat };
  const ws = XLSX.utils.aoa_to_sheet([headers.distanceSummary, [dryKm, frozenKm]]);

  ws['A1'] = { v: headers.distanceSummary[0], t: 's', s: reportStyles.distanceHeaderStyle };
  ws['B1'] = { v: headers.distanceSummary[1], t: 's', s: reportStyles.distanceHeaderStyle };
  ws['A2'] = { v: dryKm, t: 'n', s: dataStyle };
  ws['B2'] = { v: frozenKm, t: 'n', s: dataStyle };
  ws['!cols'] = reportColumns.distanceSummary;

  XLSX.utils.book_append_sheet(wb, ws, sheetNames.distSummary);
}

export function buildTruckUsageSheet(wb, truckUsageCount, vehicleTypes, headers, sheetNames) {
  const masterNames = vehicleTypes.map((v) => (typeof v === 'string' ? v : v.name));

  const finalUsageData = [headers.truckUsage];

  // Master types — always included (even when 0), processed first
  masterNames.forEach((type) => {
    if (truckUsageCount[type]) {
      const dry = truckUsageCount[type]['Dry'];
      const frozen = truckUsageCount[type]['Frozen'];
      finalUsageData.push([type, dry > 0 ? dry : null, frozen > 0 ? frozen : null]);
      delete truckUsageCount[type]; // mark as processed to avoid duplication
    }
  });

  Object.keys(truckUsageCount).forEach((type) => {
    const dry = truckUsageCount[type]['Dry'];
    const frozen = truckUsageCount[type]['Frozen'];
    if (dry > 0 || frozen > 0) {
      finalUsageData.push([
        type === '' ? null : type,
        dry > 0 ? dry : null,
        frozen > 0 ? frozen : null,
      ]);
    }
  });

  const ws = XLSX.utils.aoa_to_sheet(finalUsageData);

  ws['A1'].s = reportStyles.distanceHeaderStyle;
  ws['B1'].s = reportStyles.distanceHeaderStyle;
  ws['C1'].s = reportStyles.distanceHeaderStyle;

  finalUsageData.forEach((_, R) => {
    if (R === 0) return;
    const row = R + 1;
    if (ws[`A${row}`]) ws[`A${row}`].s = reportStyles.usageDataLabelStyle;
    if (ws[`B${row}`]) ws[`B${row}`].s = reportStyles.usageDataNumStyle;
    if (ws[`C${row}`]) ws[`C${row}`].s = reportStyles.usageDataNumStyle;
  });

  ws['!cols'] = reportColumns.truckUsage;
  XLSX.utils.book_append_sheet(wb, ws, sheetNames.truckUsage);
}

