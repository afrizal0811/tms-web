// File: src/lib/reportGenerators/rangkumanSheets/truckUsageSheet.js
import { TAG_MAP_KEY, VEHICLE_TYPES } from '@/lib/constants';
import { formatDate } from '@/lib/utils';
import { getMasterTruckData } from '@/lib/masterTruckHelper';
import * as XLSX from 'xlsx-js-style';
import {
  COLORS,
  BORDERS,
  BASE_STYLES,
  HEADER_STYLES,
  FILL_STYLES,
  FONT_STYLES,
} from './reportStyles';

// ... (Helper Functions: formatMonthName, getDeliveryDateFromRouting, getVehicleType TETAP SAMA, TIDAK PERLU DIUBAH) ...
function formatMonthName(dateObj) {
  return dateObj.toLocaleDateString('en-GB', { month: 'long' });
}
function getDeliveryDateFromRouting(isoString) {
  /* ...kode lama... */ if (!isoString) return null;
  try {
    const date = new Date(isoString);
    const wibTimestamp = date.getTime() + 7 * 60 * 60 * 1000;
    const dateWIB = new Date(wibTimestamp);
    const routingDay = dateWIB.getUTCDay();
    let offsetDays = 1;
    if (routingDay === 6) offsetDays = 2;
    const deliveryTimestamp = wibTimestamp + offsetDays * 24 * 60 * 60 * 1000;
    return new Date(deliveryTimestamp).toISOString().split('T')[0];
  } catch (e) {
    return null;
  }
}
function getVehicleType(firstTag, vehiclePlate, hubId, tagMap) {
  /* ...kode lama... */ if (!firstTag) return 'Lainnya';
  const parts = firstTag.split('-');
  if (parts.length < 2) return 'Lainnya';
  let specificType = parts[1].toUpperCase();
  if (parts.length > 2 && parts[2].toUpperCase() === 'LONG') {
    if (['CDE', 'CDD', 'FUSO'].includes(specificType)) {
      specificType = `${specificType}-LONG`;
    }
  }
  if (VEHICLE_TYPES.includes(specificType)) return specificType;
  if (tagMap && hubId && vehiclePlate) {
    const hubMap = tagMap[hubId];
    if (hubMap && hubMap[vehiclePlate]) {
      const mappedValue = hubMap[vehiclePlate][specificType];
      if (mappedValue) return mappedValue;
    }
  }
  return specificType;
}

// ... (Fungsi calculateTruckUsageData TETAP SAMA, TIDAK PERLU DIUBAH) ...
export function calculateTruckUsageData(resultsData, startDateStr, endDateStr, hubId) {
  /* ...kode lama... */ let tagMap = {};
  if (typeof window !== 'undefined') {
    try {
      const storedMap = localStorage.getItem(TAG_MAP_KEY);
      if (storedMap) tagMap = JSON.parse(storedMap);
    } catch (e) {
      console.error(e);
    }
  }
  const hubMasterData = getMasterTruckData() || { Dry: { Total: 0 }, Frozen: { Total: 0 } };
  const dateMap = {};
  const dateKeys = [];
  const currentIterDate = new Date(startDateStr);
  const endDateObj = new Date(endDateStr);
  while (currentIterDate <= endDateObj) {
    const dateStr = formatDate(currentIterDate);
    const dayNum = currentIterDate.getDate();
    const isSunday = currentIterDate.getDay() === 0;
    dateKeys.push({ str: dateStr, day: dayNum, isSunday });
    dateMap[dateStr] = { Dry: {}, Frozen: {}, DryTotal: 0, FrozenTotal: 0, OTV: 0 };
    VEHICLE_TYPES.forEach((type) => {
      dateMap[dateStr].Dry[type] = 0;
      dateMap[dateStr].Frozen[type] = 0;
    });
    currentIterDate.setDate(currentIterDate.getDate() + 1);
  }
  if (resultsData && Array.isArray(resultsData)) {
    resultsData.forEach((dispatch) => {
      const isDone = dispatch.dispatchStatus && dispatch.dispatchStatus.toLowerCase() === 'done';
      const hasResult = dispatch.result && Array.isArray(dispatch.result.routing);
      if (isDone && hasResult) {
        const dateKey = getDeliveryDateFromRouting(dispatch.createdTime);
        if (dateKey && dateMap[dateKey]) {
          const processedVehicles = new Set();
          dispatch.result.routing.forEach((route) => {
            const vehicleId = route.vehicleId || route.vehicleName;
            if (processedVehicles.has(vehicleId)) return;
            processedVehicles.add(vehicleId);
            if (route.trips && route.trips.length > 0) {
              const tags = route.vehicleTags || [];
              const vehiclePlate = route.vehicleName;
              const isFrozen = tags.some(
                (t) => typeof t === 'string' && t.toUpperCase().includes('FROZEN')
              );
              const storage = isFrozen ? 'Frozen' : 'Dry';
              const firstTag = tags.length > 0 ? String(tags[0]) : '';
              const type = getVehicleType(firstTag, vehiclePlate, hubId, tagMap);
              if (dateMap[dateKey][storage][type] !== undefined) {
                dateMap[dateKey][storage][type]++;
                dateMap[dateKey][`${storage}Total`]++;
                dateMap[dateKey].OTV++;
              }
            }
          });
        }
      }
    });
  }
  return { dateMap, dateKeys, vehicleTypes: VEHICLE_TYPES, hubMasterData };
}

export function generateTruckUsageSheet(wb, resultsData, startDateStr, endDateStr, hubId) {
  const { dateMap, dateKeys, vehicleTypes, hubMasterData } = calculateTruckUsageData(
    resultsData,
    startDateStr,
    endDateStr,
    hubId
  );

  // Indeks Baris (Tetap Sama)
  const headerRowsCount = 2;
  const startDry = headerRowsCount;
  const dryTypesCount = vehicleTypes.length;
  const dryInterbranchRow = startDry + dryTypesCount;
  const dryTotalRow = dryInterbranchRow + 1;
  const frozenStartRow = dryTotalRow + 1;
  const frozenTypesCount = vehicleTypes.length;
  const frozenInterbranchRow = frozenStartRow + frozenTypesCount;
  const frozenTotalRow = frozenInterbranchRow + 1;
  const otvRow = frozenTotalRow + 1;

  // --- BUILD EXCEL DATA ---
  const monthName = formatMonthName(new Date(startDateStr));
  const row1 = [monthName, 'Date', 'Total'];
  const row2 = ['Vehicle Storage', 'Vehicle Types', ''];

  dateKeys.forEach((d) => {
    row1.push(d.day, '', '');
    row2.push('TMS', 'Non TMS', 'TVU');
  });
  const excelData = [row1, row2];

  // Logic Data & Master Total (Tetap Sama)
  const masterTotalsByRow = {};
  const createRow = (label1, label2, category, rowIdx) => {
    const row = [label1, label2];
    let totalVal = null;
    if (category === 'Dry') totalVal = hubMasterData?.Dry?.[label2];
    else if (category === 'Frozen') totalVal = hubMasterData?.Frozen?.[label2];
    else if (category === 'DryTotal') totalVal = hubMasterData?.Dry?.Total;
    else if (category === 'FrozenTotal') totalVal = hubMasterData?.Frozen?.Total;
    else if (category === 'OTV')
      totalVal = (hubMasterData?.Dry?.Total || 0) + (hubMasterData?.Frozen?.Total || 0);

    masterTotalsByRow[rowIdx] = totalVal || 0;
    row.push(totalVal || null);

    dateKeys.forEach((d) => {
      let val = null;
      if (category === 'Dry' || category === 'Frozen') val = dateMap[d.str][category][label2];
      else if (category === 'DryTotal') val = dateMap[d.str].DryTotal;
      else if (category === 'FrozenTotal') val = dateMap[d.str].FrozenTotal;
      else if (category === 'OTV') val = dateMap[d.str].OTV;

      row.push(val === 0 ? null : val);
      row.push(null);
      row.push(null);
    });
    return row;
  };

  // Generate Rows (Tetap Sama)
  let currentRowIdx = 2;
  vehicleTypes.forEach((type, idx) => {
    excelData.push(createRow(idx === 0 ? 'Dry' : '', type, 'Dry', currentRowIdx++));
  });
  excelData.push(createRow('Interbranch', '', 'Dry', currentRowIdx++));
  excelData.push(createRow('Total Used', '', 'DryTotal', currentRowIdx++));
  vehicleTypes.forEach((type, idx) => {
    excelData.push(createRow(idx === 0 ? 'Frozen' : '', type, 'Frozen', currentRowIdx++));
  });
  excelData.push(createRow('Interbranch', '', 'Frozen', currentRowIdx++));
  excelData.push(createRow('Total Used', '', 'FrozenTotal', currentRowIdx++));
  excelData.push(createRow('OTV', '', 'OTV', currentRowIdx++));

  const ws = XLSX.utils.aoa_to_sheet(excelData);

  // Merges & Freeze (Tetap Sama)
  const merges = [];
  let colIdx = 3;
  dateKeys.forEach(() => {
    merges.push({ s: { r: 0, c: colIdx }, e: { r: 0, c: colIdx + 2 } });
    colIdx += 3;
  });
  merges.push({ s: { r: 0, c: 2 }, e: { r: 1, c: 2 } });
  merges.push({ s: { r: startDry, c: 0 }, e: { r: dryInterbranchRow - 1, c: 0 } });
  merges.push({ s: { r: frozenStartRow, c: 0 }, e: { r: frozenInterbranchRow - 1, c: 0 } });
  merges.push({ s: { r: dryInterbranchRow, c: 0 }, e: { r: dryInterbranchRow, c: 1 } });
  merges.push({ s: { r: dryTotalRow, c: 0 }, e: { r: dryTotalRow, c: 1 } });
  merges.push({ s: { r: frozenInterbranchRow, c: 0 }, e: { r: frozenInterbranchRow, c: 1 } });
  merges.push({ s: { r: frozenTotalRow, c: 0 }, e: { r: frozenTotalRow, c: 1 } });
  merges.push({ s: { r: otvRow, c: 0 }, e: { r: otvRow, c: 1 } });
  ws['!merges'] = merges;
  ws['!views'] = [{ state: 'frozen', xSplit: 3, ySplit: 2 }];

  // --- 6. STYLING (MENGGUNAKAN REPORTSTYLES) ---
  const range = XLSX.utils.decode_range(ws['!ref']);

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
      const cell = ws[cellRef];

      // A. HEADER
      if (R === 0 || R === 1) {
        cell.s = { ...HEADER_STYLES.main }; // Pakai Style Terpusat

        // Border Override
        if (C === 3) cell.s.border.left = BORDERS.medium;
        if (C > 2 && (C - 3) % 3 === 2) cell.s.border.right = BORDERS.medium;
        if (C === 2) cell.s.border.right = BORDERS.medium;
      }
      // B. DATA
      else {
        // Tentukan Warna Dasar Baris dari PRESETS
        let rowFill = null;
        if (R >= startDry && R <= dryInterbranchRow) rowFill = FILL_STYLES.dry;
        else if (R === dryTotalRow) rowFill = FILL_STYLES.dryTotal;
        else if (R >= frozenStartRow && R <= frozenInterbranchRow) rowFill = FILL_STYLES.frozen;
        else if (R === frozenTotalRow) rowFill = FILL_STYLES.frozenTotal;
        else if (R === otvRow) rowFill = FILL_STYLES.otv;

        if (C <= 1) {
          // Labels
          const isMergedRow = [
            dryInterbranchRow,
            dryTotalRow,
            frozenInterbranchRow,
            frozenTotalRow,
            otvRow,
          ].includes(R);

          if (isMergedRow && C === 0) cell.s = { ...BASE_STYLES.left };
          else if (C === 0) cell.s = { ...BASE_STYLES.center };
          else cell.s = { ...BASE_STYLES.left };

          if (rowFill) cell.s.fill = rowFill;
          cell.s.border = undefined;
        } else {
          // Data
          cell.s = { ...BASE_STYLES.center }; // Base

          if (C === 2) {
            // Col Total
            cell.s.border = { left: BORDERS.thin, right: BORDERS.medium };
            if (rowFill) cell.s.fill = rowFill;
            cell.s.font = FONT_STYLES.bold;
          } else {
            if (C === 3) cell.s.border = { left: BORDERS.medium };
            else cell.s.border = {}; // Reset borders

            if ((C - 3) % 3 === 2) cell.s.border.right = BORDERS.medium;

            let isSundayCol = false;
            let isTMSCol = false;
            if (C > 2) {
              const relativeIdx = (C - 3) % 3;
              if (relativeIdx === 0) isTMSCol = true;
              const dateIndex = Math.floor((C - 3) / 3);
              if (dateKeys[dateIndex] && dateKeys[dateIndex].isSunday) isSundayCol = true;
            }

            // Logic Alert
            let isOverLimit = false;
            const isTotalOrInterbranchRow = [
              dryInterbranchRow,
              dryTotalRow,
              frozenInterbranchRow,
              frozenTotalRow,
              otvRow,
            ].includes(R);

            if (isTMSCol && !isTotalOrInterbranchRow) {
              const tmsVal = cell.v || 0;
              const masterTotal = masterTotalsByRow[R] || 0;
              if (tmsVal > masterTotal) isOverLimit = true;
            }

            if (isOverLimit) {
              cell.s.fill = FILL_STYLES.alertRed;
              // Optional: cell.s.font = FONT_STYLES.whiteBold;
            } else if (isSundayCol) {
              cell.s.fill = FILL_STYLES.red;
            } else {
              if (rowFill) cell.s.fill = rowFill;
            }
          }
        }

        if (
          [dryInterbranchRow, dryTotalRow, frozenInterbranchRow, frozenTotalRow, otvRow].includes(R)
        ) {
          cell.s.font = FONT_STYLES.bold;
        }
      }
    }
  }

  const cols = [{ wch: 15 }, { wch: 25 }, { wch: 8 }];
  for (let i = 0; i < dateKeys.length * 3; i++) cols.push({ wch: 8 });
  ws['!cols'] = cols;

  XLSX.utils.book_append_sheet(wb, ws, 'Truck Usage');
}
