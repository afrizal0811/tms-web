import { getBasePlate, normalizeEmail, parseCustomerString } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';

const BREAD_KEYWORDS = ['BUN'];

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

const toNumOrDash = (val) => {
  if (val == null) return '-';
  const n = Number(val);
  return isNaN(n) ? '-' : n;
};

export const extractBreadRows = (tasksData, driverMap, dateStr) => {
  const rows = [];

  (tasksData || []).forEach((task) => {
    const rawAssignee = Array.isArray(task.assignee) ? task.assignee[0] : task.assignee;
    const assigneeEmail = normalizeEmail(rawAssignee);
    const driverInfo = driverMap[assigneeEmail];

    const driverName = driverInfo?.name || rawAssignee || '-';
    const platNomor = driverInfo?.plat || '-';

    const parsedCustomer = parseCustomerString(task.customerOrder);
    const custName = parsedCustomer.name || '-';
    const custId = parsedCustomer.id || '-';
    const locId = parsedCustomer.location || '-';
    const address = task.address || '-';

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
        toNumOrDash(p.qtyProcessed),
        p.content ?? '-',
        toNumOrDash(p.volume),
        toNumOrDash(p.weight),
        p.caption ?? '-',
        custName,
        custId,
        locId,
        address,
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
    translate('common.volume'),
    translate('common.weight'),
    translate('common.so_number'),
    translate('common.customer_name') || 'Customer Name',
    translate('common.customer_id') || 'Customer ID',
    translate('common.location_id') || 'Location ID',
    translate('common.address') || 'Address',
  ];

  const wb = XLSX.utils.book_new();
  wb.Props = { Title: translate('report.bread_report') };

  const sheetData = [HEADERS, ...allRows];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  const range = XLSX.utils.decode_range(ws['!ref']);
  const leftAlignedCols = new Set([2, 3, 9, 12]);

  for (let R = 0; R <= range.e.r; R++) {
    for (let C = 0; C <= range.e.c; C++) {
      const cellAddr = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellAddr]) continue;

      if (R === 0) {
        ws[cellAddr].s = headerStyle;
      } else {
        const alignHoriz = leftAlignedCols.has(C) ? 'left' : 'center';
        ws[cellAddr].s = { alignment: { horizontal: alignHoriz, vertical: 'center' } };
      }
    }
  }

  const colWidths = HEADERS.map((h) => h.length);

  allRows.forEach((row) => {
    row.forEach((val, C) => {
      const len = val != null ? String(val).length : 0;
      if (len > colWidths[C]) colWidths[C] = len;
    });
  });

  ws['!cols'] = colWidths.map((w) => ({ wch: Math.min(w + 4, 60) }));

  XLSX.utils.book_append_sheet(wb, ws, translate('report.bread_report'));
  return wb;
};
