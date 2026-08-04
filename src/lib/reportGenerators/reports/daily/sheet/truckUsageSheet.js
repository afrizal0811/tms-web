import * as XLSX from 'xlsx-js-style';
import { STYLES } from './shared';

export function buildTruckUsageSheet(wb, truckUsageCount, vehicleTypes, t) {
  const masterNames = vehicleTypes.map((v) => (typeof v === 'string' ? v : v.name));
  const headers = [
    t('excel.reports.truck_usage.vehicle_type'),
    t('excel.reports.truck_usage.count_dry'),
    t('excel.reports.truck_usage.count_frozen'),
  ];
  const finalUsageData = [headers];

  const keys = Object.keys(truckUsageCount).sort((a, b) => {
    const idxA = masterNames.indexOf(a);
    const idxB = masterNames.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  keys.forEach((type) => {
    const dry = truckUsageCount[type]['Dry'] || 0;
    const frozen = truckUsageCount[type]['Frozen'] || 0;
    finalUsageData.push([type || null, dry > 0 ? dry : null, frozen > 0 ? frozen : null]);
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
