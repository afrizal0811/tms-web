import { formatDateUniversal } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';

const HEADERS = [
  'Tanggal',
  'No of Trucks DRY',
  'No of Trucks FRZ',
  'No of Trucks',
  'No of TT DRY',
  'No of TT FRZ',
  'No of RT Dry',
  'No of RT FRZ',
  '',
  'RT by Routing',
  'RT by Driver',
  'RT by Sales',
  'RT by Customer',
  'RT by Other',
  'Est Operating Hours DRY',
  'Est Operating Hours FRZ',
  '',
  'Act Operating hours',
  'Est Distance DRY',
  'Est Distance FRZ',
  '',
  'Act Distance DRY',
  'Act Distance FRZ',
  'Act Distance',
  'Loading Capacity DRY (Kg)',
  'Loading Volume DRY (Kg)',
  'Loading Capacity DRY (Cbm)',
  'Loading Volume DRY (Cbm)',
  'Loading Capacity FRZ (Kg)',
  'Loading Volume FRZ (Kg)',
  'Loading Capacity FRZ (Cbm)',
  'Loading Volume FRZ (Cbm)',
  '',
  'No of master maintenance',
  'No of Route Reviewing',
];

const SEPARATOR_INDICES = [8, 16, 20, 32];
const RT_INDICES = [9, 10, 11, 12, 13];

function mapKpiRecordToRow(record) {
  const actHourTotal = Number(record.act_hour_dry || 0) + Number(record.act_hour_frz || 0);
  const actDistTotal = Number(
    (Number(record.act_dist_dry || 0) + Number(record.act_dist_frz || 0)).toFixed(2)
  );

  return [
    formatDateUniversal(record.date, 'DD-MM-YYYY'),
    Number(record.truck_dry ?? 0),
    Number(record.truck_frz ?? 0),
    Number(record.total_truck ?? 0),
    Number(record.task_dry ?? 0),
    Number(record.task_frz ?? 0),
    Number(record.pending_dry ?? 0),
    Number(record.pending_frz ?? 0),
    '',
    record.pending_routing ?? null,
    record.pending_driver ?? null,
    record.pending_sales ?? null,
    record.pending_customer ?? null,
    record.pending_other ?? null,
    Number(record.est_hour_dry ?? 0),
    Number(record.est_hour_frz ?? 0),
    '',
    actHourTotal,
    Number(record.est_dist_dry ?? 0),
    Number(record.est_dist_frz ?? 0),
    '',
    Number(record.act_dist_dry ?? 0),
    Number(record.act_dist_frz ?? 0),
    actDistTotal,
    Number(record.capacity_kg_dry ?? 0),
    Number(record.total_kg_dry ?? 0),
    Number(record.capacity_cbm_dry ?? 0),
    Number(record.total_cbm_dry ?? 0),
    Number(record.capacity_kg_frz ?? 0),
    Number(record.total_kg_frz ?? 0),
    Number(record.capacity_cbm_frz ?? 0),
    Number(record.total_cbm_frz ?? 0),
    '',
    Math.round(Number(record.updated_master ?? 0)),
    Math.abs(Number(record.route_review ?? 0)),
  ];
}

export function generateSheetDataKPI(kpiRecords = []) {
  const records = Array.isArray(kpiRecords) ? kpiRecords : [kpiRecords];
  const dataRows = records.map(mapKpiRecordToRow);
  const dataEndRow = dataRows.length;
  const noteStartRow = dataEndRow + 2;

  const sheetData = [
    HEADERS,
    ...dataRows,
    [],
    ['NOTE'],
    ['Saat paste di google sheet, tekan kombinasi CTRL+SHIFT+V'],
    ['', 'data detail alasan pending belum lengkap'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  const styleHeader = {
    font: { bold: true },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    fill: { fgColor: { rgb: 'EFEFEF' } },
    border: {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    },
  };
  const styleSeparator = { fill: { fgColor: { rgb: 'FF0000' } } };
  const styleRtError = {
    fill: { fgColor: { rgb: 'F6C5C0' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
  const styleCenter = { alignment: { horizontal: 'center', vertical: 'center' } };
  const styleNoteTitle = {
    font: { color: { rgb: 'FF0000' }, underline: true, bold: true },
    alignment: { horizontal: 'left', vertical: 'center' },
  };
  const styleNoteText = {
    font: { italic: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'left', vertical: 'center' },
  };
  const styleLegendColor = {
    fill: { fgColor: { rgb: 'F6C5C0' } },
  };
  const styleLegendText = {
    alignment: { horizontal: 'left', vertical: 'center' },
  };

  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cell]) ws[cell] = { v: '', t: 's' };

      if (R === noteStartRow && C === 0) ws[cell].s = styleNoteTitle;
      else if (R === noteStartRow + 1 && C === 0) ws[cell].s = styleNoteText;
      else if (R === noteStartRow + 2 && C === 0) ws[cell].s = styleLegendColor;
      else if (R === noteStartRow + 2 && C === 1) ws[cell].s = styleLegendText;
      else if (R <= dataEndRow) {
        if (SEPARATOR_INDICES.includes(C)) ws[cell].s = styleSeparator;
        else if (R === 0) ws[cell].s = styleHeader;
        else if (RT_INDICES.includes(C)) {
          const rowRecord = records[R - 1];
          ws[cell].s = rowRecord?.hasIncompletePendingDetail ? styleRtError : styleCenter;
          if (typeof ws[cell].v === 'number') {
            ws[cell].t = 'n';
            ws[cell].z = '0';
          }
        } else {
          ws[cell].s = styleCenter;
          if (typeof ws[cell].v === 'number') {
            ws[cell].t = 'n';
            if ((C >= 18 && C <= 19) || (C >= 21 && C <= 31)) ws[cell].z = '0.00';
            if (C >= 33) ws[cell].z = '0';
          }
        }
      }
    }
  }

  ws['!cols'] = HEADERS.map((_, i) =>
    SEPARATOR_INDICES.includes(i) ? { wch: 2 } : i === 0 ? { wch: 15 } : { wch: 20 }
  );
  ws['!merges'] = [
    { s: { r: noteStartRow, c: 0 }, e: { r: noteStartRow, c: 6 } },
    { s: { r: noteStartRow + 1, c: 0 }, e: { r: noteStartRow + 1, c: 6 } },
    { s: { r: noteStartRow + 2, c: 1 }, e: { r: noteStartRow + 2, c: 6 } },
  ];

  return ws;
}
