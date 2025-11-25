// File: lib/reportGenerators/rangkumanSheets/pendingReasonSheet.js
import * as XLSX from 'xlsx-js-style';

const LOCATIONS_SHOW_PENDING_GR = ['Cikarang', 'Daan Mogot'];

// --- CONSTANTS & HELPERS ---
const TARGET_STATUSES = ['BATAL', 'TERIMA SEBAGIAN', 'PENDING', 'PENDING GR'];

function normalizeEmail(email) {
  return email ? email.toLowerCase().trim() : '';
}

function parseApiDateString(dateStr) {
  if (!dateStr) return null;
  let isoStr = dateStr.toString().replace(' ', 'T');
  if (!isoStr.endsWith('Z') && !isoStr.includes('+')) {
    isoStr += 'Z';
  }
  const d = new Date(isoStr);
  return isNaN(d.getTime()) ? null : d;
}

function formatSimpleTimeString(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  return timeStr.substring(0, 5);
}

function formatDateDDMMYYYY(dateObj) {
  if (!dateObj) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
    .format(dateObj)
    .split('/')
    .join('-');
}

function formatTimeHHMM(dateObj) {
  if (!dateObj) return null;
  return dateObj.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta',
  });
}

function getCustomerID(customerName) {
  if (!customerName) return '-';
  const parts = customerName.split('-');
  if (parts.length >= 2) {
    const potentialId = parts[1].trim();
    if (potentialId.toUpperCase().startsWith('C0')) {
      return potentialId;
    }
  }
  const match = customerName.match(/C0\d+/);
  return match ? match[0] : '-';
}

function getDriverStorageType(driver) {
  const typeStr = driver.type || '';
  const nameStr = driver.name || '';
  if (typeStr.toUpperCase().includes('FROZEN')) return 'Frozen';
  if (typeStr.toUpperCase().includes('DRY')) return 'Dry';
  if (nameStr.toUpperCase().includes("'FRZ'") || nameStr.toUpperCase().includes('FROZEN'))
    return 'Frozen';
  if (nameStr.toUpperCase().includes("'DRY'") || nameStr.toUpperCase().includes('DRY'))
    return 'Dry';
  return '-';
}

/**
 * BAGIAN 1: LOGIKA PERHITUNGAN
 */
export function calculatePendingReasonData(driverData, allTasks) {
  const processedData = [];
  const driverMap = new Map();

  // 1. Init Master Driver
  if (driverData && Array.isArray(driverData)) {
    driverData.forEach((d) => {
      const plat = d.plat || '';
      if (!plat || plat.trim() === '' || plat.toUpperCase().includes('DEMO')) return;

      const email = normalizeEmail(d.email);
      if (email && !driverMap.has(email)) {
        driverMap.set(email, {
          name: d.name,
          plat: plat,
          type: getDriverStorageType(d),
        });
      }
    });
  }

  // 2. Filter Data
  const rawTasks = [];

  if (allTasks && Array.isArray(allTasks)) {
    allTasks.forEach((task) => {
      const status = task.label && task.label.length > 0 ? task.label[0].toUpperCase() : '';

      if (TARGET_STATUSES.includes(status)) {
        const email =
          task.assignee && task.assignee.length > 0 ? normalizeEmail(task.assignee[0]) : '';

        if (!driverMap.has(email)) return;
        const driverInfo = driverMap.get(email);

        const flow = task.flow || '';
        const isGR = flow.toUpperCase().includes('GR');

        let arrivalSource, departureSource;
        if (isGR) {
          arrivalSource = task.page1DoneTime;
          departureSource = task.doneTime;
        } else {
          arrivalSource = task.klikJikaSudahSampai;
          departureSource = task.page3DoneTime;
        }

        const dateObj = parseApiDateString(task.doneTime || task.createdTime);
        const arrObj = parseApiDateString(arrivalSource);
        const depObj = parseApiDateString(departureSource);

        let actualVisitMins = 0;
        if (arrObj && depObj) {
          const diff = depObj.getTime() - arrObj.getTime();
          if (diff > 0) actualVisitMins = Math.floor(diff / (1000 * 60));
        }

        let sortDateNum = 0;
        if (dateObj) {
          const wibTime = dateObj.getTime() + 7 * 60 * 60 * 1000;
          const d = new Date(wibTime);
          sortDateNum = d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
        }

        rawTasks.push({
          ...task,
          email: email,
          driverName: driverInfo.name,
          licensePlate: driverInfo.plat,
          temp: driverInfo.type,
          status: status,
          flow: flow,
          content: task.content,

          sortDateNum: sortDateNum,
          sortArrTimestamp: arrObj ? arrObj.getTime() : 9999999999999,

          dateStr: formatDateDDMMYYYY(dateObj),
          openStr: formatSimpleTimeString(task.openTime),
          closeStr: formatSimpleTimeString(task.closeTime),
          etaStr: formatSimpleTimeString(task.eta),
          etdStr: formatSimpleTimeString(task.etd || task.ETD),
          arrStr: formatTimeHHMM(arrObj),
          depStr: formatTimeHHMM(depObj),
          actualVisitMins: actualVisitMins,
        });
      }
    });
  }

  // 3. Ranking
  const groupedByDriverDate = {};
  rawTasks.forEach((item) => {
    const key = `${item.email}_${item.dateStr}`;
    if (!groupedByDriverDate[key]) groupedByDriverDate[key] = [];
    groupedByDriverDate[key].push(item);
  });

  Object.values(groupedByDriverDate).forEach((group) => {
    group.sort((a, b) => a.sortArrTimestamp - b.sortArrTimestamp);
    group.forEach((item, index) => {
      item.realSequence = index + 1;
      processedData.push(item);
    });
  });

  // 4. Sorting
  const getGroupPriority = (plat) => {
    const p = (plat || '').toUpperCase();
    if (p.includes('DM')) return 3;
    if (p.includes('SEWA')) return 2;
    return 1;
  };

  processedData.sort((a, b) => {
    if (a.sortDateNum !== b.sortDateNum) return a.sortDateNum - b.sortDateNum;

    const prioA = getGroupPriority(a.licensePlate);
    const prioB = getGroupPriority(b.licensePlate);
    if (prioA !== prioB) return prioA - prioB;

    const nameA = (a.driverName || '').trim().toLowerCase();
    const nameB = (b.driverName || '').trim().toLowerCase();
    return nameA.localeCompare(nameB);
  });

  return processedData;
}

/**
 * BAGIAN 2: GENERATOR EXCEL
 */
export function generatePendingReasonSheet(wb, driverData, allTasks, currentHubName) {
  const data = calculatePendingReasonData(driverData, allTasks);

  // Logic Hide Column
  const shouldShowPendingGR = LOCATIONS_SHOW_PENDING_GR.some((loc) =>
    (currentHubName || '').toLowerCase().includes(loc.toLowerCase())
  );

  const headerStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' } },
    fill: { patternType: 'solid', fgColor: { rgb: '4472C4' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    },
  };

  const cellStyle = {
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    },
  };

  const redFillStyle = {
    ...cellStyle,
    fill: { patternType: 'solid', fgColor: { rgb: 'FFC7CE' } },
    font: { color: { rgb: '9C0006' } },
  };

  // Style ERROR (Teks Merah Terang)
  const errorTextStyle = {
    ...cellStyle,
    font: { color: { rgb: 'FF0000' }, bold: true },
  };

  const yellowFillStyle = {
    ...cellStyle,
    fill: { patternType: 'solid', fgColor: { rgb: 'FFFF00' } },
  };

  // Headers
  let headers = [
    'Flow',
    'Date RO',
    'License Plat',
    'Driver',
    'Faktur Batal/ Tolakan SO',
    'Terkirim Sebagian',
    'Pending',
  ];

  if (shouldShowPendingGR) {
    headers.push('Pending GR');
  }

  headers.push(
    'Reason',
    'Open Time',
    'Close Time',
    'ETA',
    'ETD',
    'Actual Arrival',
    'Actual Departure',
    'Visit Time',
    'Actual Visit Time',
    'Customer ID',
    'RO Sequence',
    'Real Sequence',
    'Temperature'
  );

  const excelData = [headers];
  const errorRows = new Set(); // Simpan indeks baris yang salah status

  data.forEach((item, idx) => {
    // LOGIC DETEKSI SALAH STATUS
    // Jika status asli "PENDING GR" tapi lokasi ini menyembunyikan GR (!shouldShowPendingGR)
    const isWrongGR = !shouldShowPendingGR && item.status === 'PENDING GR';

    if (isWrongGR) {
      // Tandai baris ini (offset +1 karena header)
      errorRows.add(idx + 1);
    }

    const batal = item.status === 'BATAL' ? item.customerName : '';
    const parsial = item.status === 'TERIMA SEBAGIAN' ? item.customerName : '';

    // Logic Pending: Jika status PENDING OR (Salah Status GR), masukkan ke sini
    let pending = '';
    if (item.status === 'PENDING') pending = item.customerName;
    if (isWrongGR) pending = item.customerName; // Pindahkan ke sini

    const pendingGR = item.status === 'PENDING GR' ? item.customerName : '';

    const row = [
      item.flow || '-',
      item.dateStr,
      item.licensePlate,
      item.driverName,
      batal,
      parsial,
      pending,
    ];

    if (shouldShowPendingGR) {
      row.push(pendingGR);
    }

    row.push(
      item.alasan || '-',
      item.openStr || '-',
      item.closeStr || '-',
      item.etaStr || '-',
      item.etdStr || '-',
      item.arrStr || '-',
      item.depStr || '-',
      item.visitTime || '-',
      item.actualVisitMins,
      getCustomerID(item.customerName),
      item.routePlannedOrder || '-',
      item.realSequence || '-',
      item.temp
    );

    excelData.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(excelData);

  // --- STYLING ---
  const shift = shouldShowPendingGR ? 0 : -1;
  const idxPending = 6; // Index kolom Pending selalu 6
  const idxETA = 11 + shift;
  const idxETD = 12 + shift;
  const idxVisitTime = 16 + shift;
  const idxRO = 18 + shift;

  const range = XLSX.utils.decode_range(ws['!ref']);

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) continue;
      const cell = ws[cellRef];

      if (R === 0) {
        cell.s = headerStyle;
      } else {
        let currentStyle = { ...cellStyle };
        const val = cell.v;

        // 1. Error Style (Red Text) untuk kolom Pending jika baris ini salah status
        if (C === idxPending && errorRows.has(R)) {
          currentStyle = errorTextStyle;
        }

        // 2. Red Fill (Empty Values)
        if ([idxETA, idxETD, idxRO].includes(C)) {
          if (!val || val === '-' || val === '') {
            currentStyle = redFillStyle;
          }
        }

        // 3. Yellow Fill (Visit 0)
        if (C === idxVisitTime) {
          if (val === 0 || val === '0') {
            currentStyle = yellowFillStyle;
          }
        }

        cell.s = currentStyle;
      }
    }
  }

  const colWidths = [
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 25 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
  ];

  if (shouldShowPendingGR) {
    colWidths.push({ wch: 20 });
  }

  colWidths.push(
    { wch: 25 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 15 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 }
  );

  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Pending Reasons');
}
