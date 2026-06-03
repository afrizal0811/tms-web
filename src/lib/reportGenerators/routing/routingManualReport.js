'use client';

import { formatDateUniversal, formatMinutesToHHMM, getBasePlate } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import { getRoutingHeaders, getRoutingSheetNames, reportColumns, reportStyles } from './help';

function parseToNum(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const str = String(val).replace(/,/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function ultraNormalize(str) {
  if (!str) return '';
  return String(str)
    .replace(/[\s\-'"]/g, '')
    .toLowerCase();
}

function getMajority(arr) {
  if (!arr || arr.length === 0) return null;
  const counts = {};
  let max = 0;
  let res = arr[0];
  for (const val of arr) {
    counts[val] = (counts[val] || 0) + 1;
    if (counts[val] > max) {
      max = counts[val];
      res = val;
    }
  }
  return res;
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
        platMap.set(ultraNormalize(driver.plat), {
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
        normalizedMappings[ultraNormalize(key)] = mappingsObj[key];
      }
    });
  }

  const unifiedMap = new Map();
  const allCreatedDates = [];

  for (const fileBuffer of fileBuffers) {
    const wbInput = XLSX.read(fileBuffer, { type: 'array' });
    const summarySheetName = wbInput.SheetNames.find((s) => s.toLowerCase().includes('summary'));
    const othersSheetName = wbInput.SheetNames.find((s) => s.toLowerCase() === 'others');

    if (othersSheetName) {
      const rawOthers = XLSX.utils.sheet_to_json(wbInput.Sheets[othersSheetName], { header: 1 });
      let headIdx = -1;
      for (let i = 0; i < rawOthers.length; i++) {
        if (Array.isArray(rawOthers[i])) {
          const isHead = rawOthers[i].some(
            (cell) => String(cell).toLowerCase().trim() === 'created date'
          );
          if (isHead) {
            headIdx = i;
            break;
          }
        }
      }
      if (headIdx !== -1) {
        const headRow = rawOthers[headIdx].map((h) => String(h).toLowerCase().trim());
        const createdIdx = headRow.indexOf('created date');
        for (let i = headIdx + 1; i < rawOthers.length; i++) {
          if (rawOthers[i] && rawOthers[i][createdIdx]) {
            let dStr = String(rawOthers[i][createdIdx]).trim();
            dStr = dStr.replace(/\//g, '.').split(' ')[0];
            allCreatedDates.push(dStr);
          }
        }
      }
    }

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

      const ultraPlate = ultraNormalize(rawPlate);
      const canonicalPlate = ultraNormalize(rawAssignee || rawPlate) || `unknown-${Math.random()}`;

      const weightPct = idxWeight !== -1 ? parseToNum(row[idxWeight]) : 0;
      const volumePct = idxVolume !== -1 ? parseToNum(row[idxVolume]) : 0;
      const totalDistM = idxDist !== -1 ? parseToNum(row[idxDist]) : 0;
      const spentTimeMins = idxTime !== -1 ? parseToNum(row[idxTime]) : 0;

      let driverInfo = emailMap.get(rawAssignee);
      if (!driverInfo && rawPlate) {
        driverInfo = platMap.get(ultraPlate);
      }

      const cleanPlat = driverInfo && driverInfo.plat ? driverInfo.plat : rawPlate;
      const driverName = driverInfo
        ? driverInfo.name
        : idxAssignee !== -1 && row[idxAssignee]
          ? row[idxAssignee]
          : rawPlate;
      const storageType = driverInfo ? driverInfo.storage : 'DRY';
      const vehicleType = driverInfo ? driverInfo.type : null;

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
          originalPlateForMap: rawPlate,
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
  const validVehicleTypeNames = vehicleTypes.map((v) => String(v.name).toUpperCase());

  validVehicleTypeNames.forEach((v) => {
    truckUsageCount[v] = { Dry: 0, Frozen: 0 };
  });

  const finalRows = [];

  unifiedMap.forEach((data, canonicalKey) => {
    finalRows.push(data);

    const distKm = data.totalDistance / 1000;
    if (data.storage === 'FROZEN') {
      totalFrozenKm += distKm;
    } else {
      totalDryKm += distKm;
    }

    let category = '';
    const originalRawStr = ultraNormalize(data.originalPlateForMap || canonicalKey);
    const basePlateStr = ultraNormalize(data.plat);
    const dbKeys = Object.keys(normalizedMappings);

    let mapped = false;
    if (basePlateStr && normalizedMappings[basePlateStr]) {
      category = normalizedMappings[basePlateStr];
      mapped = true;
    } else if (originalRawStr && normalizedMappings[originalRawStr]) {
      category = normalizedMappings[originalRawStr];
      mapped = true;
    } else {
      for (const dbKey of dbKeys) {
        if (
          dbKey.length > 3 &&
          (originalRawStr.includes(dbKey) || dbKey.includes(originalRawStr))
        ) {
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
      } else {
        category = tempCategory;
      }
    }

    if (category && typeof category === 'string') {
      category = category.toUpperCase();
    }

    const catKey = category || '';

    if (!truckUsageCount[catKey]) {
      truckUsageCount[catKey] = { Dry: 0, Frozen: 0 };
    }

    if (data.storage === 'FROZEN') {
      truckUsageCount[catKey]['Frozen'] += 1;
    } else {
      truckUsageCount[catKey]['Dry'] += 1;
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
      row.totalDistance > 0 ? Number(row.totalDistance) : null,
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

  const formattedDryKm = Number(totalDryKm.toFixed(3));
  const formattedFrozenKm = Number(totalFrozenKm.toFixed(3));

  const distanceSummaryData = [headers.distanceSummary, [formattedDryKm, formattedFrozenKm]];

  const wsDistanceSummary = XLSX.utils.aoa_to_sheet(distanceSummaryData);
  const distanceDataStyleWithDecimals = { ...reportStyles.distanceDataStyle, z: '0.000' };

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
  wsDistanceSummary['A2'] = { v: formattedDryKm, t: 'n', s: distanceDataStyleWithDecimals };
  wsDistanceSummary['B2'] = { v: formattedFrozenKm, t: 'n', s: distanceDataStyleWithDecimals };

  wsDistanceSummary['!cols'] = reportColumns.distanceSummary;
  XLSX.utils.book_append_sheet(wb, wsDistanceSummary, sheetNames.distSummary);

  const finalUsageData = [headers.truckUsage];

  validVehicleTypeNames.forEach((type) => {
    if (truckUsageCount[type]) {
      const dryCount = truckUsageCount[type]['Dry'];
      const frozenCount = truckUsageCount[type]['Frozen'];

      finalUsageData.push([
        type,
        dryCount > 0 ? dryCount : null,
        frozenCount > 0 ? frozenCount : null,
      ]);

      delete truckUsageCount[type];
    }
  });

  Object.keys(truckUsageCount).forEach((type) => {
    const dryCount = truckUsageCount[type]['Dry'];
    const frozenCount = truckUsageCount[type]['Frozen'];
    if (dryCount > 0 || frozenCount > 0) {
      finalUsageData.push([
        type === '' ? null : type,
        dryCount > 0 ? dryCount : null,
        frozenCount > 0 ? frozenCount : null,
      ]);
    }
  });

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

  const majorityCreatedDate = getMajority(allCreatedDates);
  const formattedDate = majorityCreatedDate || formatDateUniversal(dateForFile, 'DD.MM.YYYY');
  const excelFileName = `${translate('excel.routing.filename_manual') || 'Routing Report Manual'} - ${formattedDate} - ${hubName}.xlsx`;

  return { wb, excelFileName };
}
