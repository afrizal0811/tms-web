'use client';

export const FAILED_STATUSES = ['PENDING', 'BATAL', 'TERIMA SEBAGIAN'];
export const PENDING_SHEET_STATUSES_BASE = ['PENDING', 'BATAL', 'TERIMA SEBAGIAN'];

export const reportStyles = {
  headerStyle: {
    font: { bold: true },
    alignment: { horizontal: 'center', vertical: 'center' },
  },
  centerStyle: {
    alignment: { horizontal: 'center', vertical: 'center' },
  },
  wrapTextStyle: {
    alignment: { wrapText: true, vertical: 'center', horizontal: 'left' },
  },
  leftAlignStyle: {
    alignment: { horizontal: 'left', vertical: 'center' },
  },
  blueFillStyle: { fill: { patternType: 'solid', fgColor: { rgb: 'BDE5F8' } } },
  yellowFillStyle: { fill: { patternType: 'solid', fgColor: { rgb: 'ffe19c' } } },
  greenFillStyle: { fill: { patternType: 'solid', fgColor: { rgb: 'C6EFCE' } } },
  greenHeaderStyle: {
    alignment: { horizontal: 'center', vertical: 'center' },
    font: { bold: true },
    fill: { patternType: 'solid', fgColor: { rgb: '84fa92' } },
  },
  hubRedStyle: {
    alignment: { horizontal: 'center', vertical: 'center' },
    font: { bold: true, color: { rgb: 'FF0000' } },
  },
  routingDateTitle: {
    font: { bold: true, sz: 24, color: { rgb: 'FF0000' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  },
  routingDateValue: {
    font: { bold: true, sz: 60 },
    alignment: { horizontal: 'center', vertical: 'center' },
  },
  separatorStyle: {
    fill: { patternType: 'solid', fgColor: { rgb: 'FA9D9D' } },
  },
  colFillMapRoVsReal: {
    5: { header: 'A7F3D0', data: 'D1FAE5' },
    6: { header: 'A7F3D0', data: 'D1FAE5' },
    7: { header: 'FED7AA', data: 'FFEDD5' },
    8: { header: 'FED7AA', data: 'FFEDD5' },
    9: { header: 'FDE68A', data: 'FEF9C3' },
    10: { header: 'FDE68A', data: 'FEF9C3' },
    11: { header: 'FBCFE8', data: 'FCE7F3' },
    12: { header: 'FBCFE8', data: 'FCE7F3' },
    13: { header: 'BFDBFE', data: 'DBEAFE' },
    14: { header: 'BFDBFE', data: 'DBEAFE' },
  },
};

export const getDeliveryHeaders = (translate, hasPendingGR) => {
  const pendingHeaders = [
    translate('common.flow'),
    translate('common.so_number'),
    translate('common.date'),
    translate('common.license_number'),
    translate('common.driver'),
    translate('common.status.cancel'),
    translate('common.status.partial'),
    translate('common.status.pending'),
  ];

  if (hasPendingGR) pendingHeaders.push(translate('common.status.pending_gr'));

  pendingHeaders.push(
    translate('excel.delivery.headers.reason'),
    '',
    translate('common.open_time'),
    translate('common.close_time'),
    translate('common.eta'),
    translate('common.etd'),
    translate('common.actual_arrival'),
    translate('common.actual_departure'),
    translate('common.visit_plan'),
    translate('common.visit_actual'),
    translate('common.customer_id'),
    translate('common.ro_seq'),
    translate('common.actual_seq'),
    translate('common.storage_type')
  );

  return {
    totalDelivered: [
      translate('common.license_number'),
      translate('common.driver'),
      translate('excel.delivery.headers.total_outlet'),
      translate('excel.delivery.headers.total_delivery'),
      translate('excel.delivery.headers.info_manual'),
      translate('excel.delivery.headers.info_diff_day'),
    ],
    pendingSO: pendingHeaders,
    updateLonglat: [
      translate('common.customer_name'),
      translate('common.customer_id'),
      translate('common.location_id'),
      translate('excel.delivery.headers.new_longlat'),
      translate('excel.delivery.headers.dist_diff'),
    ],
    roVsReal: [
      translate('common.flow'),
      translate('common.license_number'),
      translate('common.driver'),
      translate('common.customer_name'),
      translate('excel.delivery.headers.status_del'),
      translate('common.open_time'),
      translate('common.close_time'),
      translate('common.eta'),
      translate('common.actual_arrival'),
      translate('common.etd'),
      translate('common.actual_departure'),
      translate('common.visit_plan'),
      translate('common.visit_actual'),
      translate('common.ro_seq'),
      translate('common.actual_seq'),
      translate('excel.delivery.headers.is_match'),
      translate('dashboard.tab.routingreal.is_within_hours'),
    ],
  };
};

export const getDeliverySheetNames = (translate) => ({
  routingDate: translate('common.routing_date'),
  totalDelivered: translate('excel.delivery.sheets.total_delivered'),
  pendingSO: translate('excel.delivery.sheets.pending_so'),
  updateLonglat: translate('excel.delivery.sheets.update_longlat'),
  roVsReal: translate('excel.delivery.sheets.ro_vs_real'),
});

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
    translate('common.routing_name'),
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