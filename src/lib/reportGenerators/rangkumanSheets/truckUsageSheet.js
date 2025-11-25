// File: src/lib/reportGenerators/rangkumanSheets/truckUsageSheet.js
import { TAG_MAP_KEY, VEHICLE_TYPES } from '@/lib/constants';
import { getMasterTruckData } from '@/lib/masterTruckHelper';
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
  return { dateMap, dateKeys, vehicleTypes: VEHICLE_TYPES, hubMasterData };
}

/**
 * BAGIAN 2: GENERATOR EXCEL (2 TABEL)
 */
export function generateTruckUsageSheet(wb, resultsData, startDateStr, endDateStr, hubId) {
  const { dateMap, dateKeys, vehicleTypes, hubMasterData } = calculateTruckUsageData(
    resultsData,
    startDateStr,
    endDateStr,
    hubId
  );

  // --- STYLES ---
  const headerFill = { patternType: 'solid', fgColor: { rgb: 'D9D2E9' } };
  const dryFill = { patternType: 'solid', fgColor: { rgb: 'FAE2D5' } };
  const dryTotalFill = { patternType: 'solid', fgColor: { rgb: 'F9CB9C' } };
  const frozenFill = { patternType: 'solid', fgColor: { rgb: 'DBE9F7' } };
  const frozenTotalFill = { patternType: 'solid', fgColor: { rgb: 'C9DAF8' } };
  const otvFill = { patternType: 'solid', fgColor: { rgb: 'D9F2D0' } };
  const redFill = { patternType: 'solid', fgColor: { rgb: 'FFC7CE' } }; // Sunday
  const alertRedFill = { patternType: 'solid', fgColor: { rgb: 'FF0000' } }; // Overlimit Count

  // Percentage Colors
  const pctLowFill = { patternType: 'solid', fgColor: { rgb: 'F4CCCC' } }; // 0-49%
  const pctMidFill = { patternType: 'solid', fgColor: { rgb: 'F1C232' } }; // 50-74%
  const pctHighFill = { patternType: 'solid', fgColor: { rgb: 'B7E1CD' } }; // 75-100%

  const thin = { style: 'thin', color: { auto: 1 } };
  const medium = { style: 'medium', color: { auto: 1 } };

  const baseStyle = { alignment: { horizontal: 'center', vertical: 'center' } };
  const leftStyle = { alignment: { horizontal: 'left', vertical: 'center', indent: 1 } };
  const centerLabelStyle = { alignment: { horizontal: 'center', vertical: 'center' } };

  // --- BUILD EXCEL DATA ---
  const monthName = formatMonthName(new Date(startDateStr));
  const excelData = [];
  const merges = [];

  // Fungsi Helper untuk membuat 1 blok Tabel
  const buildTableData = (isPercentage, startRowIndex) => {
    const tableRows = [];

    // 1. Header Row 1
    const row1 = [isPercentage ? `${monthName} (%)` : monthName, 'Date', 'Total'];
    dateKeys.forEach((d) => row1.push(d.day, '', ''));
    tableRows.push(row1);

    // 2. Header Row 2
    const row2 = ['Vehicle Storage', 'Vehicle Types', ''];
    dateKeys.forEach(() => row2.push('TMS', 'Non TMS', 'TVU'));
    tableRows.push(row2);

    // Track Master Totals per baris (relatif terhadap tabel ini)
    const rowMasterTotals = {};

    // Helper Create Data Row
    const createRow = (label1, label2, category, relativeRowIdx) => {
      const row = [label1, label2];

      let totalVal = null;
      if (category === 'Dry') totalVal = hubMasterData?.Dry?.[label2];
      else if (category === 'Frozen') totalVal = hubMasterData?.Frozen?.[label2];
      else if (category === 'DryTotal') totalVal = hubMasterData?.Dry?.Total;
      else if (category === 'FrozenTotal') totalVal = hubMasterData?.Frozen?.Total;
      else if (category === 'OTV')
        totalVal = (hubMasterData?.Dry?.Total || 0) + (hubMasterData?.Frozen?.Total || 0);

      // Simpan Master Total untuk styling nanti
      rowMasterTotals[relativeRowIdx] = totalVal || 0;

      // Kolom Total di Excel
      row.push(totalVal || null);

      dateKeys.forEach((d) => {
        let val = null;
        if (category === 'Dry' || category === 'Frozen') val = dateMap[d.str][category][label2];
        else if (category === 'DryTotal') val = dateMap[d.str].DryTotal;
        else if (category === 'FrozenTotal') val = dateMap[d.str].FrozenTotal;
        else if (category === 'OTV') val = dateMap[d.str].OTV;

        // LOGIKA NILAI CELL
        if (isPercentage) {
          // Jika master 0, tidak bisa hitung % -> null
          if (totalVal && totalVal > 0 && val > 0) {
            val = val / totalVal; // Desimal untuk format % excel
          } else {
            val = null;
          }
        } else {
          val = val === 0 ? null : val;
        }

        row.push(val);
        row.push(null);
        row.push(null);
      });
      return row;
    };

    let rIdx = 2; // Mulai setelah 2 header

    // DRY
    vehicleTypes.forEach((type, idx) => {
      tableRows.push(createRow(idx === 0 ? 'Dry' : '', type, 'Dry', rIdx++));
    });
    tableRows.push(createRow('Interbranch', '', 'Dry', rIdx++));
    tableRows.push(createRow('Total Used', '', 'DryTotal', rIdx++));

    // FROZEN
    vehicleTypes.forEach((type, idx) => {
      tableRows.push(createRow(idx === 0 ? 'Frozen' : '', type, 'Frozen', rIdx++));
    });
    tableRows.push(createRow('Interbranch', '', 'Frozen', rIdx++));
    tableRows.push(createRow('Total Used', '', 'FrozenTotal', rIdx++));

    // OTV
    tableRows.push(createRow('OTV', '', 'OTV', rIdx++));

    // --- HITUNG MERGES UNTUK TABEL INI ---
    // Perlu offset dengan startRowIndex
    const H1 = startRowIndex;
    const H2 = startRowIndex + 1;

    // Merge Header Tanggal
    let colIdx = 3;
    dateKeys.forEach(() => {
      merges.push({ s: { r: H1, c: colIdx }, e: { r: H1, c: colIdx + 2 } });
      colIdx += 3;
    });
    // Merge Total Header
    merges.push({ s: { r: H1, c: 2 }, e: { r: H2, c: 2 } });

    // Indeks Baris Data (Relatif + Start)
    const dryStart = startRowIndex + 2;
    const dryInter = dryStart + vehicleTypes.length;
    const dryTot = dryInter + 1;
    const frzStart = dryTot + 1;
    const frzInter = frzStart + vehicleTypes.length;
    const frzTot = frzInter + 1;
    const otvRow = frzTot + 1;

    // Merge Labels
    merges.push({ s: { r: dryStart, c: 0 }, e: { r: dryInter - 1, c: 0 } }); // Dry Label
    merges.push({ s: { r: frzStart, c: 0 }, e: { r: frzInter - 1, c: 0 } }); // Frozen Label
    merges.push({ s: { r: dryInter, c: 0 }, e: { r: dryInter, c: 1 } }); // Interbranch
    merges.push({ s: { r: dryTot, c: 0 }, e: { r: dryTot, c: 1 } }); // Total Used
    merges.push({ s: { r: frzInter, c: 0 }, e: { r: frzInter, c: 1 } });
    merges.push({ s: { r: frzTot, c: 0 }, e: { r: frzTot, c: 1 } });
    merges.push({ s: { r: otvRow, c: 0 }, e: { r: otvRow, c: 1 } });

    return { tableRows, rowMasterTotals };
  };

  // --- GENERATE TABLE 1 (COUNT) ---
  const table1 = buildTableData(false, 0);
  excelData.push(...table1.tableRows);

  // Add Spacer
  excelData.push([]);

  // --- GENERATE TABLE 2 (PERCENTAGE) ---
  const table2StartRow = excelData.length;
  const table2 = buildTableData(true, table2StartRow);
  excelData.push(...table2.tableRows);

  const ws = XLSX.utils.aoa_to_sheet(excelData);
  ws['!merges'] = merges;
  ws['!views'] = [{ state: 'frozen', xSplit: 3, ySplit: 2 }]; // Freeze Table 1 headers

  // --- STYLING LOOP ---
  const range = XLSX.utils.decode_range(ws['!ref']);

  // Helper: Cek apakah row ini adalah baris spesial (Interbranch/Total/OTV)
  // Kita perlu tahu relatif index dalam satu blok tabel
  // Tinggi 1 tabel = 2 (Header) + N_Dry + 1 + 1 + N_Frz + 1 + 1 + 1
  const tableHeight = 2 + vehicleTypes.length + 1 + 1 + vehicleTypes.length + 1 + 1 + 1;

  const getRelativeRowInfo = (R) => {
    let isTable1 = false;
    let isTable2 = false;
    let relR = -1;

    if (R < tableHeight) {
      isTable1 = true;
      relR = R;
    } else if (R >= table2StartRow && R < table2StartRow + tableHeight) {
      isTable2 = true;
      relR = R - table2StartRow;
    }

    if (relR === -1) return null; // Spacer row

    // Hitung posisi baris spesial
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
    if (!info) continue; // Skip spacer row

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
    // masterTotals key-nya relatif terhadap data row (mulai 2), jadi relR pas.

    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
      const cell = ws[cellRef];

      // A. HEADERS
      if (relR === 0 || relR === 1) {
        cell.s = {
          ...baseStyle,
          font: { bold: true },
          fill: headerFill,
          border: { top: thin, bottom: thin },
        };
        if (C === 3) cell.s.border.left = medium;
        if (C > 2 && (C - 3) % 3 === 2) cell.s.border.right = medium;
        if (C === 2) cell.s.border.right = medium;
      }
      // B. DATA ROWS
      else {
        // Tentukan Warna Dasar Baris
        let rowFill = null;
        if (relR >= startDry && relR <= dryInter) rowFill = dryFill;
        else if (relR === dryTot) rowFill = dryTotalFill;
        else if (relR >= frzStart && relR <= frzInter) rowFill = frozenFill;
        else if (relR === frzTot) rowFill = frozenTotalFill;
        else if (relR === otvRow) rowFill = otvFill;

        // Format Number
        if (isTable2 && C > 2) {
          // Table 2 Data Cells (Exclude Total Col)
          if (cell.t === 'n') cell.s = { numFmt: '0%' };
        }

        // 1. Label & Total Col (C <= 2)
        if (C <= 2) {
          cell.s = { ...baseStyle };

          if (C <= 1) {
            // A & B
            const isMerged = [dryInter, dryTot, frzInter, frzTot, otvRow].includes(relR);
            if (isMerged && C === 0) cell.s = { ...leftStyle };
            else if (C === 0) cell.s = { ...centerLabelStyle };
            else cell.s = { ...leftStyle };

            if (rowFill) cell.s.fill = rowFill;
            cell.s.border = undefined;
          } else {
            // C (Total)
            cell.s.border = { left: thin, right: medium };
            if (rowFill) cell.s.fill = rowFill;
            cell.s.font = { bold: true };
          }
        }
        // 2. Daily Data (C > 2)
        else {
          cell.s = { ...baseStyle };
          if (C === 3) cell.s.border = { left: medium };
          else cell.s.border = {};
          if ((C - 3) % 3 === 2) cell.s.border.right = medium;

          // Warna Minggu
          let isSundayCol = false;
          let isTMSCol = false;
          if (C > 2) {
            const relativeIdx = (C - 3) % 3;
            if (relativeIdx === 0) isTMSCol = true;
            const dateIndex = Math.floor((C - 3) / 3);
            if (dateKeys[dateIndex] && dateKeys[dateIndex].isSunday) isSundayCol = true;
          }

          // --- COLOR LOGIC ---
          let finalFill = rowFill; // Default row color

          // Cek Detail Row (Bukan Total/Interbranch)
          const isDetailRow = ![dryInter, dryTot, frzInter, frzTot, otvRow].includes(relR);
          const masterTotal = currentMasterTotals[relR] || 0;
          const val = cell.v;

          if (isTable1) {
            // TABLE 1: Alert Red jika > Master (Count)
            if (isTMSCol && isDetailRow && val > masterTotal) {
              finalFill = alertRedFill;
            } else if (isSundayCol) {
              finalFill = redFill;
            }
          } else {
            // TABLE 2: Percentage Colors (Hanya untuk TMS yang ada nilainya)
            if (isSundayCol) {
              finalFill = redFill;
            } else if (isTMSCol && isDetailRow && typeof val === 'number') {
              // val di sini sudah dalam desimal (0.5 = 50%)
              if (val > 1)
                finalFill = alertRedFill; // > 100%
              else if (val >= 0.75) finalFill = pctHighFill;
              else if (val >= 0.5) finalFill = pctMidFill;
              else finalFill = pctLowFill; // 0-49%
            }
          }

          if (finalFill) cell.s.fill = finalFill;

          // Format % untuk Table 2
          if (isTable2) {
            cell.s.numFmt = '0%';
            // Untuk alert red, kasih teks putih/bold biar jelas
            if (finalFill === alertRedFill) {
              cell.s.font = { bold: true, color: { rgb: 'FFFFFF' } };
            }
          }
        }

        // Bold Font untuk baris Total
        if ([dryInter, dryTot, frzInter, frzTot, otvRow].includes(relR)) {
          cell.s.font = { ...cell.s.font, bold: true };
        }
      }
    }
  }

  // Set Columns Width
  const cols = [{ wch: 15 }, { wch: 25 }, { wch: 8 }];
  for (let i = 0; i < dateKeys.length * 3; i++) cols.push({ wch: 8 });
  ws['!cols'] = cols;

  XLSX.utils.book_append_sheet(wb, ws, 'Truck Usage');
}
