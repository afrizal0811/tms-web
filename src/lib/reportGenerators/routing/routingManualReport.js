'use client';

import { formatDateUniversal, formatMinutesToHHMM, getBasePlate } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import {
  buildDistanceSummarySheet,
  buildDriverMaps,
  buildNormalizedMappings,
  buildTruckDetailSheet,
  buildTruckUsageSheet,
  getRoutingHeaders,
  getRoutingSheetNames,
  resolveVehicleCategory,
  ultraNormalize,
} from './help';

function parseToNum(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const str = String(val).replace(/,/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function parseExcelFiles(fileBuffers, emailMap, platMap, translate) {
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

    const rawRows = XLSX.utils.sheet_to_json(wbInput.Sheets[summarySheetName], { header: 1 });

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
      const canonicalKey = ultraNormalize(rawAssignee || rawPlate) || `unknown-${Math.random()}`;

      const weightPct = idxWeight !== -1 ? parseToNum(row[idxWeight]) : 0;
      const volumePct = idxVolume !== -1 ? parseToNum(row[idxVolume]) : 0;
      const totalDistM = idxDist !== -1 ? parseToNum(row[idxDist]) : 0;
      const spentTimeMins = idxTime !== -1 ? parseToNum(row[idxTime]) : 0;

      let driverInfo = emailMap.get(rawAssignee);
      if (!driverInfo && rawPlate) driverInfo = platMap.get(ultraPlate);

      const cleanPlat = driverInfo?.plat ?? rawPlate;
      const driverName =
        driverInfo?.name ?? (idxAssignee !== -1 && row[idxAssignee] ? row[idxAssignee] : rawPlate);
      const storageType = driverInfo?.storage ?? 'DRY';
      const vehicleType = driverInfo?.type ?? null;

      if (!unifiedMap.has(canonicalKey)) {
        unifiedMap.set(canonicalKey, {
          plat: getBasePlate(cleanPlat),
          driver: driverName,
          weightPercentage: weightPct,
          volumePercentage: volumePct,
          totalDistance: totalDistM,
          shipDurationRaw: spentTimeMins,
          storage: storageType,
          vehicleType,
          originalPlateForMap: rawPlate,
        });
      } else {
        const existing = unifiedMap.get(canonicalKey);
        existing.weightPercentage = Math.max(existing.weightPercentage, weightPct);
        existing.volumePercentage = Math.max(existing.volumePercentage, volumePct);
        existing.totalDistance += totalDistM;
        existing.shipDurationRaw += spentTimeMins;
      }
    }
  }

  return unifiedMap;
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

  const { emailMap, platMap } = buildDriverMaps(driverData);
  const normalizedMappings = buildNormalizedMappings(mappingsObj);

  const validVehicleTypeNames = vehicleTypes.map((v) => String(v.name).toUpperCase());
  const truckUsageCount = {};
  validVehicleTypeNames.forEach((v) => {
    truckUsageCount[v] = { Dry: 0, Frozen: 0 };
  });

  const unifiedMap = parseExcelFiles(fileBuffers, emailMap, platMap, translate);

  let totalDryKm = 0;
  let totalFrozenKm = 0;
  const finalRows = [];

  unifiedMap.forEach((data, canonicalKey) => {
    finalRows.push(data);

    const distKm = data.totalDistance / 1000;
    if (data.storage === 'FROZEN') totalFrozenKm += distKm;
    else totalDryKm += distKm;

    // resolveVehicleCategory returns '' when nothing matches
    const category = resolveVehicleCategory(data, normalizedMappings);
    const catKey = category || '';

    if (!truckUsageCount[catKey]) {
      truckUsageCount[catKey] = { Dry: 0, Frozen: 0 };
    }
    if (data.storage === 'FROZEN') truckUsageCount[catKey]['Frozen'] += 1;
    else truckUsageCount[catKey]['Dry'] += 1;
  });

  const wb = XLSX.utils.book_new();

  finalRows.sort((a, b) => (a.driver || '').localeCompare(b.driver || ''));

  const finalSheetData = [
    headers.truckDetail,
    ...finalRows.map((row) => [
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

  buildTruckDetailSheet(wb, finalSheetData, headers, sheetNames);

  const formattedDryKm = Number(totalDryKm.toFixed(3));
  const formattedFrozenKm = Number(totalFrozenKm.toFixed(3));
  buildDistanceSummarySheet(wb, formattedDryKm, formattedFrozenKm, headers, sheetNames, '0.000');
  buildTruckUsageSheet(wb, { ...truckUsageCount }, vehicleTypes, headers, sheetNames);

  const formattedDate = formatDateUniversal(dateForFile, 'DD.MM.YYYY');
  const excelFileName = `${translate('excel.routing.filename_manual')} - ${formattedDate} - ${hubName}.xlsx`;

  return { wb, excelFileName };
}
