import * as XLSX from 'xlsx-js-style';
import { STYLES } from './shared';

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
