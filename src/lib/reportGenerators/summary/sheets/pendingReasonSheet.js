// File: src/lib/reportGenerators/rangkumanSheets/pendingReasonSheet.js
import { formatDateWIB, isEmpty, parseCustomerString, normalizeEmail } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import { BASE_STYLES, BORDERS, COLORS, FILL_STYLES, HEADER_STYLES } from './reportStyles';

const TARGET_STATUSES = ['BATAL', 'TERIMA SEBAGIAN', 'PENDING', 'PENDING GR'];
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

export function calculatePendingReasonData(driverData, allTasks, startDateStr, endDateStr) {
  const processedData = [];
  const driverMap = new Map();
  if (driverData && Array.isArray(driverData)) {
    driverData.forEach((d) => {
      const plat = d.plat || '';
      if (!plat || isEmpty(plat.trim()) || plat.toUpperCase().includes('DEMO')) return;
      const email = normalizeEmail(d.email);
      if (email && !driverMap.has(email)) {
        driverMap.set(email, { name: d.name, plat: plat, type: getDriverStorageType(d) });
      }
    });
  }
  const rawTasks = [];
  if (allTasks && Array.isArray(allTasks)) {
    allTasks.forEach((task) => {
      if (startDateStr && endDateStr) {
        const dObj = parseApiDateString(task.doneTime || task.createdTime);
        if (dObj) {
          const wibDate = formatDateWIB(dObj, 'YYYY-MM-DD');
          if (wibDate < startDateStr || wibDate > endDateStr) {
            return;
          }
        }
      }

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
          arrivalSource = task.klikJikaSudahSampai || task.klikJikaAndaSudahSampai;
          departureSource = task.page3DoneTime;
        }
        const dateObj = parseApiDateString(task.doneTime || task.createdTime);
        const arrObj = parseApiDateString(arrivalSource);
        const depObj = parseApiDateString(departureSource);
        let actualVisitMins = 0;
        if (arrObj && depObj) {
          const tArr = new Date(arrObj);
          const tDep = new Date(depObj);
          tArr.setSeconds(0, 0);
          tDep.setSeconds(0, 0);
          const diff = tDep.getTime() - tArr.getTime();
          if (diff > 0) {
            actualVisitMins = Math.floor(diff / (1000 * 60));
          } else if (diff === 0) {
            actualVisitMins = 0;
          } else {
            actualVisitMins = 0;
          }
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
          dateStr: formatDateWIB(dateObj, 'DD-MM-YYYY'),
          openStr: formatSimpleTimeString(task.openTime),
          closeStr: formatSimpleTimeString(task.closeTime),
          etaStr: formatSimpleTimeString(task.eta),
          etdStr: formatSimpleTimeString(task.etd || task.ETD),
          arrStr: formatDateWIB(arrObj, 'HH:mm'),
          depStr: formatDateWIB(depObj, 'HH:mm'),
          actualVisitMins: actualVisitMins,
        });
      }
    });
  }
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

export function generatePendingReasonSheet(
  wb,
  driverData,
  allTasks,
  translate,
  startDateStr,
  endDateStr,
  hasPendingGR,
  pendingDetails
) {
  const data = calculatePendingReasonData(driverData, allTasks, startDateStr, endDateStr);
  const shouldShowPendingGR = hasPendingGR;

  let headers = [
    translate('common.flow'),
    translate('common.delivery_date'),
    translate('common.license_number'),
    translate('common.driver'),
    translate('common.status.cancel'),
    translate('common.status.partial'),
    translate('common.status.pending'),
  ];
  if (shouldShowPendingGR) headers.push(translate('common.status.pending_gr'));
  headers.push(
    translate('summary.tabs.pending_reasons.reason'),
    'Internal/External', // Kolom Tambahan 1
    'Detail Reason', // Kolom Tambahan 2
    'Group Reason', // Kolom Tambahan 3
    'PIC', // Kolom Tambahan 4
    translate('common.open_time'),
    translate('common.close_time'),
    translate('common.eta'),
    translate('common.etd'),
    translate('common.actual_arrival'),
    translate('common.actual_departure'),
    translate('common.visit_plan'),
    translate('common.visit_actual'),
    translate('common.customer_id'),
    translate('common.ro_seq'),
    translate('common.actual_seq'),
    translate('common.storage_type')
  );

  const excelData = [headers];
  const errorRows = new Set();

  data.forEach((item, idx) => {
    const isWrongGR = !shouldShowPendingGR && item.status === 'PENDING GR';
    if (isWrongGR) errorRows.add(idx + 1);
    const { id, name: customerName } = parseCustomerString(item.customerName);
    const batal = item.status === 'BATAL' ? customerName : '';
    const parsial = item.status === 'TERIMA SEBAGIAN' ? customerName : '';
    let pending = '';
    if (item.status === 'PENDING' || isWrongGR) pending = customerName;
    const pendingGR = item.status === 'PENDING GR' ? customerName : '';

    const pd = (pendingDetails || []).find((d) => d.taskId === item._id) || {};

    const row = [
      item.flow || '-',
      item.dateStr,
      item.licensePlate,
      item.driverName,
      batal,
      parsial,
      pending,
    ];
    if (shouldShowPendingGR) row.push(pendingGR);

    // Terapkan Kolom Tambahannya
    row.push(
      item.alasan || '-',
      pd.internalExternal || '-',
      pd.detailReason || '-',
      pd.groupReason || '-',
      pd.pic || '-',
      item.openStr || '-',
      item.closeStr || '-',
      item.etaStr || '-',
      item.etdStr || '-',
      item.arrStr || '-',
      item.depStr || '-',
      item.visitTime || '-',
      item.actualVisitMins,
      id || '-',
      item.routePlannedOrder || '-',
      item.realSequence || '-',
      item.temp
    );
    excelData.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(excelData);

  ws['!views'] = [
    {
      state: 'frozen',
      ySplit: 1,
      xSplit: 0,
      topLeftCell: 'A2',
      activeCell: 'A2',
    },
  ];

  // Logic Indexer setelah dimasukan 4 Kolom Baru (Geser 4)
  const shift = shouldShowPendingGR ? 0 : -1;
  const shiftNew = 4;
  const idxPending = 6;
  const idxETA = 11 + shift + shiftNew;
  const idxETD = 12 + shift + shiftNew;
  const idxVisitTime = 16 + shift + shiftNew;
  const idxRO = 18 + shift + shiftNew;

  const range = XLSX.utils.decode_range(ws['!ref']);

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) continue;
      const cell = ws[cellRef];

      if (R === 0) {
        cell.s = HEADER_STYLES.blueHeader;
      } else {
        const dataIdx = R - 1;
        const item = data[dataIdx];
        const nextItem = data[dataIdx + 1];

        const isLastInDate = !nextItem || item.dateStr !== nextItem.dateStr;
        const bottomBorder = isLastInDate ? BORDERS.medium : { style: 'none' };
        const topBorder = R === 1 ? BORDERS.thin : { style: 'none' };

        let currentStyle = {
          ...BASE_STYLES.cellCenter,
          border: {
            left: { style: 'none' },
            right: { style: 'none' },
            top: topBorder,
            bottom: bottomBorder,
          },
        };

        const val = cell.v;

        if (C === idxPending && errorRows.has(R)) {
          currentStyle = { ...currentStyle, font: { color: COLORS.alert, bold: true } };
        }
        if ([idxETA, idxETD, idxRO].includes(C)) {
          if (isEmpty(val) || val === '-')
            currentStyle = { ...currentStyle, fill: FILL_STYLES.red };
        }
        if (C === idxVisitTime) {
          if (val === 0 || val === '0')
            currentStyle = { ...currentStyle, fill: FILL_STYLES.yellow };
        }
        cell.s = currentStyle;
      }
    }
  }

  const widths = [
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 25 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
  ];
  if (shouldShowPendingGR) widths.push({ wch: 20 });

  // Masukkan Lebar 4 Kolom Baru
  widths.push(
    { wch: 25 },
    { wch: 20 }, // internalExternal
    { wch: 30 }, // detailReason
    { wch: 20 }, // groupReason
    { wch: 20 }, // PIC
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

  ws['!cols'] = widths;

  XLSX.utils.book_append_sheet(wb, ws, translate('summary.tabs.pending_reasons.title'));
}
