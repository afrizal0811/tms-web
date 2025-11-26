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

  // FIX: Ambil data master langsung
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
  const excelData = [];
  const merges = [];

  const buildTableData = (isPercentage, startRowIndex) => {
    const tableRows = [];
    const row1 = [isPercentage ? `${monthName} (%)` : monthName, 'Date', 'Total'];
    dateKeys.forEach((d) => row1.push(d.day, '', ''));
    tableRows.push(row1);

    const row2 = ['Vehicle Storage', 'Vehicle Types', ''];
    dateKeys.forEach(() => row2.push('TMS', 'Non TMS', 'TVU'));
    tableRows.push(row2);

    const rowMasterTotals = {};

    const createRow = (label1, label2, category, relativeRowIdx) => {
      const row = [label1, label2];
      let totalVal = null;
      if (category === 'Dry') totalVal = hubMasterData?.Dry?.[label2];
      else if (category === 'Frozen') totalVal = hubMasterData?.Frozen?.[label2];
      else if (category === 'DryTotal') totalVal = hubMasterData?.Dry?.Total;
      else if (category === 'FrozenTotal') totalVal = hubMasterData?.Frozen?.Total;
      else if (category === 'OTV')
        totalVal = (hubMasterData?.Dry?.Total || 0) + (hubMasterData?.Frozen?.Total || 0);

      rowMasterTotals[relativeRowIdx] = totalVal || 0;
      row.push(totalVal || null);

      dateKeys.forEach((d) => {
        let valRaw = 0;
        if (category === 'Dry' || category === 'Frozen') valRaw = dateMap[d.str][category][label2];
        else if (category === 'DryTotal') valRaw = dateMap[d.str].DryTotal;
        else if (category === 'FrozenTotal') valRaw = dateMap[d.str].FrozenTotal;
        else if (category === 'OTV') valRaw = dateMap[d.str].OTV;
        valRaw = valRaw || 0;

        const nonTmsRaw = 0;
        const tmsDisp = valRaw > 0 ? valRaw : null;
        const nonTmsDisp = null;

        let tvuDisp = null;
        const sumVal = valRaw + nonTmsRaw;
        if (sumVal > 0) tvuDisp = sumVal;

        if (isPercentage) {
          if (totalVal > 0) {
            const tmsPct = tmsDisp !== null ? tmsDisp / totalVal : null;
            const nonTmsPct = null;
            const tvuPct = tvuDisp !== null ? tvuDisp / totalVal : null;
            row.push(tmsPct, nonTmsPct, tvuPct);
          } else {
            row.push(null, null, null);
          }
        } else {
          row.push(tmsDisp, nonTmsDisp, tvuDisp);
        }
      });
      return row;
    };

    let rIdx = 2;
    vehicleTypes.forEach((type, idx) =>
      tableRows.push(createRow(idx === 0 ? 'Dry' : '', type, 'Dry', rIdx++))
    );
    tableRows.push(createRow('Interbranch', '', 'Dry', rIdx++));
    tableRows.push(createRow('Total Used', '', 'DryTotal', rIdx++));
    vehicleTypes.forEach((type, idx) =>
      tableRows.push(createRow(idx === 0 ? 'Frozen' : '', type, 'Frozen', rIdx++))
    );
    tableRows.push(createRow('Interbranch', '', 'Frozen', rIdx++));
    tableRows.push(createRow('Total Used', '', 'FrozenTotal', rIdx++));
    tableRows.push(createRow('OTV', '', 'OTV', rIdx++));

    // Merges
    const H1 = startRowIndex;
    const H2 = startRowIndex + 1;
    let colIdx = 3;
    dateKeys.forEach(() => {
      merges.push({ s: { r: H1, c: colIdx }, e: { r: H1, c: colIdx + 2 } });
      colIdx += 3;
    });
    merges.push({ s: { r: H1, c: 2 }, e: { r: H2, c: 2 } });

    const dryStart = startRowIndex + 2;
    const dryInter = dryStart + vehicleTypes.length;
    const dryTot = dryInter + 1;
    const frzStart = dryTot + 1;
    const frzInter = frzStart + vehicleTypes.length;
    const frzTot = frzInter + 1;
    const otvRow = frzTot + 1;

    merges.push({ s: { r: dryStart, c: 0 }, e: { r: dryInter - 1, c: 0 } });
    merges.push({ s: { r: frzStart, c: 0 }, e: { r: frzInter - 1, c: 0 } });
    merges.push({ s: { r: dryInter, c: 0 }, e: { r: dryInter, c: 1 } });
    merges.push({ s: { r: dryTot, c: 0 }, e: { r: dryTot, c: 1 } });
    merges.push({ s: { r: frzInter, c: 0 }, e: { r: frzInter, c: 1 } });
    merges.push({ s: { r: frzTot, c: 0 }, e: { r: frzTot, c: 1 } });
    merges.push({ s: { r: otvRow, c: 0 }, e: { r: otvRow, c: 1 } });

    return { tableRows, rowMasterTotals };
  };

  const table1 = buildTableData(false, 0);
  excelData.push(...table1.tableRows);
  excelData.push([]);
  const table2StartRow = excelData.length;
  const table2 = buildTableData(true, table2StartRow);
  excelData.push(...table2.tableRows);

  const ws = XLSX.utils.aoa_to_sheet(excelData);
  ws['!merges'] = merges;
  ws['!views'] = [{ state: 'frozen', xSplit: 3, ySplit: 2 }];

  // --- 6. STYLING ---
  const range = XLSX.utils.decode_range(ws['!ref']);
  const tableHeight = 2 + vehicleTypes.length + 1 + 1 + vehicleTypes.length + 1 + 1 + 1;
  const getRelativeRowInfo = (R) => {
    let isTable1 = false,
      isTable2 = false,
      relR = -1;
    if (R < tableHeight) {
      isTable1 = true;
      relR = R;
    } else if (R >= table2StartRow && R < table2StartRow + tableHeight) {
      isTable2 = true;
      relR = R - table2StartRow;
    }
    if (relR === -1) return null;
    const startDry = 2;
    const dryInter = startDry + vehicleTypes.length;
    const dryTot = dryInter + 1;
    const frzStart = dryTot + 1;
    const frzInter = frzStart + vehicleTypes.length;
    const frzTot = frzInter + 1;
    const otvRow = frzTot + 1;
    return {
      isTable1,
      isTable2,
      relR,
      startDry,
      dryInter,
      dryTot,
      frzStart,
      frzInter,
      frzTot,
      otvRow,
    };
  };

  for (let R = range.s.r; R <= range.e.r; ++R) {
    const info = getRelativeRowInfo(R);
    if (!info) continue;

    const {
      isTable1,
      isTable2,
      relR,
      startDry,
      dryInter,
      dryTot,
      frzStart,
      frzInter,
      frzTot,
      otvRow,
    } = info;
    const currentMasterTotals = isTable1 ? table1.rowMasterTotals : table2.rowMasterTotals;

    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
      const cell = ws[cellRef];

      if (relR === 0 || relR === 1) {
        cell.s = { ...HEADER_STYLES.main };
        if (C === 3) cell.s.border.left = BORDERS.medium;
        if (C > 2 && (C - 3) % 3 === 2) cell.s.border.right = BORDERS.medium;
        if (C === 2) cell.s.border.right = BORDERS.medium;
      } else {
        let rowFill = null;
        if (relR >= startDry && relR <= dryInter) rowFill = FILL_STYLES.dry;
        else if (relR === dryTot) rowFill = FILL_STYLES.dryTotal;
        else if (relR >= frzStart && relR <= frzInter) rowFill = FILL_STYLES.frozen;
        else if (relR === frzTot) rowFill = FILL_STYLES.frozenTotal;
        else if (relR === otvRow) rowFill = FILL_STYLES.otv;

        if (C <= 1) {
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
          cell.s = { ...BASE_STYLES.center };

          // --- FIX: Apply Percentage Format First ---
          if (isTable2 && C > 2) {
            if (typeof cell.v === 'number') {
              cell.t = 'n';
              cell.s.numFmt = '0%'; // Format "7%"
            }
          }

          if (C === 2) {
            cell.s.border = { left: BORDERS.thin, right: BORDERS.medium };
            if (rowFill) cell.s.fill = rowFill;
            cell.s.font = FONT_STYLES.bold;
          } else {
            if (C === 3) cell.s.border = { left: BORDERS.medium };
            else cell.s.border = {};
            if ((C - 3) % 3 === 2) cell.s.border.right = BORDERS.medium;

            let isSundayCol = false;
            let isTMSCol = false;
            let isTVUCol = false;
            if (C > 2) {
              const relativeIdx = (C - 3) % 3;
              if (relativeIdx === 0) isTMSCol = true;
              if (relativeIdx === 2) isTVUCol = true; // TVU Check
              const dateIndex = Math.floor((C - 3) / 3);
              if (dateKeys[dateIndex] && dateKeys[dateIndex].isSunday) isSundayCol = true;
            }

            let finalFill = rowFill;
            const isDetailRow = ![dryInter, dryTot, frzInter, frzTot, otvRow].includes(relR);
            const masterTotal = currentMasterTotals[relR] || 0;
            const val = cell.v;

            if (isTable1) {
              // COUNT
              if (isTMSCol && isDetailRow && val > masterTotal) {
                finalFill = FILL_STYLES.alertRed;
              } else if (isSundayCol) {
                finalFill = FILL_STYLES.red;
              }
            } else {
              // PERCENTAGE (TMS OR TVU)
              if (isSundayCol) {
                finalFill = FILL_STYLES.red;
              } else if ((isTMSCol || isTVUCol) && typeof val === 'number' && val > 0) {
                if (val > 1) finalFill = FILL_STYLES.alertRed;
                else if (val >= 0.75)
                  finalFill = { patternType: 'solid', fgColor: { rgb: 'B7E1CD' } };
                else if (val >= 0.5)
                  finalFill = { patternType: 'solid', fgColor: { rgb: 'F1C232' } };
                else finalFill = { patternType: 'solid', fgColor: { rgb: 'F4CCCC' } };
              }
            }

            if (finalFill) cell.s.fill = finalFill;

            if (isTable2 && finalFill === FILL_STYLES.alertRed) {
              cell.s.font = FONT_STYLES.whiteBold;
            }
          }
        }

        if (
          [dryInterbranchRow, dryTotalRow, frozenInterbranchRow, frozenTotalRow, otvRow].includes(
            relR
          )
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
