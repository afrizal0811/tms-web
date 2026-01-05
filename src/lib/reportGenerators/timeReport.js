// File: src/features/vehicleData/timeReport.js (sesuaikan path)
'use client';

import {
  calculateDurationAsQuotedHHMM,
  formatMinutesToHHMM,
  formatTimestampToDDMMYYYY_UTC7,
  formatTimestampToQuotedHHMM_UTC7,
  formatYYYYMMDDToDDMMYYYY,
  normalizeEmail,
} from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';

export function generateTimeSummaryWorkbook(
  driverData,
  allApiData,
  selectedDate,
  selectedLocationName,
  t // <--- 1. TERIMA PARAMETER t
) {
  // Fallback translation function
  const translate = t || ((key) => key);

  // 1. Buat Map Driver
  const emailToDriverMap = driverData.reduce((acc, driver) => {
    const normalizedEmail = normalizeEmail(driver.email);
    if (normalizedEmail) {
      acc[normalizedEmail] = { plat: driver.plat || null, name: driver.name };
    }
    return acc;
  }, {});

  // 2. Ubah 'selectedDate' (YYYY-MM-DD) ke format DD-MM-YYYY
  const [y, m, d] = selectedDate.split('-');
  const formattedSelectedDate = `${d}-${m}-${y}`;

  // 3. Proses Data API dan Filter
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
    };
  });

  const filteredApiData = processedApiData.filter((item) => {
    const criteriaMet = item.trackedTime >= 10 && item.totalDistance > 5;
    const emailExists = item.emailExists;
    const dateMatches = item.startDate === formattedSelectedDate;
    return criteriaMet && emailExists && dateMatches;
  });

  if (filteredApiData.length === 0)
    return { error: 'Tidak ada data Start/Finish untuk tanggal ini.' }; // Error string ini bisa ditangani di UI level untuk translate

  const apiDataMap = filteredApiData.reduce((acc, item) => {
    if (item.email) {
      acc.set(item.email, item);
    }
    return acc;
  }, new Map());

  // 4. Filter Master List
  const masterDriverList = driverData.filter((driver) => {
    const plat = driver.plat || '';
    if (plat === '') return false;
    if (plat.toUpperCase().includes('DEMO')) return false;
    return true;
  });

  // 5. Buat data Excel Object untuk Sheet 1
  let excelDataObjects = masterDriverList.map((driver) => {
    const normalizedEmail = normalizeEmail(driver.email);
    const apiData = apiDataMap.get(normalizedEmail);
    if (apiData) {
      return apiData;
    } else {
      return {
        plat: driver.plat,
        driver: driver.name,
        startDate: null,
        startTimeFormatted: null,
        finishDate: null,
        finishTimeFormatted: null,
        duration: null,
        travelTimeVal: 0,
        totalDistance: 0,
      };
    }
  });

  // 6. Sorting Sheet 1
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
    return (a.driver || '').localeCompare(b.driver || '');
  });

  // 7. Proses Sheet 1: Start-Finish Summary
  const wb = XLSX.utils.book_new();

  // TRANSLATE HEADERS
  const headers = [
    translate('excel.time.headers.plate'),
    translate('excel.time.headers.driver'),
    translate('excel.time.headers.start_date'),
    translate('excel.time.headers.start_time'),
    translate('excel.time.headers.finish_date'),
    translate('excel.time.headers.finish_time'),
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
  ];
  const ws = XLSX.utils.aoa_to_sheet(finalSheetData);

  // 8. Styling Sheet 1
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
  const redFillStyle = { fill: { patternType: 'solid', fgColor: { rgb: 'FF0000' } } };
  const greenHeaderStyle = {
    ...centerStyle,
    font: { bold: true },
    fill: { patternType: 'solid', fgColor: { rgb: '84fa92' } },
  };
  const range = XLSX.utils.decode_range(ws['!ref']);

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
      } else {
        const rowData = excelDataObjects[R - 1];
        if (C === 0 || C === 1) {
          ws[cellRef].s = leftStyle;
        } else {
          ws[cellRef].s = centerStyle;
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
      }
    }
  }

  // TRANSLATE SHEET NAME
  XLSX.utils.book_append_sheet(wb, ws, translate('excel.time.sheets.start_finish'));

  // --- 9. LOGIC BARU: Sheet 2 - Travel Recap ---

  let dryTime = 0;
  let dryDist = 0;
  let frzTime = 0;
  let frzDist = 0;

  excelDataObjects.forEach((item) => {
    // Logic deteksi DRY/FRZ tetap menggunakan string internal (jangan di-translate)
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

  // TRANSLATE DATA ROWS SHEET 2
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

  // Styling Sheet 2
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

  // TRANSLATE SHEET NAME
  XLSX.utils.book_append_sheet(wb, wsRecap, translate('excel.time.sheets.travel_recap'));

  // 10. Kembalikan Hasil & TRANSLATE FILENAME
  const formattedDate = formatYYYYMMDDToDDMMYYYY(selectedDate);
  const excelFileName = `${translate('excel.time.filename')} - ${formattedDate} - ${selectedLocationName}.xlsx`;
  return { wb, excelFileName };
}
