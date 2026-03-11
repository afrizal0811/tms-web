import { getDrivers, getVehicleMappings, getVehicleTypes } from '@/lib/api';
import { calculateMasterTruckStorage } from '@/lib/driverDataHelper';
import { formatDateUniversal } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import { BASE_STYLES, BORDERS, FILL_STYLES, FONT_STYLES, HEADER_STYLES } from './reportStyles';

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

function getVehicleType(firstTag, vehiclePlate, mappingsObj, vehicleTypes) {
  if (vehiclePlate && mappingsObj[vehiclePlate]) {
    return mappingsObj[vehiclePlate];
  }
  if (!firstTag) return 'Lainnya';
  const parts = firstTag.split('-');
  if (parts.length < 2) return 'Lainnya';
  let specificType = parts[1].toUpperCase();
  if (parts.length > 2 && parts[2].toUpperCase() === 'LONG') {
    if (['CDE', 'CDD', 'FUSO'].includes(specificType)) {
      specificType = `${specificType}-LONG`;
    }
  }
  if (vehicleTypes.includes(specificType)) return specificType;
  return specificType;
}

// FUNGSI INI DI-EXPORT AGAR BISA DIGUNAKAN OLEH TRUCK USAGE TAB UNTUK LOCAL REFRESH
export function calculateUsageSummary(dateMap, dateKeys, hubMasterData, vehicleTypes) {
  const summary = { Dry: { types: {}, total: {} }, Frozen: { types: {}, total: {} }, OTV: {} };

  const workingDays = dateKeys.filter((d) => {
    if (d.isSunday) return false;
    return (dateMap[d.str]?.OTV || 0) > 0 || (dateMap[d.str]?.OTVManual || 0) > 0;
  }).length;

  const categories = ['Dry', 'Frozen'];

  categories.forEach((cat) => {
    let grpTMS = 0;
    let grpManual = 0;

    vehicleTypes.forEach((type) => {
      let totalTMS = 0;
      let totalManual = 0;
      dateKeys.forEach((d) => {
        totalTMS += dateMap[d.str][cat][type] || 0;
        totalManual += dateMap[d.str][`${cat}Manual`][type]?.count || 0;
      });
      const TVU = totalTMS + totalManual;
      const V_Type = hubMasterData?.[cat]?.[type] || 0;
      const TV = V_Type * workingDays;
      const PctTVU = TV > 0 ? TVU / TV : 0;
      const VU = Math.ceil(PctTVU * V_Type);
      const IV = Math.max(0, V_Type - VU);
      const PctIV = V_Type > 0 ? IV / V_Type : 0;
      summary[cat].types[type] = {
        TMS: totalTMS,
        Manual: totalManual,
        TVU,
        TV,
        PctTVU,
        PctTMS: TV > 0 ? totalTMS / TV : 0,
        PctManual: TV > 0 ? totalManual / TV : 0,
        PctIV,
        V: V_Type,
        VU,
        IV,
      };
      grpTMS += totalTMS;
      grpManual += totalManual;
    });

    // MENGHITUNG PENGURANGAN INTERBRANCH UNTUK TOTAL USED
    let interbranchTMS = 0;
    let interbranchManual = 0;
    dateKeys.forEach((d) => {
      interbranchTMS += dateMap[d.str][cat]['Interbranch'] || 0;
      interbranchManual += dateMap[d.str][`${cat}Manual`]['Interbranch']?.count || 0;
    });

    const netTMS = grpTMS - interbranchTMS;
    const netManual = grpManual - interbranchManual;

    const V_Total = hubMasterData?.[cat]?.Total || 0;
    const TV_Total = V_Total * workingDays;
    const TVU_Total = netTMS + netManual;

    const PctTVU_Total = TV_Total > 0 ? TVU_Total / TV_Total : 0;
    const PctTMS_Total = TV_Total > 0 ? netTMS / TV_Total : 0;
    const PctManual_Total = TV_Total > 0 ? netManual / TV_Total : 0;
    const VU_Total = Math.ceil(PctTVU_Total * V_Total);
    const IV_Total = Math.max(0, V_Total - VU_Total);
    const PctIV_Total = V_Total > 0 ? IV_Total / V_Total : 0;

    summary[cat].total = {
      TMS: netTMS,
      Manual: netManual,
      TVU: TVU_Total,
      TV: TV_Total,
      PctTVU: PctTVU_Total,
      PctTMS: PctTMS_Total,
      PctManual: PctManual_Total,
      PctIV: PctIV_Total,
      V: V_Total,
      VU: VU_Total,
      IV: IV_Total,
    };
  });

  let otvTMS = 0;
  let otvManual = 0;
  dateKeys.forEach((d) => {
    otvTMS += dateMap[d.str].OTV || 0;
    otvManual += dateMap[d.str].OTVManual || 0;
  });

  const V_OTV = (hubMasterData?.Dry?.Total || 0) + (hubMasterData?.Frozen?.Total || 0);
  const TV_OTV = V_OTV * workingDays;
  const TVU_OTV = otvTMS + otvManual;
  const PctTVU_OTV = TV_OTV > 0 ? TVU_OTV / TV_OTV : 0;
  const PctTMS_OTV = TV_OTV > 0 ? otvTMS / TV_OTV : 0;
  const PctManual_OTV = TV_OTV > 0 ? otvManual / TV_OTV : 0;
  const VU_OTV = Math.ceil(PctTVU_OTV * V_OTV);
  const IV_OTV = Math.max(0, V_OTV - VU_OTV);
  const PctIV_OTV = V_OTV > 0 ? IV_OTV / V_OTV : 0;

  summary.OTV = {
    TMS: otvTMS,
    Manual: otvManual,
    TVU: TVU_OTV,
    TV: TV_OTV,
    PctTVU: PctTVU_OTV,
    PctTMS: PctTMS_OTV,
    PctManual: PctManual_OTV,
    PctIV: PctIV_OTV,
    V: V_OTV,
    VU: VU_OTV,
    IV: IV_OTV,
  };
  return summary;
}

async function getTruckUsageData(hubId, startDate, endDate) {
  try {
    const res = await fetch(
      `/api/truck-usage?hubId=${hubId}&startDate=${startDate}&endDate=${endDate}`
    );
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error('Gagal mengambil data Truck Usage', e);
    return [];
  }
}

export async function calculateTruckUsageData(resultsData, startDateStr, endDateStr, hubId) {
  const [vehicleTypesObj, mappingsDB, driversDB, manualUsageDB] = await Promise.all([
    getVehicleTypes(),
    getVehicleMappings(),
    getDrivers(hubId),
    getTruckUsageData(hubId, startDateStr, endDateStr),
  ]);

  const vehicleTypes = vehicleTypesObj.map((v) => v.name);
  const mappingsObj = mappingsDB.reduce((acc, curr) => {
    acc[curr.plat] = curr.mappedType;
    return acc;
  }, {});

  const hubMasterData = await calculateMasterTruckStorage(driversDB, mappingsObj, vehicleTypes);

  const dateMap = {};
  const dateKeys = [];
  const currentIterDate = new Date(startDateStr);
  const endDateObj = new Date(endDateStr);

  while (currentIterDate <= endDateObj) {
    const dateStr = formatDateUniversal(currentIterDate);
    const dayNum = currentIterDate.getDate();
    const isSunday = currentIterDate.getDay() === 0;
    dateKeys.push({ str: dateStr, day: dayNum, isSunday });

    dateMap[dateStr] = {
      Dry: { Interbranch: 0, Interbranch_details: [] },
      Frozen: { Interbranch: 0, Interbranch_details: [] },
      DryTotal: 0,
      FrozenTotal: 0,
      OTV: 0,
      DryManual: { Interbranch: {} },
      FrozenManual: { Interbranch: {} },
      DryTotalManual: 0,
      FrozenTotalManual: 0,
      OTVManual: 0,
    };

    vehicleTypes.forEach((type) => {
      dateMap[dateStr].Dry[type] = 0;
      dateMap[dateStr].Dry[`${type}_details`] = []; // ARRAY PENYIMPAN DETAIL TMS
      dateMap[dateStr].Frozen[type] = 0;
      dateMap[dateStr].Frozen[`${type}_details`] = []; // ARRAY PENYIMPAN DETAIL TMS
    });
    currentIterDate.setDate(currentIterDate.getDate() + 1);
  }

  if (Array.isArray(manualUsageDB)) {
    manualUsageDB.forEach((item) => {
      const dStr = item.date;
      if (dateMap[dStr]) {
        const st = item.storageType;
        const vt = item.vehicleType;
        dateMap[dStr][`${st}Manual`][vt] = {
          count: item.count,
          desc: item.description,
          id: item.id,
        };

        if (vt === 'Interbranch') {
          dateMap[dStr][`${st}TotalManual`] -= item.count;
          dateMap[dStr].OTVManual -= item.count;
        } else {
          dateMap[dStr][`${st}TotalManual`] += item.count;
          dateMap[dStr].OTVManual += item.count;
        }
      }
    });
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
              const vehiclePlate = route.vehicleName || '-';
              const isFrozen = tags.some(
                (t) => typeof t === 'string' && t.toUpperCase().includes('FROZEN')
              );
              const storage = isFrozen ? 'Frozen' : 'Dry';
              const firstTag = tags.length > 0 ? String(tags[0]) : '';

              const type = getVehicleType(firstTag, vehiclePlate, mappingsObj, vehicleTypes);

              if (dateMap[dateKey][storage][type] !== undefined) {
                dateMap[dateKey][storage][type]++;
                dateMap[dateKey][`${storage}Total`]++;
                dateMap[dateKey].OTV++;
                dateMap[dateKey][storage][`${type}_details`].push({
                  plate: vehiclePlate,
                  driver: driverName,
                  type: type,
                });
              }
            }
          });
        }
      }
    });
  }
  const summaryData = calculateUsageSummary(dateMap, dateKeys, hubMasterData, vehicleTypes);
  return { dateMap, dateKeys, vehicleTypes, hubMasterData, summaryData };
}

export async function generateTruckUsageSheet(
  wb,
  resultsData,
  startDateStr,
  endDateStr,
  hubId,
  translate
) {
  const { dateMap, dateKeys, vehicleTypes, hubMasterData, summaryData } =
    await calculateTruckUsageData(resultsData, startDateStr, endDateStr, hubId);

  const monthName = formatMonthName(new Date(startDateStr));
  const excelData = [];
  const merges = [];
  const getPctFill = (val) => {
    if (val > 1) return FILL_STYLES.alertRed;
    if (val >= 0.75) return { patternType: 'solid', fgColor: { rgb: 'B7E1CD' } };
    if (val >= 0.5) return { patternType: 'solid', fgColor: { rgb: 'F1C232' } };
    return { patternType: 'solid', fgColor: { rgb: 'F4CCCC' } };
  };

  excelData.push([
    `${translate('summary.tabs.truck_usage.subtitle_1')} - ${monthName}`,
    ,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ]);
  excelData.push([
    translate('summary.tabs.truck_usage.vehicle_type'),
    'TMS',
    'Non TMS',
    'TVU',
    'TV',
    '% TVU',
    'V',
    'VU',
    'IV',
  ]);

  const addSummarySection = (cat, isPercentage = false) => {
    vehicleTypes.forEach((type) => {
      const d = summaryData[cat].types[type];
      if (isPercentage) {
        excelData.push([type, d.PctTMS, d.PctManual, d.PctTVU]);
      } else {
        excelData.push([
          type,
          d.TMS || 0,
          d.Manual || 0,
          d.TVU || 0,
          d.TV || 0,
          d.PctTVU,
          null,
          null,
          null,
        ]);
      }
    });
    const t = summaryData[cat].total;
    if (isPercentage) {
      excelData.push([
        translate('summary.tabs.truck_usage.total_used'),
        t.PctTMS,
        t.PctManual,
        t.PctTVU,
      ]);
    } else {
      excelData.push([
        translate('summary.tabs.truck_usage.total_used'),
        t.TMS,
        t.Manual,
        t.TVU,
        t.TV,
        t.PctTVU,
        t.V,
        t.VU,
        t.IV,
      ]);
    }
  };

  addSummarySection('Dry', false);
  addSummarySection('Frozen', false);

  const otv = summaryData.OTV;
  excelData.push(['OTV', otv.TMS, otv.Manual, otv.TVU, otv.TV, otv.PctTVU, otv.V, otv.VU, otv.IV]);

  const summaryCountEndRow = excelData.length;
  excelData.push([]);

  const summaryPctStartRow = excelData.length;

  excelData.push([
    `${translate('summary.tabs.truck_usage.subtitle_2')} - ${monthName}`,
    '',
    '',
    '',
  ]);
  excelData.push([translate('summary.tabs.truck_usage.vehicle_type'), 'TMS', 'Non TMS', 'TVU']);

  addSummarySection('Dry', true);
  addSummarySection('Frozen', true);
  excelData.push(['OTV', otv.PctTMS, otv.PctManual, otv.PctTVU]);

  const summaryPctEndRow = excelData.length;
  excelData.push([]);

  const table1StartRow = summaryPctEndRow + 1;

  const buildTableData = (isPercentage, startRowIndex) => {
    const tableRows = [];
    const row1 = [isPercentage ? `${monthName} (%)` : monthName, 'Date', 'Total'];
    dateKeys.forEach((d) => row1.push(d.day, '', ''));
    tableRows.push(row1);
    const row2 = [
      translate('common.storage_type'),
      translate('summary.tabs.truck_usage.vehicle_type'),
      '',
    ];
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
        let manualRaw = 0;

        if (category === 'Dry' || category === 'Frozen') {
          valRaw = dateMap[d.str][category][label2] || 0;
          manualRaw = dateMap[d.str][`${category}Manual`][label2]?.count || 0;
        } else if (category === 'DryTotal' || category === 'FrozenTotal') {
          valRaw = dateMap[d.str][category] || 0;
          manualRaw = dateMap[d.str][`${category}Manual`] || 0;
        } else if (category === 'OTV') {
          valRaw = dateMap[d.str].OTV || 0;
          manualRaw = dateMap[d.str].OTVManual || 0;
        }

        const tmsDisp = valRaw > 0 ? valRaw : null;
        const manualDisp = manualRaw > 0 ? manualRaw : null;
        let tvuDisp = null;
        const sumVal = valRaw + manualRaw;
        if (sumVal > 0) tvuDisp = sumVal;

        if (isPercentage) {
          if (totalVal > 0) {
            const tmsPct = tmsDisp !== null ? tmsDisp / totalVal : null;
            const manualPct = manualDisp !== null ? manualDisp / totalVal : null;
            const tvuPct = tvuDisp !== null ? tvuDisp / totalVal : null;
            row.push(tmsPct, manualPct, tvuPct);
          } else {
            row.push(null, null, null);
          }
        } else {
          row.push(tmsDisp, manualDisp, tvuDisp);
        }
      });
      return row;
    };
    let rIdx = 2;
    vehicleTypes.forEach((type, idx) =>
      tableRows.push(createRow(idx === 0 ? 'Dry' : '', type, 'Dry', rIdx++))
    );
    tableRows.push(
      createRow(translate('summary.tabs.truck_usage.interbranch'), 'Interbranch', 'Dry', rIdx++)
    );
    tableRows.push(
      createRow(translate('summary.tabs.truck_usage.total_used'), '', 'DryTotal', rIdx++)
    );
    vehicleTypes.forEach((type, idx) =>
      tableRows.push(createRow(idx === 0 ? 'Frozen' : '', type, 'Frozen', rIdx++))
    );
    tableRows.push(
      createRow(translate('summary.tabs.truck_usage.interbranch'), 'Interbranch', 'Frozen', rIdx++)
    );
    tableRows.push(
      createRow(translate('summary.tabs.truck_usage.total_used'), '', 'FrozenTotal', rIdx++)
    );
    tableRows.push(createRow('OTV', '', 'OTV', rIdx++));
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

  const table1 = buildTableData(false, table1StartRow);
  excelData.push(...table1.tableRows);
  excelData.push([]);
  const table2StartRow = excelData.length;
  const table2 = buildTableData(true, table2StartRow);
  excelData.push(...table2.tableRows);

  excelData.push([]);
  excelData.push([translate('summary.tabs.truck_usage.explanation')]);
  const legendTitleRow = excelData.length - 1;

  merges.push({ s: { r: legendTitleRow, c: 0 }, e: { r: legendTitleRow, c: 2 } });

  const legendItems = [
    { key: 'TMS', desc: translate('summary.tabs.truck_usage.tms') },
    { key: 'Non TMS', desc: translate('summary.tabs.truck_usage.non_tms') },
    { key: 'TVU', desc: translate('summary.tabs.truck_usage.tvu') },
    { key: 'TV', desc: translate('summary.tabs.truck_usage.tv') },
    { key: 'V', desc: translate('summary.tabs.truck_usage.vehicle') },
    { key: 'VU', desc: translate('summary.tabs.truck_usage.vu') },
    { key: 'IV', desc: translate('summary.tabs.truck_usage.iv') },
    { key: 'OTV', desc: translate('summary.tabs.truck_usage.otv') },
  ];

  const legendItemStartRow = excelData.length;

  legendItems.forEach((item, idx) => {
    const keyText = item.key;
    excelData.push([keyText, item.desc]);
    const currentRow = legendItemStartRow + idx;
    merges.push({ s: { r: currentRow, c: 1 }, e: { r: currentRow, c: 4 } });
  });

  const ws = XLSX.utils.aoa_to_sheet(excelData);

  merges.push({ s: { r: 0, c: 1 }, e: { r: 0, c: 8 } });
  merges.push({ s: { r: 0, c: 0 }, e: { r: 1, c: 0 } });
  merges.push({ s: { r: summaryPctStartRow, c: 1 }, e: { r: summaryPctStartRow, c: 3 } });
  merges.push({ s: { r: summaryPctStartRow, c: 0 }, e: { r: summaryPctStartRow + 1, c: 0 } });

  ws['!merges'] = merges;
  ws['!views'] = [{ state: 'frozen', xSplit: 3, ySplit: table1StartRow + 2 }];

  const range = XLSX.utils.decode_range(ws['!ref']);
  const tableHeight = 2 + vehicleTypes.length + 1 + 1 + vehicleTypes.length + 1 + 1 + 1;
  const sumDryEnd = 2 + vehicleTypes.length;
  const sumDryTot = sumDryEnd;
  const sumFrzStart = sumDryTot + 1;
  const sumFrzEnd = sumFrzStart + vehicleTypes.length;
  const sumFrzTot = sumFrzEnd;
  const sumOTV = sumFrzTot + 1;

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
      const cell = ws[cellRef];

      if (R >= legendTitleRow) {
        if (R === legendTitleRow && C === 0) {
          cell.s = {
            font: { bold: true, underline: true },
            alignment: { horizontal: 'left' },
          };
        } else if (R >= legendItemStartRow && C === 0) {
          cell.s = {
            alignment: { horizontal: 'left', wrapText: true, vertical: 'center' },
          };
        }
        continue;
      }

      const isSum1 = R < summaryCountEndRow;
      const isSum2 = R >= summaryPctStartRow && R < summaryPctEndRow;

      if (isSum1 || isSum2) {
        const startRow = isSum1 ? 0 : summaryPctStartRow;
        const relR = R - startRow;
        const maxCol = isSum1 ? 8 : 3;

        if (C > maxCol) {
          cell.v = '';
          cell.s = {};
          continue;
        }

        if (relR === 0 || relR === 1) {
          cell.s = { ...HEADER_STYLES.main };
        } else {
          cell.s = { ...BASE_STYLES.center, border: BORDERS.thin };

          if (relR >= 2 && relR < sumDryTot) cell.s.fill = FILL_STYLES.dry;
          else if (relR === sumDryTot) {
            cell.s.fill = FILL_STYLES.dryTotal;
            cell.s.font = FONT_STYLES.bold;
          } else if (relR >= sumFrzStart && relR < sumFrzEnd) cell.s.fill = FILL_STYLES.frozen;
          else if (relR === sumFrzTot) {
            cell.s.fill = FILL_STYLES.frozenTotal;
            cell.s.font = FONT_STYLES.bold;
          } else if (relR === sumOTV) {
            cell.s.fill = FILL_STYLES.otv;
            cell.s.font = FONT_STYLES.bold;
          }

          if (C === 0) cell.s.alignment = { horizontal: 'left', indent: 1 };

          if (isSum1 && C === 5) {
            cell.t = 'n';
            cell.s.numFmt = '0.00%';
          }
          if (isSum2 && C >= 1) {
            cell.t = 'n';
            cell.s.numFmt = '0.00%';
            if (cell.v > 0) cell.s.fill = getPctFill(cell.v);
          }
        }
        continue;
      }

      if (R === summaryCountEndRow || R === summaryPctEndRow) continue;

      let isTable1 = false,
        isTable2 = false,
        relR = -1;
      if (R >= table1StartRow && R < table1StartRow + tableHeight) {
        isTable1 = true;
        relR = R - table1StartRow;
      } else if (R >= table2StartRow && R < table2StartRow + tableHeight) {
        isTable2 = true;
        relR = R - table2StartRow;
      }

      if (relR !== -1) {
        const currentMasterTotals = isTable1 ? table1.rowMasterTotals : table2.rowMasterTotals;
        const startDry = 2;
        const dryInter = startDry + vehicleTypes.length;
        const dryTot = dryInter + 1;
        const frzStart = dryTot + 1;
        const frzInter = frzStart + vehicleTypes.length;
        const frzTot = frzInter + 1;
        const otvRow = frzTot + 1;

        cell.s = { ...BASE_STYLES.center };
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

          if (isTable2 && C > 2) {
            if (typeof cell.v === 'number') {
              cell.t = 'n';
              cell.s.numFmt = '0%';
            }
          }

          if (C <= 2) {
            if (C <= 1) {
              const isMerged = [dryInter, dryTot, frzInter, frzTot, otvRow].includes(relR);
              if (isMerged && C === 0) cell.s.alignment = { ...BASE_STYLES.left.alignment };
              else if (C === 0) cell.s.alignment = { ...BASE_STYLES.center.alignment };
              else cell.s.alignment = { ...BASE_STYLES.left.alignment };
              if (rowFill) cell.s.fill = rowFill;
              cell.s.border = undefined;
            } else {
              cell.s.border = { left: BORDERS.thin, right: BORDERS.medium };
              if (rowFill) cell.s.fill = rowFill;
              cell.s.font = FONT_STYLES.bold;
            }
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
              if (relativeIdx === 2) isTVUCol = true;
              const dateIndex = Math.floor((C - 3) / 3);
              if (dateKeys[dateIndex] && dateKeys[dateIndex].isSunday) isSundayCol = true;
            }

            let finalFill = rowFill;
            const isDetailRow = ![dryInter, dryTot, frzInter, frzTot, otvRow].includes(relR);
            const masterTotal = currentMasterTotals[relR] || 0;
            const val = cell.v;

            if (isTable1) {
              if (isDetailRow && masterTotal > 0) {
                const baseIdx = C - ((C - 3) % 3);
                const tmsVal = ws[XLSX.utils.encode_cell({ r: R, c: baseIdx })]?.v || 0;
                const manualVal = ws[XLSX.utils.encode_cell({ r: R, c: baseIdx + 1 })]?.v || 0;

                if (isTMSCol && val > masterTotal) finalFill = FILL_STYLES.alertRed;
                else if (!isTMSCol && !isTVUCol && tmsVal + manualVal > masterTotal)
                  finalFill = FILL_STYLES.alertRed;
                else if (isTVUCol && val > masterTotal) finalFill = FILL_STYLES.alertRed;
              }
              if (isSundayCol && finalFill !== FILL_STYLES.alertRed) finalFill = FILL_STYLES.red;
            } else {
              if (isSundayCol) finalFill = FILL_STYLES.red;
              else if ((isTMSCol || isTVUCol) && typeof val === 'number' && val > 0) {
                if (val > 1) finalFill = FILL_STYLES.alertRed;
                else if (val >= 0.75)
                  finalFill = { patternType: 'solid', fgColor: { rgb: 'B7E1CD' } };
                else if (val >= 0.5)
                  finalFill = { patternType: 'solid', fgColor: { rgb: 'F1C232' } };
                else finalFill = { patternType: 'solid', fgColor: { rgb: 'F4CCCC' } };
              }
            }
            if (finalFill) cell.s.fill = finalFill;
            if (
              (isTable2 || finalFill === FILL_STYLES.alertRed) &&
              finalFill === FILL_STYLES.alertRed
            ) {
              cell.s.font = FONT_STYLES.whiteBold;
            }
          }
          if ([dryInter, dryTot, frzInter, frzTot, otvRow].includes(relR)) {
            cell.s.font = FONT_STYLES.bold;
          }
        }
      }
    }
  }

  const cols = [{ wch: 15 }, { wch: 25 }, { wch: 8 }];
  for (let i = 0; i < dateKeys.length * 3; i++) cols.push({ wch: 8 });
  ws['!cols'] = cols;

  XLSX.utils.book_append_sheet(wb, ws, translate('summary.tabs.truck_usage.title'));
}
