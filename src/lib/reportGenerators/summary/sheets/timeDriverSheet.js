import { getCachedHubs, getLocalStorage } from '@/lib/localStorageHandler';
import { isTripInShift } from '@/lib/reportGenerators/helper';
import {
  formatDateWIB,
  getDistance,
  getStorageType,
  isEmpty,
  isPastDate,
  normalizeEmail,
  parseApiDateString,
} from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import { BASE_STYLES, BORDERS, COLORS, FILL_STYLES, FONT_STYLES } from './reportStyles';

function calculateDuration(startObj, finishObj) {
  if (!startObj || !finishObj) return '-';
  let diffMs = finishObj.getTime() - startObj.getTime();
  if (diffMs < 0) diffMs = 0;
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const h = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, '0');
  const m = (totalMinutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

function getDayDifferenceWIB(startObj, finishObj) {
  if (!startObj || !finishObj) return 0;
  const startDateWIB = formatDateWIB(startObj, 'YYYY-MM-DD');
  const finishDateWIB = formatDateWIB(finishObj, 'YYYY-MM-DD');
  if (startDateWIB === finishDateWIB) return 0;
  const s = new Date(startDateWIB);
  const f = new Date(finishDateWIB);
  const diffTime = Math.abs(f - s);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function calculateTimeDriverData(
  driverData,
  locationHistoryData,
  startDateStr,
  endDateStr,
  localeCode,
  tasks = [],
  results = []
) {
  const driverMap = new Map();
  const driverEmailsRaw = [];

  if (driverData && Array.isArray(driverData)) {
    driverData.forEach((d) => {
      const plat = d.plat || '';
      if (!plat || isEmpty(plat.trim()) || plat.toUpperCase().includes('DEMO')) return;
      const email = normalizeEmail(d.email);
      if (email && !driverMap.has(email)) {
        driverMap.set(email, {
          name: d.name,
          plat: plat,
          type: getStorageType(d),
          workingTime: d.workingTime,
        });
        driverEmailsRaw.push(email);
      }
    });
  }
  const dateKeys = [];
  const currentIterDate = new Date(startDateStr);
  const endDateObj = new Date(endDateStr);
  while (currentIterDate <= endDateObj) {
    const dateStr = formatDateWIB(currentIterDate, 'YYYY-MM-DD');
    const dayNum = currentIterDate.getDate();
    const monthName = currentIterDate.toLocaleDateString(localeCode, {
      month: 'long',
    });
    const yearShort = currentIterDate.toLocaleDateString(localeCode, {
      year: '2-digit',
    });
    dateKeys.push({ str: dateStr, display: `${dayNum}-${monthName} ${yearShort}` });
    currentIterDate.setDate(currentIterDate.getDate() + 1);
  }

  const dataMatrix = {};
  dateKeys.forEach((d) => {
    dataMatrix[d.str] = {};
  });

  const activeDriverDates = new Set();
  let hasCrossReferenceData = false;

  if (Array.isArray(tasks) && tasks.length > 0) {
    hasCrossReferenceData = true;
    tasks.forEach((t) => {
      const rawEmail =
        t.doneBy ||
        (t.assignedTo && t.assignedTo.email) ||
        (Array.isArray(t.assignee) ? t.assignee[0] : t.assignee);
      const email = normalizeEmail(rawEmail);
      const dateObj = parseApiDateString(t.startTime || t.doneTime);
      if (email && dateObj) {
        activeDriverDates.add(`${email}_${formatDateWIB(dateObj, 'YYYY-MM-DD')}`);
      }
    });
  }

  if (Array.isArray(results) && results.length > 0) {
    hasCrossReferenceData = true;
    results.forEach((res) => {
      const dateObj = parseApiDateString(res.createdTime);
      if (!dateObj) return;
      const dateStr = formatDateWIB(dateObj, 'YYYY-MM-DD');
      (res.result?.routing || []).forEach((vehicle) => {
        const email = normalizeEmail(vehicle.assignee);
        if (email) activeDriverDates.add(`${email}_${dateStr}`);
      });
    });
  }

  if (locationHistoryData && Array.isArray(locationHistoryData)) {
    locationHistoryData.forEach((item) => {
      const email = normalizeEmail(item.email);
      if (!email || !driverMap.has(email)) return;

      const startObj = parseApiDateString(item.startTime);
      if (!startObj) return;
      const dateKey = formatDateWIB(startObj, 'YYYY-MM-DD');

      if (hasCrossReferenceData && dateKey) {
        if (!activeDriverDates.has(`${email}_${dateKey}`)) {
          return;
        }
      }

      const driverInfo = driverMap.get(email);
      if (!isTripInShift(item.startTime, item.finish?.finishTime, driverInfo.workingTime)) {
        return;
      }

      const trackedTime = Math.abs(item.trackedTime || 0);
      const totalDistance = item.finish ? item.finish.totalDistance || 0 : 0;

      if (trackedTime < 10) return;
      if (totalDistance <= 5) return;

      const finishObj = item.finish ? parseApiDateString(item.finish.finishTime) : null;

      if (dateKey && dataMatrix[dateKey]) {
        const startStr = formatDateWIB(startObj, 'HH:mm');
        const finishStr = formatDateWIB(finishObj, 'HH:mm');
        let durationStr = '-';
        let dayDiff = 0;
        if (startObj && finishObj) {
          durationStr = calculateDuration(startObj, finishObj);
          dayDiff = getDayDifferenceWIB(startObj, finishObj);
        }
        const storedHubs = getCachedHubs();
        const { storedLocationName } = getLocalStorage();
        const activeHubLocation = storedHubs.find((h) => h.name === storedLocationName);
        const hubLat = activeHubLocation?.lat || 0;
        const hubLon = activeHubLocation?.lng || 0;
        const RADIUS_THRESHOLD = 500;

        const entry = {
          startTimeISO: item.startTime,
          finishTimeISO: item.finish?.finishTime,
          startDisplay: startStr,
          finishDisplay: finishStr,
          durationDisplay: durationStr,
          dayDiff: dayDiff,
          hasData: true,
          distance: totalDistance,
          trackedTime: trackedTime,
          startLat: item.lat,
          startLon: item.lon,
          finishLat: item.finish?.lat,
          finishLon: item.finish?.lon,
          isStartOutRadius:
            item.lat && item.lon
              ? getDistance(item.lat, item.lon, hubLat, hubLon) > RADIUS_THRESHOLD
              : false,

          isFinishOutRadius:
            item.finish?.lat && item.finish?.lon
              ? getDistance(item.finish.lat, item.finish.lon, hubLat, hubLon) > RADIUS_THRESHOLD
              : false,
        };
        if (!dataMatrix[dateKey][email]) {
          dataMatrix[dateKey][email] = {
            ...entry,
            entries: [entry],
          };
        } else {
          const currentData = dataMatrix[dateKey][email];
          currentData.entries.push(entry);

          currentData.entries.sort((a, b) => {
            const dA = new Date(a.startTimeISO || 0);
            const dB = new Date(b.startTimeISO || 0);
            return dA - dB;
          });

          const latestEntry = currentData.entries[currentData.entries.length - 1];
          Object.assign(currentData, latestEntry);
        }
      }
    });
  }

  const driverEmails = [...driverEmailsRaw];

  const getGroupPriority = (plat) => {
    const p = (plat || '').toUpperCase();
    if (p.includes('DM')) return 3;
    if (p.includes('SEWA')) return 2;
    return 1;
  };

  driverEmails.sort((a, b) => {
    const driverA = driverMap.get(a);
    const driverB = driverMap.get(b);
    const prioA = getGroupPriority(driverA.plat);
    const prioB = getGroupPriority(driverB.plat);
    if (prioA !== prioB) return prioA - prioB;
    return (driverA.name || '').localeCompare(driverB.name || '');
  });

  return { driverMap, driverEmails, dateKeys, dataMatrix };
}

export function generateTimeDriverSheet(
  wb,
  driverData,
  locationHistoryData,
  startDateStr,
  endDateStr,
  translate,
  localeCode,
  tasks = [],
  results = []
) {
  const { driverMap, driverEmails, dateKeys, dataMatrix } = calculateTimeDriverData(
    driverData,
    locationHistoryData,
    startDateStr,
    endDateStr,
    localeCode,
    tasks,
    results
  );

  const isDayEmpty = (dateStr) => {
    if (!dataMatrix || !dataMatrix[dateStr]) return true;
    return driverEmails.every((email) => {
      const metrics = dataMatrix[dateStr][email];
      return !metrics || !metrics.hasData;
    });
  };

  const headerStyle = { ...BASE_STYLES.center, font: FONT_STYLES.bold, border: BORDERS.thin };
  const dataStyle = {
    ...BASE_STYLES.center,
    font: { name: 'Calibri', sz: 11 },
    alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
  };

  const row1 = [
    translate('common.storage_type'),
    translate('common.license_number'),
    translate('common.driver'),
  ];
  const row2 = ['', '', ''];
  dateKeys.forEach((d) => {
    row1.push(d.display, '', '');
    row2.push(
      translate('common.start_time'),
      translate('common.finish_time'),
      translate('summary.tabs.time_driver.duration')
    );
  });
  const excelData = [row1, row2];

  driverEmails.forEach((email, rowIndex) => {
    const driver = driverMap.get(email);
    const row = [driver.type, driver.plat, driver.name];
    dateKeys.forEach((d) => {
      const metrics = dataMatrix[d.str][email];
      const isSun = new Date(d.str).getDay() === 0;
      const dayIsEmpty = isDayEmpty(d.str);
      const isPast = isPastDate(d.str);
      const isDynamic = !isSun && isPast && dayIsEmpty;
      const isHoliday = isSun || isDynamic;

      if (isHoliday) {
        if (rowIndex === 0) {
          const text = isSun ? translate('common.holiday_sunday') : translate('common.holiday');
          row.push(text, null, null);
        } else {
          row.push(null, null, null);
        }
      } else if (metrics && metrics.hasData) {
        if (metrics.entries && metrics.entries.length > 1) {
          const startText = metrics.entries.map((e) => e.startDisplay).join('\n');
          const finishText = metrics.entries
            .map((e) => {
              let f = e.finishDisplay;
              if (e.dayDiff > 0) f += ` (+${e.dayDiff})`;
              return f;
            })
            .join('\n');
          const durationText = metrics.entries.map((e) => e.durationDisplay).join('\n');

          row.push(startText, finishText, durationText);
        } else {
          let finishText = metrics.finishDisplay;
          if (metrics.dayDiff > 0) finishText += ` (+${metrics.dayDiff})`;
          row.push(metrics.startDisplay, finishText, metrics.durationDisplay);
        }
      } else {
        row.push(null, null, null);
      }
    });
    excelData.push(row);
  });

  excelData.push([]);
  excelData.push([translate('summary.tabs.truck_detail.color_exp')]);
  excelData.push(['', translate('summary.tabs.time_driver.out_radius')]);

  const ws = XLSX.utils.aoa_to_sheet(excelData);
  const merges = [];
  merges.push({ s: { r: 0, c: 0 }, e: { r: 1, c: 0 } });
  merges.push({ s: { r: 0, c: 1 }, e: { r: 1, c: 1 } });
  merges.push({ s: { r: 0, c: 2 }, e: { r: 1, c: 2 } });
  let colIdx = 3;
  dateKeys.forEach((d) => {
    merges.push({ s: { r: 0, c: colIdx }, e: { r: 0, c: colIdx + 2 } });
    const isSun = new Date(d.str).getDay() === 0;
    const dayIsEmpty = isDayEmpty(d.str);
    const isPast = isPastDate(d.str);
    const isDynamic = !isSun && isPast && dayIsEmpty;
    const isHoliday = isSun || isDynamic;

    if (isHoliday && driverEmails.length > 0) {
      merges.push({
        s: { r: 2, c: colIdx },
        e: { r: 2 + driverEmails.length - 1, c: colIdx + 2 },
      });
    }
    colIdx += 3;
  });

  const legendRowIdx = excelData.length - 1;
  merges.push({ s: { r: legendRowIdx, c: 1 }, e: { r: legendRowIdx, c: 5 } });
  ws['!merges'] = merges;

  const range = XLSX.utils.decode_range(ws['!ref']);

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
      const cell = ws[cellRef];
      const totalRows = excelData.length;
      if (R >= totalRows - 3) {
        if (R === totalRows - 2 && C === 0) {
          cell.s = { font: { bold: true, underline: true, name: 'Calibri', sz: 11 } };
        } else if (R === totalRows - 1) {
          if (C === 0) {
            cell.s = {
              fill: { patternType: 'solid', fgColor: { rgb: 'FFC7CE' } },
              border: BORDERS.thin,
            };
          } else if (C === 1) {
            cell.s = {
              alignment: { horizontal: 'left', vertical: 'center' },
              font: { name: 'Calibri', sz: 11 },
            };
          }
        }
        continue;
      }

      let cellFill = null;
      let fontStyle = dataStyle.font;
      let customAlignment = null;

      if (C <= 2) {
        if (R === 0 || R === 1) cellFill = { patternType: 'solid', fgColor: COLORS.dry };
      } else {
        const dateIdx = Math.floor((C - 3) / 3);

        if (dateKeys[dateIdx]) {
          const dateStr = dateKeys[dateIdx].str;
          const [y, m, day] = dateStr.split('-').map(Number);
          const safeDate = new Date(y, m - 1, day);

          const isSun = safeDate.getDay() === 0;
          const isDynamic = !isSun && isPastDate(dateStr) && isDayEmpty(dateStr);

          if (isSun || isDynamic) {
            cellFill = FILL_STYLES.red;
            if (R === 2 && (C - 3) % 3 === 0) {
              cell.t = 's';
              customAlignment = { horizontal: 'center', vertical: 'center' };
              fontStyle = { ...FONT_STYLES.bold, color: { rgb: '9C0006' } };
            }
          } else {
            if (R === 0) cellFill = { patternType: 'solid', fgColor: COLORS.frozen };
            if (R === 1) cellFill = { patternType: 'solid', fgColor: COLORS.dry };
          }

          if (R >= 2) {
            const driverIdx = R - 2;
            const driverEmail = driverEmails[driverIdx];

            if (driverEmail && dateStr) {
              const mData = dataMatrix[dateStr][driverEmail];
              if (mData && mData.hasData) {
                const relIdx = (C - 3) % 3;
                if (relIdx === 0 && mData.entries.some((e) => e.isStartOutRadius)) {
                  cellFill = { patternType: 'solid', fgColor: { rgb: 'FFC7CE' } };
                  fontStyle = { ...fontStyle };
                } else if (relIdx === 1 && mData.entries.some((e) => e.isFinishOutRadius)) {
                  cellFill = { patternType: 'solid', fgColor: { rgb: 'FFC7CE' } };
                  fontStyle = { ...fontStyle };
                }

                if (relIdx === 1 && mData.entries.some((e) => e.dayDiff > 0)) {
                  fontStyle = { ...fontStyle, color: { rgb: 'FF0000' }, bold: true };
                }

                if (mData.entries && mData.entries.length > 1) {
                  cellFill = { patternType: 'solid', fgColor: { rgb: 'FF0000' } };
                  fontStyle = { ...fontStyle, color: { rgb: 'FFFFFF' }, bold: true };
                }
              }
            }
          }
        }
      }

      if (R === 0 || R === 1) {
        cell.s = { ...headerStyle };
        if (cellFill) cell.s.fill = cellFill;
        if (C === 2) cell.s.border = { ...BORDERS.thin, right: BORDERS.medium };
        else if (C > 2 && (C - 2) % 3 === 0)
          cell.s.border = { ...BORDERS.thin, right: BORDERS.medium };
      } else {
        cell.s = { ...dataStyle, font: fontStyle };
        if (cellFill) cell.s.fill = cellFill;
        if (customAlignment) {
          cell.s.alignment = customAlignment;
        } else if (C <= 2) {
          cell.s.alignment = { horizontal: 'left', vertical: 'center', indent: 1 };
        } else if (C <= 2) cell.s.alignment = { horizontal: 'left', vertical: 'center', indent: 1 };

        let borderLeft = { style: 'none' };
        let borderRight = { style: 'none' };
        const borderTop = { style: 'none' };
        const borderBottom = { style: 'none' };
        if (C <= 2) {
          borderLeft = { style: 'thin' };
          borderRight = { style: 'thin' };
          if (C === 2) borderRight = BORDERS.medium;
        } else {
          const relIdx = (C - 3) % 3;
          if (relIdx === 0) borderLeft = BORDERS.medium;
          if (relIdx === 2) borderRight = BORDERS.medium;
        }
        cell.s.border = {
          top: borderTop,
          bottom: borderBottom,
          left: borderLeft,
          right: borderRight,
        };
      }
    }
  }
  const cols = [{ wch: 12 }, { wch: 15 }, { wch: 30 }];
  for (let i = 0; i < dateKeys.length * 3; i++) cols.push({ wch: 10 });
  ws['!cols'] = cols;
  XLSX.utils.book_append_sheet(wb, ws, translate('summary.tabs.time_driver.title'));
}
