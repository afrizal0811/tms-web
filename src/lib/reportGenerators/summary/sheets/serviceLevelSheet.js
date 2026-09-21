import { formatDateUniversal, formatUTC7, isPastDate } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import { BASE_STYLES, BORDERS, COLORS, FONT_STYLES, HEADER_STYLES } from './reportStyles';

export function generateServiceLevelSheet(wb, tasks, startDateStr, endDateStr, translate) {
  const dateMap = {};
  const dateKeys = [];
  const [sy, sm, sd] = startDateStr.split('-').map(Number);
  const [ey, em, ed] = endDateStr.split('-').map(Number);
  const curr = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);

  while (curr <= end) {
    const dStr = formatDateUniversal(curr, 'YYYY-MM-DD');
    const isSunday = curr.getDay() === 0;
    dateKeys.push({ str: dStr, isSunday });
    dateMap[dStr] = {
      displayDate: formatDateUniversal(curr, 'DD-MM-YYYY'),
      Dry: {},
      Frozen: {},
      dryTotal: 0,
      frozenTotal: 0,
    };
    curr.setDate(curr.getDate() + 1);
  }

  let maxDay = 7;

  (tasks || []).forEach((t) => {
    if (t.status !== 'DONE' || !t.createdTime || !t.doneTime) return;

    const createdWib = formatUTC7(t.createdTime, 'YYYY-MM-DD');
    const doneWib = formatUTC7(t.doneTime, 'YYYY-MM-DD');

    if (!dateMap[doneWib]) return;

    const [cy, cm, cd] = createdWib.split('-').map(Number);
    const [dy, dmNum, dd] = doneWib.split('-').map(Number);
    const cDate = new Date(cy, cm - 1, cd);
    const dDate = new Date(dy, dmNum - 1, dd);
    const rawDiff = Math.round((dDate - cDate) / (1000 * 60 * 60 * 24));
    const diffDays = rawDiff <= 0 ? 1 : rawDiff;

    if (diffDays > maxDay) maxDay = diffDays;

    const storageType = (t.typeStorage || '').toUpperCase().includes('FROZEN') ? 'Frozen' : 'Dry';

    const dayObj = dateMap[doneWib];
    dayObj[storageType][diffDays] = (dayObj[storageType][diffDays] || 0) + 1;
    if (storageType === 'Dry') dayObj.dryTotal += 1;
    else dayObj.frozenTotal += 1;
  });

  dateKeys.forEach((k) => {
    const dm = dateMap[k.str];
    const isZero = dm.dryTotal === 0 && dm.frozenTotal === 0;
    k.isPast = isPastDate(k.str);
    k.isDynamicHoliday = !k.isSunday && k.isPast && isZero;
    k.isHoliday = k.isSunday || k.isDynamicHoliday;
  });

  const daysList = [];
  for (let i = 1; i <= maxDay; i++) daysList.push(i);

  const summaryDataRows = daysList.map((dayNum) => {
    let dryCount = 0;
    let frozenCount = 0;

    dateKeys.forEach((d) => {
      if (!d.isHoliday) {
        const dm = dateMap[d.str];
        if (dm && dm.Dry[dayNum]) dryCount += dm.Dry[dayNum];
        if (dm && dm.Frozen[dayNum]) frozenCount += dm.Frozen[dayNum];
      }
    });

    return { dayNum, dryCount, frozenCount };
  });

  const totalDrySummary = summaryDataRows.reduce((acc, curr) => acc + curr.dryCount, 0);
  const totalFrozenSummary = summaryDataRows.reduce((acc, curr) => acc + curr.frozenCount, 0);

  const excelData = [];
  const merges = [];

  excelData.push([translate('summary.tabs.service_level.summary_tab'), '', '', '', '']);
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } });

  const sumStartR = excelData.length;
  excelData.push([translate('common.day'), 'DRY', '', 'FROZEN', '']);
  excelData.push(['', translate('common.task'), '%', translate('common.task'), '%']);

  merges.push({ s: { r: sumStartR, c: 0 }, e: { r: sumStartR + 1, c: 0 } });
  merges.push({ s: { r: sumStartR, c: 1 }, e: { r: sumStartR, c: 2 } });
  merges.push({ s: { r: sumStartR, c: 3 }, e: { r: sumStartR, c: 4 } });

  summaryDataRows.forEach((row) => {
    const dryPct = totalDrySummary > 0 ? row.dryCount / totalDrySummary : 0;
    const frzPct = totalFrozenSummary > 0 ? row.frozenCount / totalFrozenSummary : 0;

    excelData.push([
      row.dayNum,
      row.dryCount || null,
      row.dryCount > 0 ? dryPct : null,
      row.frozenCount || null,
      row.frozenCount > 0 ? frzPct : null,
    ]);
  });

  const sumTotalR = excelData.length;
  excelData.push(['Total', totalDrySummary || 0, null, totalFrozenSummary || 0, null]);
  merges.push({ s: { r: sumTotalR, c: 1 }, e: { r: sumTotalR, c: 2 } });
  merges.push({ s: { r: sumTotalR, c: 3 }, e: { r: sumTotalR, c: 4 } });

  excelData.push([]);

  const detTitleR = excelData.length;
  excelData.push([translate('summary.tabs.service_level.detail_tab'), '', '', '', '']);
  merges.push({ s: { r: detTitleR, c: 0 }, e: { r: detTitleR, c: 4 } });

  const detStartR = excelData.length;

  const row1 = [translate('common.day')];
  dateKeys.forEach((d) => {
    row1.push(dateMap[d.str].displayDate, '', '', '');
  });
  excelData.push(row1);

  const row2 = [''];
  dateKeys.forEach(() => {
    row2.push('DRY', '', 'FROZEN', '');
  });
  excelData.push(row2);

  const row3 = [''];
  dateKeys.forEach(() => {
    row3.push('Task', '%', 'Task', '%');
  });
  excelData.push(row3);

  merges.push({ s: { r: detStartR, c: 0 }, e: { r: detStartR + 2, c: 0 } });

  let colIdx = 1;
  const totalRowsCount = daysList.length + 1;

  dateKeys.forEach((d) => {
    if (d.isHoliday) {
      merges.push({ s: { r: detStartR, c: colIdx }, e: { r: detStartR + 2, c: colIdx + 3 } });
      merges.push({
        s: { r: detStartR + 3, c: colIdx },
        e: { r: detStartR + 3 + totalRowsCount - 1, c: colIdx + 3 },
      });
    } else {
      merges.push({ s: { r: detStartR, c: colIdx }, e: { r: detStartR, c: colIdx + 3 } });
      merges.push({ s: { r: detStartR + 1, c: colIdx }, e: { r: detStartR + 1, c: colIdx + 1 } });
      merges.push({
        s: { r: detStartR + 1, c: colIdx + 2 },
        e: { r: detStartR + 1, c: colIdx + 3 },
      });
    }
    colIdx += 4;
  });

  daysList.forEach((dayNum, rIdx) => {
    const row = [dayNum];
    dateKeys.forEach((d) => {
      if (d.isHoliday) {
        if (rIdx === 0) {
          const text = d.isSunday
            ? translate('common.holiday_sunday')
            : translate('common.holiday');
          row.push(text, null, null, null);
        } else {
          row.push(null, null, null, null);
        }
      } else {
        const dm = dateMap[d.str];
        const dryCount = dm.Dry[dayNum] || 0;
        const dryPct = dm.dryTotal > 0 ? dryCount / dm.dryTotal : 0;
        const frzCount = dm.Frozen[dayNum] || 0;
        const frzPct = dm.frozenTotal > 0 ? frzCount / dm.frozenTotal : 0;

        row.push(
          dryCount > 0 ? dryCount : null,
          dryCount > 0 ? dryPct : null,
          frzCount > 0 ? frzCount : null,
          frzCount > 0 ? frzPct : null
        );
      }
    });
    excelData.push(row);
  });

  const detTotalR = excelData.length;
  const totalRow = ['Total'];
  let totalColIdx = 1;

  dateKeys.forEach((d) => {
    if (d.isHoliday) {
      totalRow.push(null, null, null, null);
    } else {
      const dm = dateMap[d.str];
      totalRow.push(dm.dryTotal || 0, null, dm.frozenTotal || 0, null);
      merges.push({
        s: { r: detTotalR, c: totalColIdx },
        e: { r: detTotalR, c: totalColIdx + 1 },
      });
      merges.push({
        s: { r: detTotalR, c: totalColIdx + 2 },
        e: { r: detTotalR, c: totalColIdx + 3 },
      });
    }
    totalColIdx += 4;
  });
  excelData.push(totalRow);

  const ws = XLSX.utils.aoa_to_sheet(excelData);
  ws['!merges'] = merges;
  ws['!views'] = [{ state: 'frozen', xSplit: 1, ySplit: detStartR + 3 }];

  const cols = [{ wch: 14 }];
  for (let i = 0; i < dateKeys.length * 4; i++) cols.push({ wch: 8 });
  ws['!cols'] = cols;

  const range = XLSX.utils.decode_range(ws['!ref']);

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
      const cell = ws[cellRef];

      if (R === 0 || R === detTitleR) {
        cell.s = { font: { bold: true }, alignment: { horizontal: 'left', vertical: 'center' } };
        continue;
      }

      if (R >= sumStartR && R <= sumTotalR) {
        if (C > 4) {
          cell.v = '';
          cell.s = {};
          continue;
        }

        if (R === sumStartR || R === sumStartR + 1) {
          cell.s = { ...HEADER_STYLES.main, border: BORDERS.thin };
          if (C === 0) cell.s.fill = { patternType: 'solid', fgColor: COLORS.header };
          if (C === 1 || C === 2) cell.s.fill = { patternType: 'solid', fgColor: COLORS.dry };
          if (C === 3 || C === 4) cell.s.fill = { patternType: 'solid', fgColor: COLORS.frozen };
        } else if (R === sumTotalR) {
          cell.s = { ...BASE_STYLES.center, font: { bold: true }, border: BORDERS.thin };
          cell.s.fill = { patternType: 'solid', fgColor: { rgb: 'D9F2D0' } };
          if (C === 0) cell.s.alignment = { horizontal: 'center', vertical: 'center' };
        } else {
          cell.s = { ...BASE_STYLES.center, border: BORDERS.thin };
          if (C === 0) {
            cell.s.alignment = { horizontal: 'center', vertical: 'center' };
            cell.s.fill = { patternType: 'solid', fgColor: COLORS.header };
            cell.s.font = FONT_STYLES.bold;
          }
          if (C === 2 || C === 4) {
            cell.t = 'n';
            cell.s.numFmt = '0.00%';
          }
        }
        continue;
      }

      if (R >= detStartR) {
        if (R <= detStartR + 2) {
          cell.s = { ...HEADER_STYLES.main, border: BORDERS.thin };
          if (C === 0) {
            cell.s.fill = { patternType: 'solid', fgColor: COLORS.header };
            cell.s.border.right = BORDERS.medium;
          } else {
            const dateIdx = Math.floor((C - 1) / 4);
            const isHol = dateKeys[dateIdx]?.isHoliday;
            const relIdx = (C - 1) % 4;

            if (isHol) {
              cell.s.fill = { patternType: 'solid', fgColor: { rgb: 'FFC7CE' } };
              cell.s.font = { ...FONT_STYLES.bold, color: { rgb: '000000' } };
            } else {
              if (R === detStartR) {
                cell.s.fill = { patternType: 'solid', fgColor: COLORS.header };
              } else if (R >= detStartR + 1) {
                if (relIdx < 2) cell.s.fill = { patternType: 'solid', fgColor: COLORS.dry };
                else cell.s.fill = { patternType: 'solid', fgColor: COLORS.frozen };
              }
            }
            if (relIdx === 3) cell.s.border.right = BORDERS.medium;
          }
        } else {
          cell.s = { ...BASE_STYLES.center, border: BORDERS.thin };

          if (C === 0) {
            cell.s.alignment = { horizontal: 'center', vertical: 'center' };
            cell.s.font = FONT_STYLES.bold;
            cell.s.border.right = BORDERS.medium;
            cell.s.fill = { patternType: 'solid', fgColor: COLORS.header };
            if (R === detTotalR) cell.s.fill = { patternType: 'solid', fgColor: { rgb: 'D9F2D0' } };
          } else {
            const dateIdx = Math.floor((C - 1) / 4);
            const isHol = dateKeys[dateIdx]?.isHoliday;
            const relIdx = (C - 1) % 4;

            if (isHol) {
              cell.s.fill = { patternType: 'solid', fgColor: { rgb: 'FFC7CE' } };
              cell.s.font = { ...FONT_STYLES.bold, color: { rgb: '9C0006' } };
            } else {
              if (relIdx === 1 || relIdx === 3) {
                if (typeof cell.v === 'number') {
                  cell.t = 'n';
                  cell.s.numFmt = '0.00%';
                }
              }
              if (R === detTotalR) {
                cell.s.font = FONT_STYLES.bold;
                cell.s.fill = { patternType: 'solid', fgColor: { rgb: 'D9F2D0' } };
              }
            }

            if (relIdx === 3) cell.s.border.right = BORDERS.medium;
          }
        }
      }
    }
  }

  const sheetTitle = translate('summary.tabs.service_level.title');
  XLSX.utils.book_append_sheet(wb, ws, sheetTitle);
}
