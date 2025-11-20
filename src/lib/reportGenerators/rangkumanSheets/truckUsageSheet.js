// File: src/lib/reportGenerators/rangkumanSheets/truckUsageSheet.js
import { TAG_MAP_KEY, VEHICLE_TYPES } from '@/lib/constants';
import { formatDate } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';

// --- HELPER FUNCTIONS ---
function formatMonthName(dateObj) {
  return dateObj.toLocaleDateString('en-GB', { month: 'long' });
}

function getDeliveryDateFromRouting(isoString) {
  if (!isoString) return null;
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
  if (!firstTag) return 'Lainnya';
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

/**
 * BAGIAN 1: LOGIKA PERHITUNGAN
 */
export function calculateTruckUsageData(resultsData, startDateStr, endDateStr, hubId) {
  let tagMap = {};
  if (typeof window !== 'undefined') {
    try {
      const storedMap = localStorage.getItem(TAG_MAP_KEY);
      if (storedMap) tagMap = JSON.parse(storedMap);
    } catch (e) {
      console.error(e);
    }
  }

  const dateMap = {};
  const dateKeys = [];
  const currentIterDate = new Date(startDateStr);
  const endDateObj = new Date(endDateStr);

  while (currentIterDate <= endDateObj) {
    const dateStr = formatDate(currentIterDate);
    const dayNum = currentIterDate.getDate();
    const isSunday = currentIterDate.getDay() === 0;

    dateKeys.push({ str: dateStr, day: dayNum, isSunday });

    dateMap[dateStr] = {
      Dry: {},
      Frozen: {},
      DryTotal: 0,
      FrozenTotal: 0,
      OTV: 0,
    };

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
  return { dateMap, dateKeys, vehicleTypes: VEHICLE_TYPES };
}

/**
 * BAGIAN 2: GENERATOR EXCEL (FIXED STYLING & MERGE)
 */
export function generateTruckUsageSheet(wb, resultsData, startDateStr, endDateStr, hubId) {
  const { dateMap, dateKeys, vehicleTypes } = calculateTruckUsageData(
    resultsData,
    startDateStr,
    endDateStr,
    hubId
  );

  // --- 1. DEFINISI INDEKS BARIS (Moved Up) ---
  const headerRowsCount = 2;
  const startDry = headerRowsCount;
  const dryTypesCount = vehicleTypes.length;
  const dryInterbranchRow = startDry + dryTypesCount; // Baris Interbranch
  const dryTotalRow = dryInterbranchRow + 1;
  const frozenStartRow = dryTotalRow + 1;
  const frozenTypesCount = vehicleTypes.length;
  const frozenInterbranchRow = frozenStartRow + frozenTypesCount; // Baris Interbranch
  const frozenTotalRow = frozenInterbranchRow + 1;
  const otvRow = frozenTotalRow + 1;

  // --- 2. STYLES ---
  const headerFill = { patternType: 'solid', fgColor: { rgb: 'D9D2E9' } };
  const dryFill = { patternType: 'solid', fgColor: { rgb: 'FAE2D5' } };
  const dryTotalFill = { patternType: 'solid', fgColor: { rgb: 'F9CB9C' } };
  const frozenFill = { patternType: 'solid', fgColor: { rgb: 'DBE9F7' } };
  const frozenTotalFill = { patternType: 'solid', fgColor: { rgb: 'C9DAF8' } };
  const otvFill = { patternType: 'solid', fgColor: { rgb: 'D9F2D0' } };
  const redFill = { patternType: 'solid', fgColor: { rgb: 'FFC7CE' } };

  // Borders
  const thin = { style: 'thin', color: { auto: 1 } };
  const medium = { style: 'medium', color: { auto: 1 } };

  // Base Style: NO CELL BORDERS by default - we'll selectively add vertical separators only
  const baseStyle = {
    alignment: { horizontal: 'center', vertical: 'center' },
    // no border here
  };

  // Left Align Style (Untuk Label) - no horizontal borders
  const leftStyle = {
    alignment: { horizontal: 'left', vertical: 'center', indent: 1 },
    // no border here
  };

  const centerLabelStyle = {
    alignment: { horizontal: 'center', vertical: 'center' },
    // no border here
  };

  // --- 3. BUILD EXCEL DATA ---
  const monthName = formatMonthName(new Date(startDateStr));
  const row1 = [monthName, 'Date'];
  const row2 = ['Vehicle Storage', 'Vehicle Types'];

  dateKeys.forEach((d) => {
    row1.push(d.day, '', '');
    row2.push('TMS', 'Non TMS', 'TVU');
  });
  const excelData = [row1, row2];

  const createRow = (label1, label2, category) => {
    const row = [label1, label2];
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

  // Rows Generation
  vehicleTypes.forEach((type, idx) =>
    excelData.push(createRow(idx === 0 ? 'Dry' : '', type, 'Dry'))
  );
  excelData.push(createRow('Interbranch', '', 'Dry')); // Col A: Interbranch (Akan di merge)
  excelData.push(createRow('Total Used', '', 'DryTotal'));

  vehicleTypes.forEach((type, idx) =>
    excelData.push(createRow(idx === 0 ? 'Frozen' : '', type, 'Frozen'))
  );
  excelData.push(createRow('Interbranch', '', 'Frozen'));
  excelData.push(createRow('Total Used', '', 'FrozenTotal'));

  excelData.push(createRow('OTV', '', 'OTV'));

  const ws = XLSX.utils.aoa_to_sheet(excelData);

  // --- 4. MERGES ---
  const merges = [];
  let colIdx = 2;
  dateKeys.forEach(() => {
    merges.push({ s: { r: 0, c: colIdx }, e: { r: 0, c: colIdx + 2 } }); // Header Tanggal
    colIdx += 3;
  });

  // Merge Storage Label (Dry & Frozen)
  merges.push({ s: { r: startDry, c: 0 }, e: { r: dryInterbranchRow - 1, c: 0 } });
  merges.push({ s: { r: frozenStartRow, c: 0 }, e: { r: frozenInterbranchRow - 1, c: 0 } });

  // Merge Interbranch & Total (Kolom A & B)
  merges.push({ s: { r: dryInterbranchRow, c: 0 }, e: { r: dryInterbranchRow, c: 1 } });
  merges.push({ s: { r: dryTotalRow, c: 0 }, e: { r: dryTotalRow, c: 1 } });
  merges.push({ s: { r: frozenInterbranchRow, c: 0 }, e: { r: frozenInterbranchRow, c: 1 } });
  merges.push({ s: { r: frozenTotalRow, c: 0 }, e: { r: frozenTotalRow, c: 1 } });
  merges.push({ s: { r: otvRow, c: 0 }, e: { r: otvRow, c: 1 } });

  ws['!merges'] = merges;

  // --- 5. STYLING ---
  const range = XLSX.utils.decode_range(ws['!ref']);

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
      const cell = ws[cellRef];

      // A. HEADER (Row 0 & 1)
      if (R === 0 || R === 1) {
        // Keep header with top & bottom border to separate header visually
        cell.s = {
          ...baseStyle,
          font: { bold: true },
          fill: headerFill,
          border: { top: thin, bottom: thin },
        };
        // Add vertical separator lines: left separator between labels and data, and thick right after each TVU
        if (C === 2) {
          // left separator between labels (A-B) and date area
          cell.s.border.left = medium;
        }
        if (C > 1 && (C - 2) % 3 === 2) {
          // thick separator after TVU (end of date group)
          cell.s.border.right = medium;
        }
      }
      // B. DATA (Row 2+)
      else {
        // Label Styles (columns A & B) — NO borders at all
        if (C <= 1) {
          const isMergedRow = [
            dryInterbranchRow,
            dryTotalRow,
            frozenInterbranchRow,
            frozenTotalRow,
            otvRow,
          ].includes(R);

          // Pilih style align
          if (isMergedRow && C === 0) {
            cell.s = { ...leftStyle };
          } else if (C === 0) {
            cell.s = { ...centerLabelStyle };
          } else {
            cell.s = { ...leftStyle };
          }

          // Tentukan warna fill baris sama seperti kolom data
          let rowFill = null;
          if (R >= startDry && R <= dryInterbranchRow) rowFill = dryFill;
          else if (R === dryTotalRow) rowFill = dryTotalFill;
          else if (R >= frozenStartRow && R <= frozenInterbranchRow) rowFill = frozenFill;
          else if (R === frozenTotalRow) rowFill = frozenTotalFill;
          else if (R === otvRow) rowFill = otvFill;

          if (rowFill) cell.s.fill = rowFill;

          // Semua label kolom A–B: no border
          cell.s.border = undefined;
        }
        // Data Styles (columns C and onwards)
        else {
          cell.s = { ...baseStyle };
          // Add a vertical separator to the left of the first data column to separate labels from dates
          if (C === 2) {
            cell.s.border = { left: medium };
          } else {
            cell.s.border = {}; // start empty border object
          }

          // Add thick right border for TVU column to mark end of date group
          if ((C - 2) % 3 === 2) {
            // ensure border object exists
            cell.s.border.right = medium;
          }

          // Sunday shading if needed
          let isSundayCol = false;
          if (C > 1) {
            const dateIndex = Math.floor((C - 2) / 3);
            if (dateKeys[dateIndex] && dateKeys[dateIndex].isSunday) isSundayCol = true;
          }
          if (isSundayCol) {
            cell.s.fill = redFill;
          } else {
            if (R >= startDry && R <= dryInterbranchRow) cell.s.fill = dryFill;
            else if (R === dryTotalRow) cell.s.fill = dryTotalFill;
            else if (R >= frozenStartRow && R <= frozenInterbranchRow) cell.s.fill = frozenFill;
            else if (R === frozenTotalRow) cell.s.fill = frozenTotalFill;
            else if (R === otvRow) cell.s.fill = otvFill;
          }
        }

        // Font Bold untuk Baris Spesial
        if (
          [dryInterbranchRow, dryTotalRow, frozenInterbranchRow, frozenTotalRow, otvRow].includes(R)
        ) {
          cell.s.font = { bold: true };
        }
      }
    }
  }

  const cols = [{ wch: 15 }, { wch: 25 }];
  for (let i = 0; i < dateKeys.length * 3; i++) cols.push({ wch: 8 });
  ws['!cols'] = cols;

  XLSX.utils.book_append_sheet(wb, ws, 'Truck Usage');
}
