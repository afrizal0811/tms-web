import * as XLSX from 'xlsx-js-style';
import { STYLES } from './shared';

export function buildHelpSheet(wb, filteredResults, t) {
  const headers = [
    t('common.routing_id'),
    t('common.routing_name'),
    t('common.created_by'),
    t('common.created_time'),
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
