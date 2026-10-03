'use client';

export const FAILED_STATUSES = ['PENDING', 'BATAL', 'TERIMA SEBAGIAN'];
export const PENDING_SHEET_STATUSES_BASE = [...FAILED_STATUSES];

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

export function buildDriverMaps(driverData) {
  const emailMap = new Map();
  if (!Array.isArray(driverData)) return { emailMap };
  driverData.forEach((driver) => {
    const typeVal = driver.type;
    const storage = driver.storage.toUpperCase();
    const entry = { name: driver.name, plat: driver.basePlat, storage, type: typeVal };

    if (driver.email) emailMap.set(driver.email.trim().toLowerCase(), entry);
  });

  return { emailMap };
}

export function buildTruckUsageSheet(wb, truckUsageCount, vehicleTypes, headers, sheetNames) {
  const masterNames = vehicleTypes.map((v) => (typeof v === 'string' ? v : v.name));
  const finalUsageData = [headers.truckUsage];

  masterNames.forEach((type) => {
    if (truckUsageCount[type]) {
      const dry = truckUsageCount[type]['Dry'];
      const frozen = truckUsageCount[type]['Frozen'];
      finalUsageData.push([type, dry > 0 ? dry : null, frozen > 0 ? frozen : null]);
      delete truckUsageCount[type];
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
