'use client';

import { toastError, toastSuccess } from '@/lib/toast';
import * as XLSX from 'xlsx-js-style';
import {
  calculateMinuteDifference,
  formatDateUniversal,
  getBasePlate,
  getStorageType,
  isEmpty,
  normalizeEmail,
  parseCustomerString,
  sortRows,
} from './utils';

export function routingActual({ tasks, drivers, dateStr }) {
  if (!tasks || !drivers) return [];

  const emailPlatMap = new Map();
  const emailFallbackMap = new Map();
  for (const d of drivers) {
    const normEmail = normalizeEmail(d.email);
    const bPlat = getBasePlate(d.plat) || d.plat || '';
    if (normEmail) {
      emailFallbackMap.set(normEmail, { plat: d.plat || null, name: d.name });
      if (bPlat)
        emailPlatMap.set(`${normEmail}_${bPlat.toLowerCase()}`, { plat: d.plat, name: d.name });
    }
  }

  const processed = [];

  for (const t of tasks) {
    const flow = t.flow || '';

    const taskPlat =
      t.assignedVehicle?.name ||
      t.assignedVehicle?.plat ||
      (typeof t.assignedVehicle === 'string' ? t.assignedVehicle : null) ||
      t.vehicle?.name ||
      t.vehicle?.plat ||
      t.vehicleName ||
      t.vehicleId ||
      t.plat ||
      t.licensePlate ||
      null;

    const emailStr = Array.isArray(t.assignee) && t.assignee.length > 0 ? t.assignee[0] : null;
    const driverEmail = normalizeEmail(emailStr);
    const taskBasePlat = getBasePlate(taskPlat) || taskPlat || '';

    let driverInfo = null;
    if (driverEmail && taskBasePlat) {
      driverInfo = emailPlatMap.get(`${driverEmail}_${taskBasePlat.toLowerCase()}`);
    }
    if (!driverInfo && driverEmail) {
      driverInfo = emailFallbackMap.get(driverEmail);
    }

    const driverName = driverInfo?.name || t.assignedTo?.name || driverEmail || 'N/A';
    const finalPlat = taskPlat || driverInfo?.plat || '-';
    const basePlat = getBasePlate(finalPlat) || finalPlat;
    const groupKey = `${driverName}_${basePlat}`;

    let statusLabel = t.statusDelivery?.length > 0 ? t.statusDelivery[0].toUpperCase() : null;
    if (flow === 'Pickup') statusLabel = t.status ? t.status.toUpperCase() : statusLabel;
    if (flow === 'Pickup' && statusLabel === 'DONE') statusLabel = 'SUKSES';
    if (t.status !== 'ONGOING' && flow !== 'Pickup') statusLabel = statusLabel || '-';

    const rawCustStr = t.customerOrder || t.customerName || '';
    const {
      name: cName,
      id: cId,
      location: cLoc,
      fullCustomerName,
    } = parseCustomerString(rawCustStr);

    const isGrOrPickup = flow.toUpperCase().includes('GR') || flow.toUpperCase().includes('PICKUP');
    const actualArr = isGrOrPickup
      ? t.page1DoneTime
      : t.klikJikaSudahSampai || t.klikJikaAndaSudahSampai;
    const actualDep = isGrOrPickup ? t.page1DoneTime : t.page3DoneTime;

    const actualArrVal = formatDateUniversal(actualArr, 'HH:mm') || '-';
    const openTimeVal = formatDateUniversal(`${dateStr} ${t.openTime}`, 'HH:mm') || '-';
    const closeTimeVal = formatDateUniversal(`${dateStr} ${t.closeTime}`, 'HH:mm') || '-';

    let hoursStatus = null;
    if (actualArrVal !== '-' && openTimeVal !== '-' && closeTimeVal !== '-') {
      const isInside =
        openTimeVal > closeTimeVal
          ? actualArrVal >= openTimeVal || actualArrVal <= closeTimeVal
          : actualArrVal >= openTimeVal && actualArrVal <= closeTimeVal;
      hoursStatus = isInside ? 'yes' : actualArrVal < openTimeVal ? 'early' : 'no';
    }

    processed.push({
      groupKey,
      basePlat,
      driver: driverName,
      driverEmail,
      plat: finalPlat,
      actualArrivalTimestamp: actualArr ? new Date(actualArr).getTime() : null,
      roSequence: t.routePlannedOrder || 0,
      statusLabel,
      flow,
      customerName: fullCustomerName || cName || t.customerName,
      originalCustomerString: rawCustStr,
      customerId: cId,
      locationId: cLoc,
      openTime: openTimeVal,
      closeTime: closeTimeVal,
      eta: formatDateUniversal(`${dateStr} ${t.eta}`, 'HH:mm') || '-',
      etd: formatDateUniversal(`${dateStr} ${t.etd}`, 'HH:mm') || '-',
      actualArrival: actualArrVal,
      actualDeparture: formatDateUniversal(actualDep, 'HH:mm') || '-',
      visitTime: t.visitTime || '-',
      actualVisitTime:
        actualArr && actualDep ? calculateMinuteDifference(actualArr, actualDep) : '-',
      isManualAssign: !t.routePlannedOrder || t.routePlannedOrder === 0,
      isWithinHoursStatus: hoursStatus,
      reason: t.alasan || '',
      orderId: t.orderId || '',
      temperature: getStorageType(driverName),
      _id: t._id,
      rawTask: t,
    });
  }

  processed.sort((a, b) => {
    if (a.groupKey !== b.groupKey) return a.groupKey.localeCompare(b.groupKey);
    return (a.actualArrivalTimestamp || Infinity) - (b.actualArrivalTimestamp || Infinity);
  });

  let currGroup = null,
    rank = 1;
  for (const row of processed) {
    if (row.groupKey !== currGroup) {
      currGroup = row.groupKey;
      rank = 1;
    }
    row.realSequence = row.actualArrivalTimestamp ? rank++ : null;
  }

  return processed;
}

export const processRoutingVsActualData = ({ tasks, results, drivers, searchQuery, date }) => {
  if (!tasks || !drivers) return [];

  const hubTimesMap = new Map();
  const hubTimesFallbackMap = new Map();
  if (results) {
    const emailToDriverMap = drivers.reduce((acc, d) => {
      const norm = normalizeEmail(d.email);
      if (norm) acc[norm] = { plat: d.plat || null, name: d.name };
      return acc;
    }, {});

    const filteredResults = results.filter((item) => item.dispatchStatus === 'done');
    for (const result of filteredResults) {
      if (result.result && Array.isArray(result.result.routing)) {
        for (const route of result.result.routing) {
          const driverEmail = normalizeEmail(route.assignee);
          const driverInfo = driverEmail ? emailToDriverMap[driverEmail] : null;
          const driverName = driverInfo ? driverInfo.name : driverEmail || 'N/A';
          if (!driverName || !Array.isArray(route.trips) || isEmpty(route.trips)) continue;

          const hubTrips = route.trips.filter((trip) => trip.isHub === true);
          if (hubTrips.length > 0) {
            const firstHub = hubTrips[0];
            const lastHub = hubTrips[hubTrips.length - 1];
            const routePlat = route.vehicleName || driverInfo?.plat || '';
            const routeBasePlat = getBasePlate(routePlat) || routePlat;
            const timesObj = {
              hubETD: formatDateUniversal(`${date} ${firstHub.etd}`, 'HH:mm') || '-',
              hubETA: formatDateUniversal(`${date} ${lastHub.eta}`, 'HH:mm') || '-',
              hubLongLat: firstHub.coordinate || null,
            };
            hubTimesFallbackMap.set(driverName, timesObj);
            if (routeBasePlat) hubTimesMap.set(`${driverName}_${routeBasePlat}`, timesObj);
          }
        }
      }
    }
  }

  const allTaskData = routingActual({ tasks, drivers, dateStr: date });
  const tasksByGroupMap = new Map();
  const groupStats = new Map();

  for (const task of allTaskData) {
    if (task.driver === 'N/A' || task.rawTask?.status === 'UNASSIGNED') continue;

    const gKey = task.groupKey;
    if (!tasksByGroupMap.has(gKey)) tasksByGroupMap.set(gKey, []);
    tasksByGroupMap.get(gKey).push(task);
    if (!groupStats.has(gKey)) {
      groupStats.set(gKey, { driver: task.driver, plat: task.plat, basePlat: task.basePlat });
    }
  }

  const driverList = Array.from(groupStats.entries()).map(([gKey, stats]) => ({
    gKey,
    plat: stats.plat,
    driver: stats.driver,
  }));
  const sortDrivers = sortRows(driverList, 'plat', 'driver');
  const finalRows = [];
  const query = (searchQuery || '').toLowerCase();

  for (const driverRow of sortDrivers) {
    const driverName = driverRow.driver;
    const driverPlat = driverRow.plat;
    const driverTasks = tasksByGroupMap.get(driverRow.gKey) || [];
    const hubTimes = hubTimesMap.get(driverRow.gKey) ||
      hubTimesFallbackMap.get(driverName) || { hubETD: '-', hubETA: '-', hubLongLat: null };

    const isDriverMatch =
      driverName.toLowerCase().includes(query) ||
      (driverPlat && driverPlat.toLowerCase().includes(query));

    const matchingTasks = driverTasks.filter((t) => {
      if (isDriverMatch) return true;
      return t.customerName && t.customerName.toLowerCase().includes(query);
    });

    if (isEmpty(matchingTasks) && !isDriverMatch) continue;

    finalRows.push({
      type: 'HUB_START',
      driver: driverName,
      plat: driverPlat,
      time: hubTimes.hubETD,
      longlat: hubTimes.hubLongLat,
      customerName: 'HUB',
    });

    matchingTasks.sort((a, b) => (a.roSequence || 0) - (b.roSequence || 0));
    matchingTasks.forEach((t) => finalRows.push({ type: 'TASK', ...t }));

    finalRows.push({
      type: 'HUB_END',
      driver: driverName,
      plat: driverPlat,
      time: hubTimes.hubETA,
      longlat: hubTimes.hubLongLat,
      customerName: 'HUB',
    });

    finalRows.push({ type: 'SPACER' });
  }

  return finalRows;
};

const getHoursStatusUI = (status, t) => {
  if (status === 'yes')
    return {
      text: t('dashboard.tab.routing_actual.yes'),
      color: 'text-[#16A34A] dark:text-[#86EFAC]',
      hex: '16A34A',
    };
  if (status === 'early')
    return {
      text: t('dashboard.tab.routing_actual.early'),
      color: 'text-[#F59E0B] dark:text-[#FCD34D]',
      hex: 'F59E0B',
    };
  if (status === 'no')
    return {
      text: t('dashboard.tab.routing_actual.no'),
      color: 'text-[#DC2626] dark:text-[#FCA5A5]',
      hex: 'DC2626',
    };
  return { text: '-', color: 'text-[#F1F5F9]', hex: null };
};

export const getRoutingActualColumns = (t) => {
  const colors = {
    green: { normal: 'DCFCE7', dark: '14532D' },
    orange: { normal: 'FFEDD5', dark: '7C2D12' },
    yellow: { normal: 'FEF3C7', dark: '713F12' },
    pink: { normal: 'FCE7F3', dark: '831843' },
    blue: { normal: 'DBEAFE', dark: '1E3A8A' },
  };

  const theme = {
    greenClass: `bg-[#${colors.green.normal}] dark:bg-[#${colors.green.dark}]/40`,
    orangeClass: `bg-[#${colors.orange.normal}] dark:bg-[#${colors.orange.dark}]/40`,
    yellowClass: `bg-[#${colors.yellow.normal}] dark:bg-[#${colors.yellow.dark}]/40`,
    pinkClass: `bg-[#${colors.pink.normal}] dark:bg-[#${colors.pink.dark}]/40`,
    blueClass: `bg-[#${colors.blue.normal}] dark:bg-[#${colors.blue.dark}]/40`,
  };

  return [
    {
      id: 'flow',
      header: t('common.flow'),
      align: 'center',
      excelWidth: 12,
      getValue: (row) => row.flow || '-',
    },
    {
      id: 'plat',
      header: t('common.license_number'),
      align: 'center',
      excelWidth: 15,
      highlight: true,
      getValue: (row) => getBasePlate(row.plat) || '-',
    },
    {
      id: 'driver',
      header: t('common.driver'),
      align: 'left',
      className: 'font-medium',
      excelWidth: 25,
      highlight: true,
      getValue: (row) => row.driver || '-',
    },
    {
      id: 'customerName',
      header: t('common.customer_name'),
      align: 'left',
      excelWidth: 35,
      highlight: true,
      getValue: (row) => row.customerName || '-',
    },
    {
      id: 'statusLabel',
      header: t('dashboard.tab.routing_actual.status'),
      align: 'center',
      excelWidth: 15,
      getValue: (row) => row.statusLabel || '-',
    },

    {
      id: 'openTime',
      header: t('common.open_time'),
      align: 'center',
      excelWidth: 12,
      className: theme.greenClass,
      excelBg: colors.green.normal,
      getValue: (row) => row.openTime || '-',
    },
    {
      id: 'closeTime',
      header: t('common.close_time'),
      align: 'center',
      excelWidth: 12,
      className: theme.greenClass,
      excelBg: colors.green.normal,
      getValue: (row) => row.closeTime || '-',
    },

    {
      id: 'eta',
      header: t('common.eta'),
      align: 'center',
      excelWidth: 12,
      className: theme.orangeClass,
      excelBg: colors.orange.normal,
      getValue: (row) => row.eta || '-',
    },
    {
      id: 'actualArrival',
      header: t('common.actual_arrival'),
      align: 'center',
      excelWidth: 15,
      className: theme.orangeClass,
      excelBg: colors.orange.normal,
      getValue: (row) => row.actualArrival || '-',
    },

    {
      id: 'etd',
      header: t('common.etd'),
      align: 'center',
      excelWidth: 12,
      className: theme.yellowClass,
      excelBg: colors.yellow.normal,
      getValue: (row) => row.etd || '-',
    },
    {
      id: 'actualDeparture',
      header: t('common.actual_departure'),
      align: 'center',
      excelWidth: 15,
      className: theme.yellowClass,
      excelBg: colors.yellow.normal,
      getValue: (row) => row.actualDeparture || '-',
    },

    {
      id: 'visitTime',
      header: t('common.visit_plan'),
      align: 'center',
      excelWidth: 12,
      className: theme.pinkClass,
      excelBg: colors.pink.normal,
      getValue: (row) => row.visitTime || '-',
    },
    {
      id: 'actualVisitTime',
      header: t('common.visit_actual'),
      align: 'center',
      excelWidth: 12,
      className: theme.pinkClass,
      excelBg: colors.pink.normal,
      getValue: (row) => row.actualVisitTime || '-',
    },

    {
      id: 'roSequence',
      header: t('common.ro_seq'),
      align: 'center',
      excelWidth: 10,
      className: `font-semibold ${theme.blueClass}`,
      excelBg: colors.blue.normal,
      getValue: (row) => (isEmpty(row.roSequence) || row.roSequence === 0 ? '-' : row.roSequence),
    },
    {
      id: 'realSequence',
      header: t('common.actual_seq'),
      align: 'center',
      excelWidth: 10,
      className: `font-semibold ${theme.blueClass}`,
      excelBg: colors.blue.normal,
      getValue: (row) =>
        isEmpty(row.realSequence) || row.realSequence === 0 ? '-' : row.realSequence,
    },

    {
      id: 'isMatch',
      header: t('dashboard.tab.routing_actual.is_match'),
      align: 'center',
      excelWidth: 15,
      tooltip: t('dashboard.tab.routing_actual.tooltip.exp_is_same'),
      getValue: (row) => {
        const isRoSeqNull = isEmpty(row.roSequence) || row.roSequence === 0;
        const isRealSeqNull = isEmpty(row.realSequence) || row.realSequence === 0;
        if (isRealSeqNull) return '-';
        const roSeq = isRoSeqNull ? '-' : row.roSequence;
        const realSeq = isRealSeqNull ? '-' : row.realSequence;
        return roSeq == realSeq ? t('common.status.match') : t('common.status.mismatch');
      },
      getUI: (val, row, t) => {
        if (val === '-') return <span className="font-bold text-[#F1F5F9]">-</span>;
        const isMatch = val === t('common.status.match');
        return (
          <span
            className={`font-bold ${isMatch ? 'text-[#16A34A] dark:text-[#86EFAC]' : 'text-[#DC2626] dark:text-[#FCA5A5]'}`}
          >
            {val}
          </span>
        );
      },
      getExcelColor: (val, t) => {
        if (val === t('common.status.match')) return '16A34A';
        if (val === t('common.status.mismatch')) return 'DC2626';
        return null;
      },
    },
    {
      id: 'isWithinHoursStatus',
      header: t('dashboard.tab.routing_actual.is_within_hours'),
      align: 'center',
      excelWidth: 20,
      tooltip: t('dashboard.tab.routing_actual.tooltip.exp_within_hours'),
      tooltipWidth: 'w-40',
      getValue: (row) => row.isWithinHoursStatus,
      getUI: (val, row, t) => {
        const statusUI = getHoursStatusUI(val, t);
        return <span className={`font-bold ${statusUI.color}`}>{statusUI.text}</span>;
      },
      getExcelValue: (val, row, t) => getHoursStatusUI(val, t).text,
      getExcelColor: (val, t) => getHoursStatusUI(val, t).hex,
    },
  ];
};

export function routingActualSheet(wb, data, t) {
  if (!data || !Array.isArray(data) || data.length === 0) return;

  const columns = getRoutingActualColumns(t);
  const headers = columns.map((c) => c.header);
  const sheetData = [headers];
  const manualAssignRows = new Set();
  let lastDriver = null;

  data.forEach((row) => {
    if (row.type === 'SPACER') return;

    const currentDriver = row.driver || 'Unknown';
    const isHubStart = row.type === 'HUB_START';
    const isHubEnd = row.type === 'HUB_END';
    const isHub = isHubStart || isHubEnd;

    if (lastDriver !== null && currentDriver !== lastDriver) {
      sheetData.push(Array(columns.length).fill(''));
    }
    lastDriver = currentDriver;

    if (!isHub && row.isManualAssign) {
      manualAssignRows.add(sheetData.length);
    }

    const rowData = columns.map((col) => {
      if (isHub) {
        if (col.id === 'customerName') return 'HUB';
        if (col.id === 'etd' && isHubStart) return row.time;
        if (col.id === 'eta' && isHubEnd) return row.time;
        return null;
      }
      const rawVal = col.getValue(row);
      return col.getExcelValue ? col.getExcelValue(rawVal, row, t) : rawVal;
    });

    sheetData.push(rowData);
  });

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!view'] = { state: 'frozen', ySplit: 1 };
  ws['!cols'] = columns.map((col, i) => {
    let maxLen = 0;
    sheetData.forEach((r) => {
      if (r[i] !== null && r[i] !== undefined) maxLen = Math.max(maxLen, String(r[i]).length);
    });
    return { wch: Math.min(Math.max(maxLen + 2, col.excelWidth || 10), 45) };
  });

  const STYLES = {
    center: { alignment: { horizontal: 'center', vertical: 'center' } },
    left: { alignment: { horizontal: 'left', vertical: 'center' } },
    hubRed: {
      alignment: { horizontal: 'center', vertical: 'center' },
      font: { bold: true, color: { rgb: 'FF0000' } },
    },
  };

  for (let R = 0; R < sheetData.length; ++R) {
    const isHubRow = ws[XLSX.utils.encode_cell({ r: R, c: 3 })]?.v === 'HUB';

    for (let C = 0; C < columns.length; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };

      const col = columns[C];

      if (R === 0) {
        ws[cellRef].s = {
          ...STYLES.center,
          font: { bold: true, color: { rgb: '000000' } },
          border: {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' },
          },
          fill: { fgColor: { rgb: col.excelBg || 'EFEFEF' }, patternType: 'solid' },
          ...(col.id === 'visitTime' ||
          col.id === 'actualVisitTime' ||
          col.id === 'roSequence' ||
          col.id === 'realSequence'
            ? { alignment: { horizontal: 'center', vertical: 'center', wrapText: true } }
            : {}),
        };
      } else if (isHubRow) {
        if (col.id === 'customerName' || col.id === 'eta' || col.id === 'etd')
          ws[cellRef].s = STYLES.hubRed;
        else ws[cellRef].s = { font: { color: { rgb: 'FF0000' } } };
      } else {
        const isSpacerRow =
          isEmpty(ws[XLSX.utils.encode_cell({ r: R, c: 0 })]?.v) &&
          isEmpty(ws[XLSX.utils.encode_cell({ r: R, c: 2 })]?.v);
        if (isSpacerRow) continue;

        const baseStyle = col.align === 'center' ? STYLES.center : STYLES.left;
        const bgStyle = col.excelBg
          ? { fill: { fgColor: { rgb: col.excelBg }, patternType: 'solid' } }
          : {};

        if (manualAssignRows.has(R)) {
          ws[cellRef].s = {
            ...baseStyle,
            fill: { fgColor: { rgb: 'FEE2E2' }, patternType: 'solid' },
          };
        } else {
          ws[cellRef].s = { ...baseStyle, ...bgStyle };
        }

        if (typeof ws[cellRef].v === 'number') ws[cellRef].t = 'n';

        if (col.getExcelColor) {
          const color = col.getExcelColor(ws[cellRef].v, t);
          if (color)
            ws[cellRef].s = { ...ws[cellRef].s, font: { bold: true, color: { rgb: color } } };
        }
      }
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, t('excel.reports.routing_actual.sheet_name'));
}

export const downloadRoutingActualExcel = (data, t, selectedDate, hubLabel) => {
  try {
    const wb = XLSX.utils.book_new();
    routingActualSheet(wb, data, t);
    const dateStr = formatDateUniversal(selectedDate || new Date(), 'DD.MM.YYYY');
    const safeHubLabel = hubLabel ? ` - ${hubLabel}` : '';
    XLSX.writeFile(wb, `${t('dashboard.tabs.routing_vs_actual')} - ${dateStr}${safeHubLabel}.xlsx`);
    toastSuccess(t('common.toast.success'));
  } catch (e) {
    toastError(t('common.toast.error', { err: e.message }));
  }
};
