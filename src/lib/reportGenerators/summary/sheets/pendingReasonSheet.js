import {
  formatDateUniversal,
  getStorageType,
  isEmpty,
  normalizeEmail,
  parseApiDateString,
  parseCustomerString,
  getBasePlate,
} from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import { BASE_STYLES, BORDERS, COLORS, FILL_STYLES, HEADER_STYLES } from './reportStyles';

const TARGET_STATUSES = ['BATAL', 'TERIMA SEBAGIAN', 'PENDING', 'PENDING GR'];

export function calculatePendingReasonData(
  driverData,
  allTasks,
  startDateStr,
  endDateStr,
) {
  const processedData = [];
  const driverMap = new Map();
  if (driverData && Array.isArray(driverData)) {
    driverData.forEach((d) => {
      const plat = d.plat || '';
      if (!plat || isEmpty(plat.trim()) || plat.toUpperCase().includes('DEMO')) return;
      const email = normalizeEmail(d.email);
      if (email && !driverMap.has(email)) {
        driverMap.set(email, { name: d.name, plat: getBasePlate(plat), type: getStorageType(d) });
      }
    });
  }
  const rawTasks = [];
  if (allTasks && Array.isArray(allTasks)) {
    allTasks.forEach((task) => {
      const dObj = new Date(task.startTime || task.doneTime);
      if (startDateStr && endDateStr) {
        if (!isNaN(dObj.getTime())) {
          const wibDate = formatDateUniversal(dObj);

          if (wibDate < startDateStr || wibDate > endDateStr) {
            return;
          }
        }
      }

      const status = task.statusDelivery
        ? task.statusDelivery.split(',')[0].trim().toUpperCase()
        : '';

      let emailRaw = '';
      if (task.assignee) {
        emailRaw = typeof task.assignee === 'string' ? task.assignee.split(',')[0] : task.assignee;
      }
      const email = normalizeEmail(emailRaw);
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
      const dateObj = parseApiDateString(task.startTime || task.doneTime);
      let actualVisitMins = 0;
      if (arrivalSource && departureSource) {
        const tArr = new Date(arrivalSource);
        const tDep = new Date(departureSource);
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
        sortDoneTimestamp: dateObj ? dateObj.getTime() : 9999999999999,
        dateStr: formatDateUniversal(dateObj, 'DD-MM-YYYY'),
        openStr: formatDateUniversal(`${startDateStr} ${task.openTime}`, 'HH:mm'),
        closeStr: formatDateUniversal(`${startDateStr} ${task.closeTime}`, 'HH:mm'),
        etaStr: formatDateUniversal(`${startDateStr} ${task.eta}`, 'HH:mm'),
        etdStr: formatDateUniversal(`${startDateStr} ${task.etd}` || task.ETD, 'HH:mm'),
        arrStr: arrivalSource ? formatDateUniversal(arrivalSource, 'HH:mm') : '-',
        depStr: departureSource ? formatDateUniversal(departureSource, 'HH:mm') : '-',
        actualVisitMins: actualVisitMins,
      });
    });
  }
  const groupedByDriverDate = {};
  rawTasks.forEach((item) => {
    const key = `${item.email}_${item.dateStr}`;
    if (!groupedByDriverDate[key]) groupedByDriverDate[key] = [];
    groupedByDriverDate[key].push(item);
  });
  Object.values(groupedByDriverDate).forEach((group) => {
    group.sort((a, b) => a.sortDoneTimestamp - b.sortDoneTimestamp);
    group.forEach((item, index) => {
      item.realSequence = index + 1;
      if (TARGET_STATUSES.includes(item.status)) {
        processedData.push(item);
      }
    });
  });
  processedData.sort((a, b) => {
    if (a.sortDateNum !== b.sortDateNum) return a.sortDateNum - b.sortDateNum;
    const statusA = (a.status || '').trim().toLowerCase();
    const statusB = (b.status || '').trim().toLowerCase();
    if (statusA !== statusB) return statusA.localeCompare(statusB);

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
  pendingDetails,
  isDailyReport = false,
) {
  const data = calculatePendingReasonData(
    driverData,
    allTasks,
    startDateStr,
    endDateStr,
  );
  const shouldShowPendingGR = hasPendingGR;

  let headers = [
    translate('common.flow'),
    translate('common.delivery_date'),
    translate('common.license_number'),
    translate('common.driver'),
    translate('common.customer_name'),
    translate('common.status.delivery_status'),
    translate('summary.tabs.pending_reasons.reason'),
  ];

  let currentIdx = headers.length;
  let idxSeparator = -1;

  if (isDailyReport) {
    headers.push('');
    idxSeparator = currentIdx;
    currentIdx++;
  } else {
    headers.push(
      translate('summary.tabs.pending_reasons.category'),
      translate('summary.tabs.pending_reasons.detail_reason'),
      translate('summary.tabs.pending_reasons.group_reason'),
      'PIC'
    );
    currentIdx += 4;
  }

  const idxPending = 5;
  const idxETA = currentIdx + 2;
  const idxETD = currentIdx + 3;
  const idxVisitTime = currentIdx + 7;
  const idxRO = currentIdx + 9;

  headers.push(
    translate('common.open_time'),
    translate('common.close_time'),
    translate('common.eta'),
    translate('common.etd'),
    translate('common.actual_arrival'),
    translate('common.actual_departure'),
    translate('common.plan_visit'),
    translate('common.actual_visit'),
    translate('common.customer_id'),
    translate('common.plan_seq'),
    translate('common.actual_seq'),
    translate('common.storage_type')
  );

  const excelData = [headers];
  const errorRows = new Set();

  data.forEach((item, idx) => {
    const isWrongGR = !shouldShowPendingGR && item.status === 'PENDING GR';
    if (isWrongGR) errorRows.add(idx + 1);

    const { id, name: customerName } = parseCustomerString(item.customerName);
    const pd = (pendingDetails || []).find((d) => d.taskId === item._id) || {};

    const row = [
      item.flow || '-',
      item.dateStr,
      item.licensePlate,
      item.driverName,
      customerName || '-',
      item.status || '-',
      item.alasan || '-',
    ];

    if (isDailyReport) {
      row.push('');
    } else {
      row.push(
        pd.internalExternal || '-',
        pd.detailReason || '-',
        pd.groupReason || '-',
        pd.pic || '-'
      );
    }

    row.push(
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

  const range = XLSX.utils.decode_range(ws['!ref']);

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) continue;
      const cell = ws[cellRef];

      if (R === 0) {
        cell.s = HEADER_STYLES.blueHeader;
        if (isDailyReport && C === idxSeparator) {
          cell.s = { ...HEADER_STYLES.blueHeader, fill: FILL_STYLES.alertRed };
        }
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

        if (C === 3 || C === 4 || C === 5 || C === 6) {
          currentStyle.alignment = { ...currentStyle.alignment, horizontal: 'left' };
        }

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
        if (isDailyReport && C === idxSeparator) {
          currentStyle = { ...currentStyle, fill: FILL_STYLES.alertRed };
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
    { wch: 25 },
    { wch: 15 },
    { wch: 25 },
  ];

  if (isDailyReport) {
    widths.push({ wch: 4 });
  } else {
    widths.push({ wch: 20 }, { wch: 30 }, { wch: 20 }, { wch: 20 });
  }

  widths.push(
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
