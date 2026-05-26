'use client';

import { formatDateUniversal, formatMinutesToHHMM, getBasePlate } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import {
  getRoutingHeaders,
  getRoutingSheetNames,
  reportColumns,
  reportStyles,
} from './routingConfig';

function parseToNum(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const str = String(val).replace(/,/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

export async function generateManualRoutingWorkbook(
  fileBuffers,
  driverData,
  mappingsObj,
  dateForFile,
  hubName,
  t,
  vehicleTypes
) {
  const translate = t || ((key) => key);
  const headers = getRoutingHeaders(translate);
  const sheetNames = getRoutingSheetNames(translate);

  const emailMap = new Map();
  const platMap = new Map();

  if (Array.isArray(driverData)) {
    driverData.forEach((driver) => {
      let typeVal = driver.type;
      if (!typeVal && driver.tags) {
        try {
          const parsed = JSON.parse(driver.tags);
          if (Array.isArray(parsed) && parsed.length > 0) typeVal = parsed[0];
        } catch (e) {
          typeVal = driver.tags;
        }
      }

      const storage = (driver.storage || 'DRY').toUpperCase();

      if (driver.email) {
        emailMap.set(driver.email.trim().toLowerCase(), {
          name: driver.name,
          plat: driver.plat,
          storage: storage,
          type: typeVal,
        });
      }
      if (driver.plat) {
        platMap.set(driver.plat.replace(/\s+/g, '').toLowerCase(), {
          name: driver.name,
          plat: driver.plat,
          storage: storage,
          type: typeVal,
        });
      }
    });
  }

  const normalizedMappings = {};
  if (mappingsObj) {
    Object.keys(mappingsObj).forEach((key) => {
      if (key) {
        normalizedMappings[String(key).replace(/\s+/g, '').toLowerCase()] = mappingsObj[key];
      }
    });
  }

  const unifiedMap = new Map();

  for (const fileBuffer of fileBuffers) {
    const wbInput = XLSX.read(fileBuffer, { type: 'array' });
    const summarySheetName = wbInput.SheetNames.find((s) => s.toLowerCase().includes('summary'));

    if (!summarySheetName) {
      throw new Error(
        translate('report.toast.error_no_summary_sheet') ||
          "Sheet 'Summary' tidak ditemukan pada salah satu file excel."
      );
    }

    const summarySheet = wbInput.Sheets[summarySheetName];
    const rawRows = XLSX.utils.sheet_to_json(summarySheet, { header: 1 });

    let headerRowIdx = -1;
    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (Array.isArray(row)) {
        const isHeader = row.some((cell) => {
          if (typeof cell !== 'string') return false;
          const lower = cell.toLowerCase();
          return (
            lower.includes('vehicle id') ||
            lower.includes('vehicle name') ||
            lower.includes('assignee')
          );
        });
        if (isHeader) {
          headerRowIdx = i;
          break;
        }
      }
    }

    if (headerRowIdx === -1) continue;

    const excelHeaders = rawRows[headerRowIdx].map((h) =>
      typeof h === 'string' ? h.toLowerCase().trim() : ''
    );
    const idxVehicleName = excelHeaders.findIndex(
      (h) => h.includes('vehicle name') || h.includes('vehicle id')
    );
    const idxAssignee = excelHeaders.findIndex((h) => h.includes('assignee'));
    const idxWeight = excelHeaders.findIndex((h) => h.includes('weight percentage'));
    const idxVolume = excelHeaders.findIndex((h) => h.includes('volume percentage'));
    const idxDist = excelHeaders.findIndex((h) => h.includes('total distance (m)'));
    const idxTime = excelHeaders.findIndex((h) => h.includes('total spent time (mins)'));

    for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || row.length === 0) continue;

      const rawPlate =
        idxVehicleName !== -1 && row[idxVehicleName] ? String(row[idxVehicleName]) : '';
      const rawAssignee =
        idxAssignee !== -1 && row[idxAssignee] ? String(row[idxAssignee]).trim().toLowerCase() : '';

      if (!rawPlate && !rawAssignee) continue;

      const canonicalPlate =
        rawPlate.replace(/\s+/g, '').toLowerCase() || `unknown-${Math.random()}`;

      // Ubah value ke number dengan fungsi bantu agar lebih aman
      const weightPct = idxWeight !== -1 ? parseToNum(row[idxWeight]) : 0;
      const volumePct = idxVolume !== -1 ? parseToNum(row[idxVolume]) : 0;
      const totalDistM = idxDist !== -1 ? parseToNum(row[idxDist]) : 0;
      const spentTimeMins = idxTime !== -1 ? parseToNum(row[idxTime]) : 0;

      let driverInfo = emailMap.get(rawAssignee);
      if (!driverInfo && rawPlate) {
        driverInfo = platMap.get(canonicalPlate);
      }

      const cleanPlat = driverInfo && driverInfo.plat ? driverInfo.plat : rawPlate;
      const driverName = driverInfo
        ? driverInfo.name
        : idxAssignee !== -1 && row[idxAssignee]
          ? row[idxAssignee]
          : rawPlate;
      const storageType = driverInfo ? driverInfo.storage : 'DRY';
      const vehicleType = driverInfo ? driverInfo.type : 'UNKNOWN';

      if (!unifiedMap.has(canonicalPlate)) {
        unifiedMap.set(canonicalPlate, {
          plat: getBasePlate(cleanPlat),
          driver: driverName,
          weightPercentage: weightPct,
          volumePercentage: volumePct,
          totalDistance: totalDistM,
          shipDurationRaw: spentTimeMins,
          storage: storageType,
          vehicleType: vehicleType,
          originalPlateForMap: rawPlate, // Simpan untuk referensi mapping
        });
      } else {
        const existing = unifiedMap.get(canonicalPlate);
        existing.weightPercentage = Math.max(existing.weightPercentage, weightPct);
        existing.volumePercentage = Math.max(existing.volumePercentage, volumePct);
        existing.totalDistance += totalDistM;
        existing.shipDurationRaw += spentTimeMins;
      }
    }
  }

  let totalDryKm = 0;
  let totalFrozenKm = 0;
  const truckUsageCount = {};

  vehicleTypes.forEach((v) => {
    truckUsageCount[v.name] = { Dry: 0, Frozen: 0 };
  });

  const validVehicleTypeNames = vehicleTypes.map((v) => String(v.name).toUpperCase());
  const finalRows = [];

  unifiedMap.forEach((data, canonicalPlate) => {
    finalRows.push(data);

    // Jangan dikonversi untuk Sheet Truck Detail, konversi ke KM hanya untuk Summary
    const distKm = data.totalDistance / 1000;
    if (data.storage === 'FROZEN') {
      totalFrozenKm += distKm;
    } else {
      totalDryKm += distKm;
    }

    let category = '';
    const basePlateStr = data.plat ? String(data.plat).replace(/\s+/g, '').toLowerCase() : '';
    const originalRawStr = data.originalPlateForMap
      ? String(data.originalPlateForMap).replace(/\s+/g, '').toLowerCase()
      : canonicalPlate;

    // Mapping perbaikan: Gunakan getBasePlate terlebih dahulu, lalu Fallback
    if (basePlateStr && normalizedMappings[basePlateStr]) {
      category = String(normalizedMappings[basePlateStr]).toUpperCase();
    } else if (normalizedMappings[originalRawStr]) {
      category = String(normalizedMappings[originalRawStr]).toUpperCase();
    } else {
      let tempCategory = data.vehicleType;
      if (tempCategory && typeof tempCategory === 'string') {
        const parts = tempCategory.split('-');
        let specificType = parts.length > 1 ? parts[1].toUpperCase() : parts[0].toUpperCase();
        if (parts.length > 2 && parts[2].toUpperCase() === 'LONG') {
          if (['CDE', 'CDD', 'FUSO'].includes(specificType)) {
            specificType = `${specificType}-LONG`;
          }
        }
        category = specificType;
      }
    }

    category = category ? category.toUpperCase() : 'UNKNOWN';

    // Cek agar nilai tidak sesuai standar seperti DIKICI/AANG dikembalikan ke UNKNOWN jika tidak ada kecocokan
    if (!validVehicleTypeNames.includes(category)) {
      const matchedValid = validVehicleTypeNames.find((v) => category.includes(v));
      category = matchedValid || 'UNKNOWN';
    }

    if (category !== 'UNKNOWN') {
      if (!truckUsageCount[category]) {
        truckUsageCount[category] = { Dry: 0, Frozen: 0 };
      }
      if (data.storage === 'FROZEN') {
        truckUsageCount[category]['Frozen'] += 1;
      } else {
        truckUsageCount[category]['Dry'] += 1;
      }
    }
  });

  const wb = XLSX.utils.book_new();

  const excelDataRows = finalRows.sort((a, b) => (a.driver || '').localeCompare(b.driver || ''));

  const finalSheetData1 = [
    headers.truckDetail,
    ...excelDataRows.map((row) => [
      row.plat,
      row.driver,
      row.weightPercentage > 0 ? `${parseFloat(row.weightPercentage).toFixed(1)}%` : null,
      row.volumePercentage > 0 ? `${parseFloat(row.volumePercentage).toFixed(1)}%` : null,
      row.totalDistance > 0 ? Number(row.totalDistance) : null, // Pastikan number tanpa konversi KM
      null,
      null,
      formatMinutesToHHMM(row.shipDurationRaw),
      null,
      null,
    ]),
  ];

  const wsTruckDetail = XLSX.utils.aoa_to_sheet(finalSheetData1);
  const range1 = XLSX.utils.decode_range(wsTruckDetail['!ref']);

  for (let R = range1.s.r; R <= range1.e.r; ++R) {
    for (let C = range1.s.c; C <= range1.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!wsTruckDetail[cellRef]) continue;

      if (R === 0) {
        const headerName = finalSheetData1[0][C];
        wsTruckDetail[cellRef].s = headers.truckDetailGreen.includes(headerName)
          ? reportStyles.greenHeaderStyle
          : reportStyles.defaultHeaderStyle;
      } else if (reportColumns.truckDetailCenterAligned.includes(C)) {
        wsTruckDetail[cellRef].s = reportStyles.centerStyle;
      }
    }
  }

  wsTruckDetail['!cols'] = headers.truckDetail.map((_, i) => ({
    wch:
      finalSheetData1.reduce((max, row) => Math.max(max, row[i] ? String(row[i]).length : 0), 0) +
      2,
  }));
  XLSX.utils.book_append_sheet(wb, wsTruckDetail, sheetNames.truckDetail);

  const distanceSummaryData = [headers.distanceSummary, [totalDryKm, totalFrozenKm]];

  const wsDistanceSummary = XLSX.utils.aoa_to_sheet(distanceSummaryData);

  // Tambahkan 3 angka dibelakang koma pada format style 'z'
  const distanceDataStyleWithDecimals = {
    ...reportStyles.distanceDataStyle,
    z: '0.000',
  };

  wsDistanceSummary['A1'] = {
    v: headers.distanceSummary[0],
    t: 's',
    s: reportStyles.distanceHeaderStyle,
  };
  wsDistanceSummary['B1'] = {
    v: headers.distanceSummary[1],
    t: 's',
    s: reportStyles.distanceHeaderStyle,
  };
  wsDistanceSummary['A2'] = { v: totalDryKm, t: 'n', s: distanceDataStyleWithDecimals };
  wsDistanceSummary['B2'] = { v: totalFrozenKm, t: 'n', s: distanceDataStyleWithDecimals };

  wsDistanceSummary['!cols'] = reportColumns.distanceSummary;
  XLSX.utils.book_append_sheet(wb, wsDistanceSummary, sheetNames.distSummary);

  const dynamicTypes = Object.keys(truckUsageCount).filter(
    (t) => !vehicleTypes.some((vt) => vt.name === t)
  );
  const allTypes = [...vehicleTypes.map((v) => v.name), ...dynamicTypes];

  const usageDataRows = allTypes.map((type) => {
    const dryCount = truckUsageCount[type]['Dry'];
    const frozenCount = truckUsageCount[type]['Frozen'];
    return [type, dryCount > 0 ? dryCount : null, frozenCount > 0 ? frozenCount : null];
  });

  const finalUsageData = [headers.truckUsage, ...usageDataRows];
  const wsTruckUsage = XLSX.utils.aoa_to_sheet(finalUsageData);

  wsTruckUsage['A1'].s = reportStyles.distanceHeaderStyle;
  wsTruckUsage['B1'].s = reportStyles.distanceHeaderStyle;
  wsTruckUsage['C1'].s = reportStyles.distanceHeaderStyle;

  finalUsageData.forEach((row, R) => {
    if (R === 0) return;
    const aRef = `A${R + 1}`;
    const bRef = `B${R + 1}`;
    const cRef = `C${R + 1}`;

    if (wsTruckUsage[aRef]) wsTruckUsage[aRef].s = reportStyles.usageDataLabelStyle;
    if (wsTruckUsage[bRef]) wsTruckUsage[bRef].s = reportStyles.usageDataNumStyle;
    if (wsTruckUsage[cRef]) wsTruckUsage[cRef].s = reportStyles.usageDataNumStyle;
  });

  wsTruckUsage['!cols'] = reportColumns.truckUsage;
  XLSX.utils.book_append_sheet(wb, wsTruckUsage, sheetNames.truckUsage);

  const formattedDate = formatDateUniversal(dateForFile, 'DD.MM.YYYY');
  const excelFileName = `${translate('excel.routing.filename')} - ${formattedDate} - ${hubName}.xlsx`;

  return { wb, excelFileName };
}
