// File: src/lib/reportGenerators/bread/breadReport.js

import { getBasePlate, normalizeEmail } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';

const BREAD_KEYWORDS = ['BUN'];

const CENTER_COL_EXCEPTIONS = new Set([2, 3]);

const headerStyle = {
  font: { bold: true, color: { rgb: 'FFFFFF' } },
  fill: { patternType: 'solid', fgColor: { rgb: '0369A1' } },
  alignment: { horizontal: 'center', vertical: 'center' },
};


export const buildDriverMap = (driverData) => {
  return (driverData || []).reduce((acc, d) => {
    const email = normalizeEmail(d.email);
    if (email) {
      acc[email] = { name: d.name || null, plat: getBasePlate(d.plat) || '-' };
    }
    return acc;
  }, {});
};

export const extractBreadRows = (tasksData, driverMap, dateStr) => {
  const rows = [];

  (tasksData || []).forEach((task) => {
    const rawAssignee = Array.isArray(task.assignee) ? task.assignee[0] : task.assignee;
    const assigneeEmail = normalizeEmail(rawAssignee);
    const driverInfo = driverMap[assigneeEmail];

    const driverName = driverInfo?.name || rawAssignee || '-';
    const platNomor = driverInfo?.plat || '-';

     const breadProducts = (task.listProduct || []).filter(
       (p) =>
         typeof p.title === 'string' &&
         BREAD_KEYWORDS.some((kw) => p.title.toUpperCase().includes(kw))
     );
    breadProducts.forEach((p) => {
      rows.push([
        dateStr,
        platNomor,
        driverName,
        p.title ?? '-',
        p.qtyProcessed ?? '-',
        p.content ?? '-',
        p.volume ?? '-',
        p.weight ?? '-',
        p.caption ?? '-',
      ]);
    });
  });

  return rows;
};

export const generateBreadWorkbook = (allRows, translate) => {
  const HEADERS = [
    translate('common.delivery_date'),
    translate('common.license_number'),
    translate('common.driver'),
    translate('excel.bread.item'),
    translate('excel.bread.qty'),
    translate('excel.bread.uom'),
    translate('excel.bread.volume'),
    translate('excel.bread.weight'),
    translate('common.so_number'),
  ];

  const wb = XLSX.utils.book_new();
  wb.Props = { Title: translate('report.bread_summary') };

  const sheetData = [HEADERS, ...allRows];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  const range = XLSX.utils.decode_range(ws['!ref']);

  for (let C = 0; C <= range.e.c; C++) {
    const cellAddr = XLSX.utils.encode_cell({ r: 0, c: C });
    if (ws[cellAddr]) ws[cellAddr].s = headerStyle;
  }

  for (let R = 1; R <= range.e.r; R++) {
    for (let C = 0; C <= range.e.c; C++) {
      const cellAddr = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellAddr]) continue;
      if (!CENTER_COL_EXCEPTIONS.has(C)) {
        ws[cellAddr].s = { alignment: { horizontal: 'center', vertical: 'center' } };
      }
    }
  }

  const PADDING = 4;
  const colWidths = HEADERS.map((h) => h.length);

  allRows.forEach((row) => {
    row.forEach((val, C) => {
      const len = val != null ? String(val).length : 0;
      if (len > colWidths[C]) colWidths[C] = len;
    });
  });

  ws['!cols'] = colWidths.map((w) => ({ wch: w + PADDING }));

  XLSX.utils.book_append_sheet(wb, ws, translate('report.bread_summary'));
  return wb;
};
