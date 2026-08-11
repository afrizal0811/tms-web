import { getBasePlate, isEmpty, sortRows } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import { STYLES } from './shared';

export function buildRoVsRealSheet(
  wb,
  allTaskDataForSequence,
  hubTimesMap,
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
  ws['!cols'] = headers.map((h, i) =>
    i === 11 || i === 12
      ? { wch: 12 }
      : {
          wch: Math.min(
            sheetData.reduce((m, r) => Math.max(m, r[i] ? String(r[i]).length : 0), 0) + 2,
            45
          ),
        }
  );

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
          ws[cellRef].s = { ...(C <= 3 ? STYLES.left : STYLES.center), ...baseBgStyle };
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
