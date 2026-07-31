import { formatDateUniversal } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';

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
