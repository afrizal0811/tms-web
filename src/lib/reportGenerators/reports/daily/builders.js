import {
  calculateDurationAsQuotedHHMM,
  formatDateUniversal,
  formatMinutesToHHMM,
  getBasePlate,
  heatMap,
  isEmpty,
  sortRows,
} from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';

const STYLES = {
  header: { font: { bold: true }, alignment: { horizontal: 'center', vertical: 'center' } },
  center: { alignment: { horizontal: 'center', vertical: 'center' } },
  left: { alignment: { horizontal: 'left', vertical: 'center' } },
  wrap: { alignment: { wrapText: true, vertical: 'center', horizontal: 'left' } },
  greenHeader: {
    font: { bold: true },
    alignment: { horizontal: 'center', vertical: 'center' },
    fill: { patternType: 'solid', fgColor: { rgb: '84fa92' } },
  },
  separator: {
    alignment: { horizontal: 'center', vertical: 'center' },
    fill: { patternType: 'solid', fgColor: { rgb: 'FA9D9D' } },
  },
  hubRed: {
    font: { bold: true, color: { rgb: 'FF0000' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  },
  blueFill: {
    fill: { patternType: 'solid', fgColor: { rgb: '4f76c7' } },
  },
  magentaFill: {
    fill: { patternType: 'solid', fgColor: { rgb: 'c85d86' } },
  },
  indigoFill: {
    fill: { patternType: 'solid', fgColor: { rgb: '5c5fb2' } },
  },
  orangeFill: {
    fill: { patternType: 'solid', fgColor: { rgb: 'ff8904' } },
  },
  redFill: {
    fill: { patternType: 'solid', fgColor: { rgb: 'F6C5C0' } },
  },
  orangeBorder: {
    border: {
      top: { style: 'thick', color: { rgb: 'FF8904' } },
      bottom: { style: 'thick', color: { rgb: 'FF8904' } },
      left: { style: 'thick', color: { rgb: 'FF8904' } },
      right: { style: 'thick', color: { rgb: 'FF8904' } },
    },
  },
};

export function buildTanggalRoutingSheet(wb, dateStr, t) {
  const formattedDate = formatDateUniversal(dateStr, 'DD-MM-YYYY');
  const ws = XLSX.utils.aoa_to_sheet([
    [t('common.routing_date').toUpperCase()],
    [formattedDate, null, null, null, null, null, null],
  ]);
  ws['A1'].s = {
    font: { bold: true, sz: 24, color: { rgb: 'FF0000' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
  ws['A2'].s = {
    font: { bold: true, sz: 60 },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
  ];
  ws['!cols'] = Array(7).fill({ wch: 15 });
  XLSX.utils.book_append_sheet(wb, ws, t('common.routing_date'));
}

export function buildStartFinishSheet(wb, timeDataObjects, t, driverData = []) {
  const headers = [
    t('common.license_number'),
    t('common.driver'),
    t('excel.reports.time_driver.start_date'),
    t('common.start_time'),
    t('excel.reports.time_driver.finish_date'),
    t('common.finish_time'),
    t('excel.reports.time_driver.duration'),
    t('excel.reports.time_driver.travel_dist'),
  ];

  const driverPlatLookup = new Map();
  (driverData || []).forEach((d) => {
    const dName = d.name && d.name !== '-' && d.name !== 'N/A' ? d.name.trim().toLowerCase() : '';
    const dPlat = d.plat && d.plat !== '-' && d.plat !== 'N/A' ? d.plat : '';
    if (dName && dPlat && !dPlat.toUpperCase().includes('DEMO')) {
      if (!driverPlatLookup.has(dName)) {
        driverPlatLookup.set(dName, dPlat);
      }
    }
  });

  const cleanedList = [];
  (timeDataObjects || []).forEach((i) => {
    const driver = i.driver && i.driver !== '-' && i.driver !== 'N/A' ? i.driver : '';
    if (!driver) return;

    let rawPlat =
      i.plat ||
      i.vehicleName ||
      i.vehiclePlat ||
      i.licenseNumber ||
      i.licensePlate ||
      i.vehicleId ||
      i.vehicle_name ||
      i.vehicle_plate ||
      i.plate_number ||
      i.plat_nomor ||
      (typeof i.vehicle === 'string' ? i.vehicle : '') ||
      i.assignedVehicle?.name ||
      i.assignedVehicle?.plat ||
      i.nopol ||
      '';

    if (!rawPlat || rawPlat === '-' || rawPlat === 'N/A') {
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

  const processedTime = uniqueEvents.map((item) => {
    const groupKey = `${item.driver}_${item.basePlat}`;
    return {
      ...item,
      isMultiple: (groupCountMap.get(groupKey) || 0) > 1,
    };
  });

  const sortTime = sortRows(processedTime, 'plat', 'driver');
  const sheetData = [
    headers,
    ...sortTime.map((i) => {
      let dur = calculateDurationAsQuotedHHMM(i.rawStart, i.rawFinish);
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

        if (rowData?.isMultiple) {
          ws[cellRef].s = { ...ws[cellRef].s, ...STYLES.orangeFill };
        }

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

export function buildMergedDetailSheet(wb, driverData, routingMap, deliveryMap, t) {
  const headers = [
    t('common.license_number'),
    t('common.driver'),
    t('common.weight'),
    t('common.volume'),
    t('common.distance'),
    t('excel.reports.truck_detail.total_visit'),
    t('excel.reports.truck_detail.total_delivery'),
    t('excel.reports.truck_detail.ship_duration'),
    t('excel.reports.truck_detail.delivered'),
    t('excel.reports.truck_detail.eta_first'),
    t('excel.reports.truck_detail.etd_hub'),
    t('excel.reports.truck_detail.info_manual'),
    t('excel.reports.truck_detail.info_diff_day'),
  ];

  const allVehicleGroups = new Map();

  (driverData || []).forEach((driver) => {
    const cleanDriver =
      driver.name && driver.name !== '-' && driver.name !== 'N/A' ? driver.name : '';
    const cleanPlat =
      driver.plat && driver.plat !== '-' && driver.plat !== 'N/A' ? driver.plat : '';
    if (!cleanDriver || !cleanPlat || cleanPlat.toUpperCase().includes('DEMO')) return;

    const basePlat = getBasePlate(cleanPlat) || cleanPlat;
    const key = `${cleanDriver}_${basePlat}`;
    if (!allVehicleGroups.has(key)) {
      allVehicleGroups.set(key, { driver: cleanDriver, plat: cleanPlat, key });
    }
  });

  routingMap.forEach((rData, key) => {
    const cleanDriver =
      rData.driver && rData.driver !== '-' && rData.driver !== 'N/A'
        ? rData.driver
        : key.split('_')[0] || '';
    const cleanPlat = rData.plat && rData.plat !== '-' && rData.plat !== 'N/A' ? rData.plat : '';
    if (!cleanDriver || !cleanPlat || cleanPlat.toUpperCase().includes('DEMO')) return;

    if (!allVehicleGroups.has(key)) {
      allVehicleGroups.set(key, {
        driver: cleanDriver,
        plat: cleanPlat,
        key,
      });
    }
  });

  deliveryMap.forEach((dData, key) => {
    const cleanDriver =
      dData.driver && dData.driver !== '-' && dData.driver !== 'N/A'
        ? dData.driver
        : key.split('_')[0] || '';
    const cleanPlat = dData.plat && dData.plat !== '-' && dData.plat !== 'N/A' ? dData.plat : '';
    if (!cleanDriver || !cleanPlat || cleanPlat.toUpperCase().includes('DEMO')) return;

    if (!allVehicleGroups.has(key)) {
      allVehicleGroups.set(key, {
        driver: cleanDriver,
        plat: cleanPlat,
        key,
      });
    }
  });

  const excelDataRows = [];
  const seenGroups = new Set();

  allVehicleGroups.forEach((item, key) => {
    if (
      !item.driver ||
      !item.plat ||
      item.plat === '-' ||
      item.driver === '-' ||
      item.plat?.toUpperCase().includes('DEMO')
    )
      return;
    if (seenGroups.has(key)) return;
    seenGroups.add(key);

    const rData = routingMap.get(key);
    const dData = deliveryMap.get(key);
    const hasRouting = rData?.hasTrips;
    const hasDelivery = dData && dData.totalOutlet > 0;

    let wPct = null,
      vPct = null,
      dist = null,
      vis = null,
      del = null,
      dur = null,
      pct = null,
      eta = null,
      etd = null,
      man = null,
      diff = null;
    let hType = 'none';

    if (hasRouting && !hasDelivery) {
      wPct = rData.weightPercentage > 0 ? `${rData.weightPercentage}%` : null;
      vPct = rData.volumePercentage > 0 ? `${rData.volumePercentage}%` : null;
      dist = rData.totalDistance > 0 ? (rData.totalDistance / 1000).toFixed(2) : null;
      dur = formatMinutesToHHMM(rData.shipDurationRaw);
      eta = rData.etaFirstStore;
      etd = rData.etdHub;
    } else if (!hasRouting && hasDelivery) {
      vis = dData.totalOutlet;
      del = dData.totalOutlet - (dData.failedCount || 0);
      man = dData.missingDataCustomers.map((m) => `• ${m.name}`).join('\n') || null;
      diff = dData.mismatchCustomers.map((m) => `• ${m.name}`).join('\n') || null;
      hType = dData.mismatchCustomers.length > 0 ? 'green' : 'blue';
    } else if (hasRouting && hasDelivery) {
      wPct = rData.weightPercentage > 0 ? `${rData.weightPercentage}%` : null;
      vPct = rData.volumePercentage > 0 ? `${rData.volumePercentage}%` : null;
      dist = rData.totalDistance > 0 ? (rData.totalDistance / 1000).toFixed(2) : '-';
      dur = rData.shipDurationRaw > 0 ? formatMinutesToHHMM(rData.shipDurationRaw) : '-';
      eta = rData.etaFirstStore;
      etd = rData.etdHub;
      vis = dData.totalOutlet;
      del = dData.totalOutlet - (dData.failedCount || 0);
      man = dData.missingDataCustomers.map((m) => `• ${m.name}`).join('\n') || null;
      diff = dData.mismatchCustomers.map((m) => `• ${m.name}`).join('\n') || null;

      const hasMan = dData.missingDataCustomers.length > 0;
      const hasDif = dData.mismatchCustomers.length > 0;

      if (hasMan && hasDif) hType = 'indigo';
      else if (hasMan) hType = 'blue';
      else if (hasDif) hType = 'magenta';
    }
    if (!isEmpty(del) || !isEmpty(vis)) {
      pct = (del / vis) * 100;
      pct = isNaN(pct) ? '0%' : `${pct.toFixed(2)}%`;
    }

    excelDataRows.push({
      plat: getBasePlate(item.plat) || item.plat || '-',
      driver: item.driver || '-',
      wPct,
      vPct,
      dist,
      vis,
      del,
      dur,
      pct,
      eta,
      etd,
      man,
      diff,
      hType,
      hasSplitTask: dData?.hasSplitTask || false,
    });
  });
  const sortData = sortRows(excelDataRows, 'plat', 'driver');
  const sheetData = [
    headers,
    ...sortData.map((r) => [
      r.plat,
      r.driver,
      r.wPct,
      r.vPct,
      r.dist,
      r.vis,
      r.del,
      r.dur,
      r.pct,
      r.eta,
      r.etd,
      r.man,
      r.diff,
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!view'] = { state: 'frozen', ySplit: 1 };
  ws['!cols'] = [
    { wch: 15 },
    { wch: 25 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 30 },
    { wch: 30 },
  ];
  ws['!rows'] = [{ hpt: 40 }];

  for (let R = 0; R < sheetData.length; ++R) {
    const rType = R > 0 ? sortData[R - 1].hType : 'none';
    let rowFill = null;
    if (rType === 'orange') rowFill = STYLES.redFill.fill;
    if (rType === 'blue') rowFill = STYLES.blueFill.fill;
    if (rType === 'magenta') rowFill = STYLES.magentaFill.fill;
    if (rType === 'indigo') rowFill = STYLES.indigoFill.fill;

    for (let C = 0; C < headers.length; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };

      if (R === 0) {
        const baseHeaderStyle = C >= 2 && C <= 7 ? STYLES.greenHeader : STYLES.header;
        ws[cellRef].s = {
          ...baseHeaderStyle,
          alignment: { ...baseHeaderStyle.alignment, wrapText: true, vertical: 'center' },
        };
      } else {
        ws[cellRef].s = C <= 1 ? STYLES.left : [11, 12].includes(C) ? STYLES.wrap : STYLES.center;
        if (rowFill && C >= 2 && C <= 7) {
          ws[cellRef].s = { ...ws[cellRef].s, fill: rowFill, font: { color: { rgb: 'FFFFFF' } } };
        }
        const isManualAssign = rType === 'blue' || rType === 'indigo';
        if (isManualAssign && [2, 3, 4, 7].includes(C)) {
          ws[cellRef].s = { ...ws[cellRef].s, font: { bold: true, color: { rgb: 'FFB3B3' } } };
        }

        if (C === 8) {
          const heatColor = heatMap(sortData[R - 1]?.pct);
          if (heatColor) {
            ws[cellRef].s = {
              ...ws[cellRef].s,
              fill: { patternType: 'solid', fgColor: { rgb: heatColor } },
            };
          }
        }

        if (C === 5 && sortData[R - 1]?.hasSplitTask) {
          const splitBorder = { style: 'medium', color: { rgb: 'ffbe7d' } };
          ws[cellRef].s = {
            ...ws[cellRef].s,
            border: {
              top: splitBorder,
              bottom: splitBorder,
              left: splitBorder,
              right: splitBorder,
            },
          };
        }
      }
    }
  }
  const dataCount = sheetData.length;
  XLSX.utils.sheet_add_aoa(
    ws,
    [
      [],
      [t('excel.reports.truck_detail.color_exp')],
      ['', t('excel.reports.truck_detail.orange')],
      ['', t('excel.reports.truck_detail.blue')],
      ['', t('excel.reports.truck_detail.magenta')],
      ['', t('excel.reports.truck_detail.indigo')],
      ['', t('excel.reports.truck_detail.red_text')],
    ],
    { origin: -1 }
  );

  ws[XLSX.utils.encode_cell({ r: dataCount + 1, c: 0 })] = {
    t: 's',
    v: t('excel.reports.truck_detail.color_exp'),
    s: { font: { bold: true, underline: true } },
  };
  ws[XLSX.utils.encode_cell({ r: dataCount + 2, c: 0 })] = {
    t: 's',
    v: '',
    s: {
      border: STYLES.orangeBorder.border,
      font: { color: { rgb: 'FFFFFF' } },
    },
  };
  ws[XLSX.utils.encode_cell({ r: dataCount + 3, c: 0 })] = {
    t: 's',
    v: '',
    s: { fill: STYLES.blueFill.fill, font: { color: { rgb: 'FFFFFF' } } },
  };
  ws[XLSX.utils.encode_cell({ r: dataCount + 4, c: 0 })] = {
    t: 's',
    v: '',
    s: { fill: STYLES.magentaFill.fill, font: { color: { rgb: 'FFFFFF' } } },
  };
  ws[XLSX.utils.encode_cell({ r: dataCount + 5, c: 0 })] = {
    t: 's',
    v: '',
    s: { fill: STYLES.indigoFill.fill, font: { color: { rgb: 'FFFFFF' } } },
  };
  ws[XLSX.utils.encode_cell({ r: dataCount + 6, c: 0 })] = {
    t: 's',
    v: 'Text',
    s: { font: { color: { rgb: 'ffb3b3' }, bold: true }, alignment: { horizontal: 'center' } },
  };

  XLSX.utils.book_append_sheet(wb, ws, t('excel.reports.truck_detail.sheet_name'));
}

export function buildRoVsRealSheet(
  wb,
  allTaskDataForSequence,
  hubTimesMap,
  driverData,
  hasPendingGR,
  t
) {
  const headers = [
    t('common.flow'),
    t('common.license_number'),
    t('common.driver'),
    t('common.customer_name'),
    t('excel.reports.ro_real.delivery_status'),
    t('common.open_time'),
    t('common.close_time'),
    t('common.eta'),
    t('common.actual_arrival'),
    t('common.etd'),
    t('common.actual_departure'),
    t('common.visit_plan'),
    t('common.visit_actual'),
    t('common.ro_seq'),
    t('common.actual_seq'),
    t('excel.reports.ro_real.is_match'),
    t('excel.reports.ro_real.is_within_hours'),
  ];

  const tasksByGroupMap = new Map();
  const groupInfoMap = new Map();

  allTaskDataForSequence.forEach((task) => {
    const gKey = task.groupKey || `${task.driver}_${getBasePlate(task.plat) || task.plat}`;
    if (!tasksByGroupMap.has(gKey)) tasksByGroupMap.set(gKey, []);
    tasksByGroupMap.get(gKey).push(task);
    if (!groupInfoMap.has(gKey)) {
      groupInfoMap.set(gKey, {
        driver: task.driver,
        plat: task.plat,
        basePlat: task.basePlat || getBasePlate(task.plat) || task.plat,
        gKey,
      });
    }
  });

  const sortedGroups = sortRows(Array.from(groupInfoMap.values()), 'plat', 'driver');
  const sheetData = [headers];
  const manualAssignRows = new Set();

  sortedGroups.forEach((group) => {
    const tasks = tasksByGroupMap.get(group.gKey) || [];
    const hT = hubTimesMap.get(group.gKey) ||
      hubTimesMap.get(group.driver) || { hubETD: null, hubETA: null };

    sheetData.push([
      null,
      null,
      null,
      'HUB',
      null,
      null,
      null,
      null,
      null,
      hT.hubETD,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ]);

    tasks
      .sort((a, b) => (a.roSequence || 0) - (b.roSequence || 0))
      .forEach((task) => {
        const cData = `${task.customerName} - ${task.customerId} - ${task.locationId}`;
        const ro = task.roSequence || '-';
        const real = task.realSequence || '-';
        const isMatch = isEmpty(real)
          ? '-'
          : ro === real
            ? t('common.status.match')
            : t('common.status.mismatch');

        let wHours = '-';
        if (task.isWithinHoursStatus === 'yes') wHours = t('dashboard.tab.routingreal.yes');
        else if (task.isWithinHoursStatus === 'early')
          wHours = t('dashboard.tab.routingreal.early');
        else if (task.isWithinHoursStatus === 'no') wHours = t('dashboard.tab.routingreal.no');

        const isManualAssign =
          isEmpty(task.eta) ||
          task.eta === '-' ||
          isEmpty(task.etd) ||
          task.etd === '-' ||
          isEmpty(task.roSequence) ||
          task.roSequence === '-' ||
          task.roSequence === 0;

        if (isManualAssign) manualAssignRows.add(sheetData.length);

        sheetData.push([
          task.flow || '-',
          getBasePlate(task.plat) || '-',
          task.driver || '-',
          cData,
          task.statusLabel || '-',
          task.openTime || '-',
          task.closeTime || '-',
          task.eta || '-',
          task.actualArrival || '-',
          task.etd || '-',
          task.actualDeparture || '-',
          task.visitTime || '-',
          task.actualVisitTime,
          ro,
          real,
          isMatch,
          wHours,
        ]);
      });

    sheetData.push([
      null,
      null,
      null,
      'HUB',
      null,
      null,
      null,
      hT.hubETA,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
    sheetData.push(Array(17).fill(null));
  });

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!view'] = { state: 'frozen', ySplit: 1 };

  ws['!cols'] = headers.map((h, i) => {
    if (i === 11 || i === 12) return { wch: 12 };
    return {
      wch: Math.min(
        sheetData.reduce((m, r) => Math.max(m, r[i] ? String(r[i]).length : 0), 0) + 2,
        45
      ),
    };
  });

  const headerFillMap = {
    5: 'A7F3D0',
    6: 'A7F3D0',
    7: 'FED7AA',
    8: 'FED7AA',
    9: 'FDE68A',
    10: 'FDE68A',
    11: 'FBCFE8',
    12: 'FBCFE8',
    13: 'BFDBFE',
    14: 'BFDBFE',
  };

  const dataFillMap = {
    5: 'DCFCE7',
    6: 'DCFCE7',
    7: 'FFEDD5',
    8: 'FFEDD5',
    9: 'FEF3C7',
    10: 'FEF3C7',
    11: 'FCE7F3',
    12: 'FCE7F3',
    13: 'DBEAFE',
    14: 'DBEAFE',
  };

  for (let R = 0; R < sheetData.length; ++R) {
    const isHubRow = ws[XLSX.utils.encode_cell({ r: R, c: 3 })]?.v === 'HUB';

    for (let C = 0; C < 17; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };

      if (R === 0) {
        const headFill = headerFillMap[C];
        ws[cellRef].s = {
          ...STYLES.center,
          font: { bold: true },
          alignment: { wrapText: true, horizontal: 'center', vertical: 'center' },
          ...(headFill ? { fill: { patternType: 'solid', fgColor: { rgb: headFill } } } : {}),
        };
      } else if (isHubRow) {
        ws[cellRef].s = [3, 7, 9].includes(C)
          ? STYLES.hubRed
          : { font: { color: { rgb: 'FF0000' } } };
      } else {
        const isSpacerRow =
          isEmpty(ws[XLSX.utils.encode_cell({ r: R, c: 0 })]?.v) &&
          isEmpty(ws[XLSX.utils.encode_cell({ r: R, c: 2 })]?.v);
        if (isSpacerRow) continue;

        const dataFill = dataFillMap[C];
        const baseBgStyle = dataFill
          ? { fill: { patternType: 'solid', fgColor: { rgb: dataFill } } }
          : {};

        if (manualAssignRows.has(R)) {
          ws[cellRef].s = {
            ...(C <= 3 ? STYLES.left : STYLES.center),
            fill: { fgColor: { rgb: 'FECACA' }, patternType: 'solid' },
          };
        } else {
          ws[cellRef].s = {
            ...(C <= 3 ? STYLES.left : STYLES.center),
            ...baseBgStyle,
          };
        }

        if (typeof ws[cellRef].v === 'number') ws[cellRef].t = 'n';

        if (C === 15 && ws[cellRef].v && ws[cellRef].v !== '-') {
          ws[cellRef].s = {
            ...ws[cellRef].s,
            font: {
              bold: true,
              color: { rgb: ws[cellRef].v === t('common.status.match') ? '16A34A' : 'DC2626' },
            },
          };
        }
        if (C === 16 && ws[cellRef].v && ws[cellRef].v !== '-') {
          let color = null;
          if (ws[cellRef].v === t('dashboard.tab.routingreal.yes')) color = '16A34A';
          else if (ws[cellRef].v === t('dashboard.tab.routingreal.early')) color = 'F59E0B';
          else if (ws[cellRef].v === t('dashboard.tab.routingreal.no')) color = 'DC2626';
          if (color)
            ws[cellRef].s = { ...ws[cellRef].s, font: { bold: true, color: { rgb: color } } };
        }
      }
    }
  }
  XLSX.utils.book_append_sheet(wb, ws, t('excel.reports.ro_real.sheet_name'));
}

export function buildTruckUsageSheet(wb, truckUsageCount, vehicleTypes, t) {
  const masterNames = vehicleTypes.map((v) => (typeof v === 'string' ? v : v.name));
  const headers = [
    t('excel.reports.truck_usage.vehicle_type'),
    t('excel.reports.truck_usage.count_dry'),
    t('excel.reports.truck_usage.count_frozen'),
  ];
  const finalUsageData = [headers];

  masterNames.forEach((type) => {
    if (truckUsageCount[type]) {
      const dry = truckUsageCount[type]['Dry'] || 0;
      const frozen = truckUsageCount[type]['Frozen'] || 0;
      finalUsageData.push([type, dry > 0 ? dry : null, frozen > 0 ? frozen : null]);
      delete truckUsageCount[type];
    }
  });

  Object.keys(truckUsageCount).forEach((type) => {
    const dry = truckUsageCount[type]['Dry'] || 0;
    const frozen = truckUsageCount[type]['Frozen'] || 0;
    if (dry > 0 || frozen > 0) {
      finalUsageData.push([type || null, dry > 0 ? dry : null, frozen > 0 ? frozen : null]);
    }
  });

  const ws = XLSX.utils.aoa_to_sheet(finalUsageData);
  ws['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }];

  for (let r = 0; r < finalUsageData.length; r++) {
    for (let c = 0; c < 3; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
      if (r === 0) ws[cellRef].s = STYLES.header;
      else {
        ws[cellRef].s = c === 0 ? STYLES.left : STYLES.center;
        if (c > 0 && ws[cellRef].v) ws[cellRef].t = 'n';
      }
    }
  }
  XLSX.utils.book_append_sheet(wb, ws, t('excel.reports.truck_usage.sheet_name'));
}

export function buildDistanceSummary(wb, driverData, routingMap, timeDataObjects, t) {
  let estDryT = 0,
    estDryD = 0,
    estFrzT = 0,
    estFrzD = 0;
  let actDryT = 0,
    actDryD = 0,
    actFrzT = 0,
    actFrzD = 0;

  const seenGroupsEst = new Set();
  routingMap.forEach((rData, key) => {
    if (seenGroupsEst.has(key)) return;
    seenGroupsEst.add(key);

    if (rData?.hasTrips) {
      const dist = rData.totalDistance || 0;
      const dur = rData.shipDurationRaw || 0;

      const driverName = rData.driver || key.split('_')[0] || '';
      if (driverName.toUpperCase().includes('DRY')) {
        estDryT += dur;
        estDryD += dist;
      } else if (driverName.toUpperCase().includes('FRZ')) {
        estFrzT += dur;
        estFrzD += dist;
      }
    }
  });

  const mergedTimeMap = new Map();
  (timeDataObjects || []).forEach((i) => {
    const rawPlat =
      i.plat ||
      i.vehicleName ||
      i.vehiclePlat ||
      i.licenseNumber ||
      i.licensePlate ||
      i.vehicleId ||
      i.vehicle_name ||
      i.vehicle_plate ||
      i.plate_number ||
      i.plat_nomor ||
      (typeof i.vehicle === 'string' ? i.vehicle : '') ||
      i.assignedVehicle?.name ||
      i.assignedVehicle?.plat ||
      i.nopol ||
      '';
    const basePlat = getBasePlate(rawPlat) || rawPlat || '';
    const key = `${i.driver}_${basePlat}`;
    if (!mergedTimeMap.has(key)) {
      mergedTimeMap.set(key, { ...i, plat: rawPlat || i.plat });
    } else {
      const ext = mergedTimeMap.get(key);
      ext.travelTimeVal = (Number(ext.travelTimeVal) || 0) + (Number(i.travelTimeVal) || 0);
      ext.totalDistance = (Number(ext.totalDistance) || 0) + (Number(i.totalDistance) || 0);
    }
  });

  Array.from(mergedTimeMap.values()).forEach((i) => {
    if (i.driver.toUpperCase().includes('DRY')) {
      actDryT += i.travelTimeVal || 0;
      actDryD += i.totalDistance || 0;
    } else if (i.driver.toUpperCase().includes('FRZ')) {
      actFrzT += i.travelTimeVal || 0;
      actFrzD += i.totalDistance || 0;
    }
  });

  const sheetData = [
    [
      t('excel.reports.dist_summary.estimation'),
      null,
      null,
      '',
      t('excel.reports.dist_summary.actual'),
      null,
      null,
    ],
    [
      t('excel.reports.dist_summary.category'),
      t('excel.reports.dist_summary.time_travel'),
      t('common.distance'),
      '',
      t('excel.reports.dist_summary.category'),
      t('excel.reports.dist_summary.time_travel'),
      t('common.distance'),
    ],
    [
      'Dry',
      formatMinutesToHHMM(estDryT),
      Number((estDryD / 1000).toFixed(2)),
      '',
      'Dry',
      formatMinutesToHHMM(actDryT),
      Number(actDryD.toFixed(2)),
    ],
    [
      'Frozen',
      formatMinutesToHHMM(estFrzT),
      Number((estFrzD / 1000).toFixed(2)),
      '',
      'Frozen',
      formatMinutesToHHMM(actFrzT),
      Number(actFrzD.toFixed(2)),
    ],
    [
      'Total',
      formatMinutesToHHMM(estDryT + estFrzT),
      Number(((estDryD + estFrzD) / 1000).toFixed(2)),
      '',
      'Total',
      formatMinutesToHHMM(actDryT + actFrzT),
      Number((actDryD + actFrzD).toFixed(2)),
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
    { s: { r: 0, c: 4 }, e: { r: 0, c: 6 } },
  ];

  ws['!cols'] = [
    { wch: 15 },
    { wch: 20 },
    { wch: 25 },
    { wch: 3 },
    { wch: 15 },
    { wch: 20 },
    { wch: 25 },
  ];

  const borderAll = {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' },
  };

  for (let R = 0; R < sheetData.length; ++R) {
    for (let C = 0; C < 7; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };

      if (C === 3) continue;

      let baseStyle = STYLES.center;
      if (R === 0) {
        if (C === 0 || C === 4) baseStyle = STYLES.greenHeader;
      } else if (R === 1) {
        baseStyle = STYLES.header;
      }

      ws[cellRef].s = { ...baseStyle, border: borderAll };
    }
  }
  XLSX.utils.book_append_sheet(wb, ws, t('excel.reports.dist_summary.sheet_name'));
}

export function buildPendingSOSheet(wb, pendingSOData, hasPendingGR, t) {
  const headers = [
    t('common.flow'),
    t('common.so_number'),
    t('common.date'),
    t('common.license_number'),
    t('common.driver'),
    t('common.status.cancel'),
    t('common.status.partial'),
    t('common.status.pending'),
  ];
  if (hasPendingGR) headers.push(t('common.status.pending_gr'));
  headers.push(
    t('excel.reports.pending_so.reason'),
    '',
    t('common.open_time'),
    t('common.close_time'),
    t('common.eta'),
    t('common.etd'),
    t('common.actual_arrival'),
    t('common.actual_departure'),
    t('common.visit_plan'),
    t('common.visit_actual'),
    t('common.customer_id'),
    t('common.ro_seq'),
    t('common.actual_seq'),
    t('common.storage_type')
  );

  const sepIdx = hasPendingGR ? 10 : 9;
  const sheetData = [
    headers,
    ...pendingSOData.map((r) => {
      let fDate = r.deliveryDate;
      if (
        fDate &&
        typeof fDate === 'string' &&
        fDate.includes('-') &&
        fDate.split('-')[0].length === 4
      ) {
        const [y, m, d] = fDate.split('-');
        fDate = `${d}-${m}-${y}`;
      }

      const row = [
        r.flow,
        r.orderId,
        fDate,
        getBasePlate(r.plat),
        r.driver,
        r.fakturBatal,
        r.terkirimSebagian,
        r.pending,
      ];
      if (hasPendingGR) row.push(r.pendingGR);
      row.push(
        r.reason,
        null,
        r.openTime,
        r.closeTime,
        r.eta,
        r.etd,
        r.actualArrival,
        r.actualDeparture,
        r.visitTime,
        r.actualVisitTime,
        r.customerId,
        r.roSequence,
        r.realSequence || null,
        r.temperature
      );
      return row;
    }),
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!view'] = { state: 'frozen', ySplit: 1 };
  ws['!cols'] = headers.map((_, i) => ({ wch: i === sepIdx ? 3 : 20 }));

  for (let r = 0; r < sheetData.length; r++) {
    for (let c = 0; c < headers.length; c++) {
      const cell = XLSX.utils.encode_cell({ r, c });
      if (!ws[cell]) ws[cell] = { t: 's', v: '' };

      if (r === 0) {
        if (c === sepIdx) {
          ws[cell].s = { ...STYLES.center, ...STYLES.separator };
        } else if (c === 0 || c === 1) {
          ws[cell].s = STYLES.header;
        } else if (c < sepIdx) {
          ws[cell].s = STYLES.greenHeader;
        } else {
          ws[cell].s = STYLES.greenHeader;
        }
      } else {
        if (c === sepIdx) {
          ws[cell].s = { ...STYLES.center, ...STYLES.separator };
        } else if (c === 2) {
          ws[cell].s = STYLES.center;
        } else if (c < sepIdx) {
          ws[cell].s = STYLES.left;
        } else {
          ws[cell].s = STYLES.center;
        }
      }
    }
  }
  XLSX.utils.book_append_sheet(wb, ws, t('excel.reports.pending_so.sheet_name'));
}

export function buildUpdateLonglatSheet(wb, updateLonglatData, t) {
  const headers = [
    t('common.customer_name'),
    t('common.customer_id'),
    t('common.location_id'),
    t('excel.reports.update_coord.new_longlat'),
    t('common.dist_diff'),
  ];
  updateLonglatData.sort((a, b) => (a.distanceDiff || Infinity) - (b.distanceDiff || Infinity));
  const sheetData = [
    headers,
    ...updateLonglatData.map((r) => [
      r.customerName,
      r.customerId,
      r.locationId,
      r.newLonglat,
      r.distanceDiff,
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!cols'] = headers.map(() => ({ wch: 20 }));
  for (let r = 0; r < sheetData.length; r++) {
    for (let c = 0; c < 5; c++) {
      const cell = XLSX.utils.encode_cell({ r, c });
      if (ws[cell]) ws[cell].s = r === 0 ? STYLES.header : STYLES.center;
    }
  }
  XLSX.utils.book_append_sheet(wb, ws, t('excel.reports.update_coord.sheet_name'));
}

export function buildHelpSheet(wb, filteredResults, t) {
  const headers = [
    t('excel.reports.help.routing_id'),
    t('common.routing_name'),
    t('common.created_by'),
    t('common.created_at'),
    t('excel.reports.help.routing_result'),
  ];
  const rows = [];
  filteredResults.forEach((i) => {
    const success =
      i.summary?.routedVisits || i.summary?.totalVisits - i.summary?.droppedVisits || 0;
    const res = i.summary
      ? t('excel.reports.help.dispatch_msg', { success, total: i.summary.totalVisits })
      : '-';

    let routingTime = '-';
    if (i.createdTime) {
      const utcDate = new Date(i.createdTime);
      if (!isNaN(utcDate.getTime())) {
        utcDate.setTime(utcDate.getTime() + 7 * 60 * 60 * 1000);
        const map = {
          DD: String(utcDate.getUTCDate()).padStart(2, '0'),
          MM: String(utcDate.getUTCMonth() + 1).padStart(2, '0'),
          YYYY: utcDate.getUTCFullYear(),
          HH: String(utcDate.getUTCHours()).padStart(2, '0'),
          mm: String(utcDate.getUTCMinutes()).padStart(2, '0'),
          ss: String(utcDate.getUTCSeconds()).padStart(2, '0'),
        };
        routingTime = `${map.DD}-${map.MM}-${map.YYYY} ${map.HH}:${map.mm}:${map.ss}`;
      } else {
        routingTime = i.createdTime;
      }
    }

    rows.push([i._id, i.name, i.user?.name, routingTime, res]);
  });
  const sheetData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!cols'] = headers.map(() => ({ wch: 25 }));
  for (let r = 0; r < sheetData.length; r++) {
    for (let c = 0; c < 5; c++) {
      const cell = XLSX.utils.encode_cell({ r, c });
      if (ws[cell]) ws[cell].s = r === 0 ? STYLES.header : STYLES.left;
    }
  }
  XLSX.utils.book_append_sheet(wb, ws, t('excel.reports.help.sheet_name'));
}
