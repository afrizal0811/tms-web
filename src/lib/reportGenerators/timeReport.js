'use client';

import {
  calculateDurationAsQuotedHHMM,
  formatDateUniversal,
  formatMinutesToHHMM,
  formatTimestampToDDMMYYYY_UTC7,
  formatTimestampToQuotedHHMM_UTC7,
  isEmpty,
  normalizeEmail,
} from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';

function checkShiftMidpoint(rawStart, rawFinish, shift) {
  if (!shift || !shift.startTime || !shift.endTime) return true;
  if (!rawStart || !rawFinish) return false;

  try {
    const safeStart = rawStart.replace(' ', 'T') + 'Z';
    const safeFinish = rawFinish.replace(' ', 'T') + 'Z';

    const startMs = new Date(safeStart).getTime();
    const finishMs = new Date(safeFinish).getTime();

    if (isNaN(startMs) || isNaN(finishMs)) return false;

    const durationHours = (finishMs - startMs) / (1000 * 60 * 60);
    if (durationHours >= 14) {
      return true;
    }

    const midpointMs = startMs + (finishMs - startMs) / 2;
    const midpointDate = new Date(midpointMs);

    const [sH, sM] = shift.startTime.split(':').map(Number);
    const [eH, eM] = shift.endTime.split(':').map(Number);

    const shiftStart = new Date(midpointDate);
    shiftStart.setUTCHours((sH || 0) - 7, sM || 0, 0, 0);

    const shiftEnd = new Date(midpointDate);
    shiftEnd.setUTCHours((eH || 0) - 7, eM || 0, 0, 0);

    if (shift.multiday === 1 || shiftEnd <= shiftStart) {
      shiftEnd.setUTCDate(shiftEnd.getUTCDate() + 1);
    }

    return midpointMs >= shiftStart.getTime() && midpointMs <= shiftEnd.getTime();
  } catch (e) {
    return true;
  }
}

export function generateTimeSummaryWorkbook(
  driverData,
  allApiData,
  selectedDate,
  selectedLocationName,
  t
) {
  const translate = t || ((key) => key);

  const emailToDriverMap = driverData.reduce((acc, driver) => {
    const normalizedEmail = normalizeEmail(driver.email);
    if (normalizedEmail) {
      acc[normalizedEmail] = {
        plat: driver.plat || null,
        name: driver.name,
        workingTime: driver.workingTime,
      };
    }
    return acc;
  }, {});

  const [y, m, d] = selectedDate.split('-');
  const formattedSelectedDate = `${d}-${m}-${y}`;

  const processedApiData = allApiData.map((item) => {
    const email = normalizeEmail(item.email);
    const driverInfo = emailToDriverMap[email];
    const startTime = item.startTime;
    const finishTime = item.finish?.finishTime;
    const startDate = formatTimestampToDDMMYYYY_UTC7(startTime);

    return {
      email: email,
      trackedTime: Math.abs(item.trackedTime || 0),
      totalDistance: item.finish?.totalDistance || 0,
      emailExists: !!driverInfo,
      startDate: startDate,
      plat: driverInfo?.plat || null,
      driver: driverInfo?.name || email,
      startTimeFormatted: formatTimestampToQuotedHHMM_UTC7(startTime),
      finishDate: formatTimestampToDDMMYYYY_UTC7(finishTime),
      finishTimeFormatted: formatTimestampToQuotedHHMM_UTC7(finishTime),
      duration: calculateDurationAsQuotedHHMM(startTime, finishTime),
      travelTimeVal: item.finish?.totalDuration || 0,
      workingTime: driverInfo?.workingTime || null,

      rawStartTime: startTime,
      rawFinishTime: finishTime,
    };
  });

  const filteredApiData = processedApiData.filter((item) => {
    const criteriaMet = item.trackedTime >= 10 && item.totalDistance > 5;
    const emailExists = item.emailExists;
    const dateMatches = item.startDate === formattedSelectedDate;

    return criteriaMet && emailExists && dateMatches;
  });

  if (isEmpty(filteredApiData))
    return { error: translate('common.toast.error', { err: translate('common.no_data') }) };

  const groupedData = {};
  filteredApiData.forEach((item) => {
    if (!groupedData[item.email]) {
      groupedData[item.email] = [];
    }
    groupedData[item.email].push(item);
  });

  const apiDataMap = new Map();

  for (const [email, records] of Object.entries(groupedData)) {
    if (records.length === 1) {
      apiDataMap.set(email, [{ ...records[0], isMultiple: false }]);
      continue;
    }

    const filteredByShift = records.filter((r) =>
      checkShiftMidpoint(r.rawStartTime, r.rawFinishTime, r.workingTime)
    );

    if (filteredByShift.length === 0) continue;

    filteredByShift.sort((a, b) => {
      const safeA = a.rawStartTime.replace(' ', 'T');
      const safeB = b.rawStartTime.replace(' ', 'T');
      return new Date(safeA) - new Date(safeB);
    });

    const isMultiple = filteredByShift.length > 1;
    apiDataMap.set(
      email,
      filteredByShift.map((r) => ({ ...r, isMultiple }))
    );
  }

  const masterDriverList = driverData.filter((driver) => {
    const plat = driver.plat || '';
    if (isEmpty(plat)) return false;
    if (plat.toUpperCase().includes('DEMO')) return false;
    return true;
  });

  let excelDataObjects = masterDriverList.flatMap((driver) => {
    const normalizedEmail = normalizeEmail(driver.email);
    const apiDataArray = apiDataMap.get(normalizedEmail);

    if (apiDataArray && apiDataArray.length > 0) {
      return apiDataArray.map((apiData) => ({
        ...apiData,
        plat: driver.plat,
        driver: driver.name,
      }));
    } else {
      return [
        {
          plat: driver.plat,
          driver: driver.name,
          startDate: null,
          startTimeFormatted: null,
          finishDate: null,
          finishTimeFormatted: null,
          duration: null,
          travelTimeVal: 0,
          totalDistance: 0,
          isMultiple: false,
        },
      ];
    }
  });

  const getSortGroup = (platStr) => {
    if (!platStr) return 1;
    const platUpper = platStr.toUpperCase();
    if (platUpper.includes('DM')) return 3;
    if (platUpper.includes('SEWA')) return 2;
    return 1;
  };

  excelDataObjects.sort((a, b) => {
    const groupA = getSortGroup(a.plat);
    const groupB = getSortGroup(b.plat);
    if (groupA !== groupB) {
      return groupA - groupB;
    }

    const driverA = a.driver || '';
    const driverB = b.driver || '';
    const driverCompare = driverA.localeCompare(driverB);

    if (driverCompare !== 0) {
      return driverCompare;
    }

    if (a.rawStartTime && b.rawStartTime) {
      const timeA = new Date(a.rawStartTime.replace(' ', 'T')).getTime();
      const timeB = new Date(b.rawStartTime.replace(' ', 'T')).getTime();
      return timeA - timeB;
    }
    return 0;
  });

  const wb = XLSX.utils.book_new();

  const headers = [
    translate('common.license_number'),
    translate('common.driver'),
    translate('excel.time.headers.start_date'),
    translate('common.start_time'),
    translate('excel.time.headers.finish_date'),
    translate('common.finish_time'),
    translate('excel.time.headers.duration'),
    translate('excel.time.headers.travel_time'),
    translate('excel.time.headers.travel_dist'),
  ];

  const finalSheetData = [
    headers,
    ...excelDataObjects.map((item) => {
      let displayTravelTime = null;
      if (item.travelTimeVal && item.travelTimeVal > 0) {
        displayTravelTime = formatMinutesToHHMM(item.travelTimeVal);
      }

      let displayTravelDist = null;
      if (item.totalDistance && item.totalDistance > 0) {
        displayTravelDist = Number(item.totalDistance.toFixed(2));
      }

      return [
        item.plat,
        item.driver,
        item.startDate,
        item.startTimeFormatted,
        item.finishDate,
        item.finishTimeFormatted,
        item.duration,
        displayTravelTime,
        displayTravelDist,
      ];
    }),
    [],
    ['Note'],
    ['', translate('report.note_diff_date')],
    ['', translate('report.note_double_click')],
  ];

  const ws = XLSX.utils.aoa_to_sheet(finalSheetData);

  ws['!view'] = { state: 'frozen', ySplit: 1 };
  const colWidths = headers.map((header, i) => {
    const maxLength = finalSheetData.reduce(
      (max, row) => Math.max(max, row[i] ? String(row[i]).length : 0),
      0
    );
    return { wch: Math.min(maxLength + 2, 50) };
  });
  ws['!cols'] = colWidths;

  const headerStyle = {
    font: { bold: true },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
  const centerStyle = { alignment: { horizontal: 'center', vertical: 'center' } };
  const leftStyle = { alignment: { horizontal: 'left', vertical: 'center' } };
  const greenHeaderStyle = {
    ...centerStyle,
    font: { bold: true },
    fill: { patternType: 'solid', fgColor: { rgb: '84fa92' } },
  };

  const redFillStyle = { fill: { patternType: 'solid', fgColor: { rgb: 'FF9999' } } };
  const yellowFillStyle = { fill: { patternType: 'solid', fgColor: { rgb: 'FFFF99' } } };

  const range = XLSX.utils.decode_range(ws['!ref']);
  const dataCount = excelDataObjects.length;

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) continue;

      if (R === 0) {
        if ([2, 3, 4, 5, 6].includes(C)) {
          ws[cellRef].s = greenHeaderStyle;
        } else {
          ws[cellRef].s = headerStyle;
        }
      } else if (R <= dataCount) {
        const rowData = excelDataObjects[R - 1];
        if (C === 0 || C === 1) {
          ws[cellRef].s = leftStyle;
        } else {
          ws[cellRef].s = centerStyle;
        }

        if (C === 1 && rowData && rowData.isMultiple) {
          ws[cellRef].s = { ...ws[cellRef].s, ...yellowFillStyle };
        }

        if (
          rowData &&
          rowData.startDate !== rowData.finishDate &&
          rowData.startDate &&
          rowData.finishDate
        ) {
          if (C === 2) ws[cellRef].s = { ...ws[cellRef].s, ...redFillStyle };
          if (C === 4) ws[cellRef].s = { ...ws[cellRef].s, ...redFillStyle };
        }
      } else {
        if (R === dataCount + 2 && C === 0) {
          ws[cellRef].s = { font: { color: { rgb: 'FF0000' }, underline: true, bold: true } };
        } else if (R === dataCount + 3) {
          if (C === 0) ws[cellRef].s = redFillStyle;
          if (C === 1) ws[cellRef].s = leftStyle;
        } else if (R === dataCount + 4) {
          if (C === 0) ws[cellRef].s = yellowFillStyle;
          if (C === 1) ws[cellRef].s = leftStyle;
        }
      }
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, translate('excel.time.sheets.start_finish'));

  let dryTime = 0;
  let dryDist = 0;
  let frzTime = 0;
  let frzDist = 0;

  excelDataObjects.forEach((item) => {
    const driverName = (item.driver || '').toUpperCase();
    const tTime = item.travelTimeVal || 0;
    const tDist = item.totalDistance || 0;

    if (driverName.includes('DRY')) {
      dryTime += tTime;
      dryDist += tDist;
    } else if (driverName.includes('FRZ')) {
      frzTime += tTime;
      frzDist += tDist;
    }
  });

  const totalTime = dryTime + frzTime;
  const totalDist = dryDist + frzDist;

  const recapData = [
    [
      translate('excel.time.headers.category'),
      translate('excel.time.headers.travel_time'),
      translate('excel.time.headers.travel_dist'),
    ],
    [translate('excel.time.data.dry'), formatMinutesToHHMM(dryTime), Number(dryDist.toFixed(2))],
    [translate('excel.time.data.frozen'), formatMinutesToHHMM(frzTime), Number(frzDist.toFixed(2))],
    [
      translate('excel.time.data.total'),
      formatMinutesToHHMM(totalTime),
      Number(totalDist.toFixed(2)),
    ],
  ];

  const wsRecap = XLSX.utils.aoa_to_sheet(recapData);
  const recapRange = XLSX.utils.decode_range(wsRecap['!ref']);
  const recapHeaderStyle = {
    font: { bold: true },
    alignment: { horizontal: 'center', vertical: 'center' },
    fill: { patternType: 'solid', fgColor: { rgb: '84fa92' } },
    border: {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    },
  };
  const recapBodyStyle = {
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    },
  };

  wsRecap['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 20 }];

  for (let R = recapRange.s.r; R <= recapRange.e.r; ++R) {
    for (let C = recapRange.s.c; C <= recapRange.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!wsRecap[cellRef]) continue;

      if (R === 0) {
        wsRecap[cellRef].s = recapHeaderStyle;
      } else {
        wsRecap[cellRef].s = recapBodyStyle;
        if (R === 3) {
          wsRecap[cellRef].s = { ...recapBodyStyle, font: { bold: true } };
        }
      }
    }
  }

  XLSX.utils.book_append_sheet(wb, wsRecap, translate('excel.time.sheets.travel_recap'));

  const formattedDate = formatDateUniversal(selectedDate, 'DD.MM.YYYY');
  const excelFileName = `${translate('excel.time.filename')} - ${formattedDate} - ${selectedLocationName}.xlsx`;
  return { wb, excelFileName };
}
