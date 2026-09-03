import {
  calculateMinuteDifference,
  formatMinutesToHHMM,
  getBasePlate,
  sortRows,
} from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import { getCleanString, getRawPlate, isValidValue, STYLES } from './shared';

export function buildTimeDriverSheet(wb, timeDataObjects, t, driverData = []) {
  const headers = [
    t('common.license_number'),
    t('common.driver'),
    t('excel.reports.time_driver.start_date'),
    t('common.start_time'),
    t('excel.reports.time_driver.finish_date'),
    t('common.finish_time'),
    t('excel.reports.time_driver.duration'),
    t('common.dist_travel'),
  ];

  const driverPlatLookup = new Map();
  (driverData || []).forEach((d) => {
    const dName = getCleanString(d.name).toLowerCase();
    const dPlat = isValidValue(d.plat) ? d.plat : '';
    if (dName && dPlat && !dPlat.toUpperCase().includes('DEMO')) {
      if (!driverPlatLookup.has(dName)) driverPlatLookup.set(dName, dPlat);
    }
  });

  const cleanedList = [];
  (timeDataObjects || []).forEach((i) => {
    const driver = isValidValue(i.driver) ? i.driver : '';
    if (!driver) return;

    let rawPlat = getRawPlate(i);
    if (!isValidValue(rawPlat)) {
      rawPlat = driverPlatLookup.get(driver.trim().toLowerCase()) || '';
    }

    if (!rawPlat || rawPlat.toUpperCase().includes('DEMO')) return;

    const basePlat = getBasePlate(rawPlat) || rawPlat;
    cleanedList.push({ ...i, driver, plat: rawPlat, basePlat });
  });

  const uniqueEventsMap = new Map();
  cleanedList.forEach((item) => {
    const sTime = item.rawStart || item.startTimeFmt || 'null';
    const fTime = item.rawFinish || item.finishTimeFmt || 'null';
    const exactKey = `${item.driver}_${item.basePlat}_${sTime}_${fTime}`;

    if (!uniqueEventsMap.has(exactKey)) {
      uniqueEventsMap.set(exactKey, { ...item });
    } else {
      const ext = uniqueEventsMap.get(exactKey);
      ext.totalDistance = (Number(ext.totalDistance) || 0) + (Number(item.totalDistance) || 0);
    }
  });

  const uniqueEvents = Array.from(uniqueEventsMap.values());
  const groupCountMap = new Map();
  uniqueEvents.forEach((item) => {
    const groupKey = `${item.driver}_${item.basePlat}`;
    groupCountMap.set(groupKey, (groupCountMap.get(groupKey) || 0) + 1);
  });

  const processedTime = uniqueEvents.map((item) => ({
    ...item,
    isMultiple: (groupCountMap.get(`${item.driver}_${item.basePlat}`) || 0) > 1,
  }));

  const sortTime = sortRows(processedTime, 'plat', 'driver');
  const sheetData = [
    headers,
    ...sortTime.map((i) => {
      const timeDur = calculateMinuteDifference(i.rawStart, i.rawFinish);
      let dur = formatMinutesToHHMM(timeDur, false);
      if (dur === "'-'" || dur === '-' || !dur) dur = null;

      return [
        i.plat,
        i.driver,
        i.startDate,
        i.startTimeFmt,
        i.finishDateFmt,
        i.finishTimeFmt,
        dur,
        i.totalDistance ? Number(i.totalDistance.toFixed(2)) : null,
      ];
    }),
    [],
    ['Note'],
    [' ', t('report.note_diff_date')],
    [' ', t('report.note_double_click')],
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!view'] = { state: 'frozen', ySplit: 1 };
  ws['!cols'] = headers.map((h, i) => ({
    wch: Math.min(
      sheetData.reduce((max, r) => Math.max(max, r[i] ? String(r[i]).length : 0), 0) + 2,
      50
    ),
  }));

  const dataCount = sortTime.length;
  for (let R = 0; R < sheetData.length; ++R) {
    for (let C = 0; C < headers.length; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) continue;

      if (R === 0) {
        ws[cellRef].s = [2, 3, 4, 5, 6].includes(C) ? STYLES.greenHeader : STYLES.header;
      } else if (R <= dataCount) {
        ws[cellRef].s = C <= 1 ? STYLES.left : STYLES.center;
        const rowData = sortTime[R - 1];

        if (rowData?.isMultiple) ws[cellRef].s = { ...ws[cellRef].s, ...STYLES.orangeFill };

        if (
          rowData?.startDate !== rowData?.finishDateFmt &&
          rowData?.startDate &&
          rowData?.finishDateFmt &&
          [2, 4].includes(C)
        ) {
          ws[cellRef].s = { ...ws[cellRef].s, ...STYLES.redFill };
        }
      } else {
        if (R === dataCount + 2 && C === 0) {
          ws[cellRef].s = { font: { color: { rgb: 'FF0000' }, underline: true, bold: true } };
        } else if (R === dataCount + 3) {
          if (C === 0) ws[cellRef].s = STYLES.redFill;
          if (C === 1) ws[cellRef].s = STYLES.left;
        } else if (R === dataCount + 4) {
          if (C === 0) ws[cellRef].s = STYLES.orangeFill;
          if (C === 1) ws[cellRef].s = STYLES.left;
        }
      }
    }
  }
  XLSX.utils.book_append_sheet(wb, ws, t('excel.reports.time_driver.sheet_name'));
}
