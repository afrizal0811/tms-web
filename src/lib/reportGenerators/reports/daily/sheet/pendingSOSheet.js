import { getBasePlate } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import { STYLES } from './shared';

export function buildPendingSOSheet(wb, pendingSOData, hasPendingGR, t) {
  const headers = [
    t('common.flow'),
    t('common.invoice_number'),
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
      if (fDate && typeof fDate === 'string' && /^\d{4}-/.test(fDate)) {
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
        if (c === sepIdx) ws[cell].s = { ...STYLES.center, ...STYLES.separator };
        else if (c <= 1) ws[cell].s = STYLES.header;
        else ws[cell].s = STYLES.greenHeader;
      } else {
        if (c === sepIdx) ws[cell].s = { ...STYLES.center, ...STYLES.separator };
        else if (c === 2 || c >= sepIdx) ws[cell].s = STYLES.center;
        else ws[cell].s = STYLES.left;
      }
    }
  }
  XLSX.utils.book_append_sheet(wb, ws, t('excel.reports.pending_so.sheet_name'));
}
