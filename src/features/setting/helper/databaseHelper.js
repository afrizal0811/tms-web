import { formatDateUniversal, formatDurationHHMMSS, parseCustomerString } from '@/lib/utils';
import JSZip from 'jszip';
import * as XLSX from 'xlsx-js-style';

const headerStyle = {
  font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 },
  fill: { fgColor: { rgb: '334155' } },
  alignment: { horizontal: 'center', vertical: 'center' },
  border: {
    top: { style: 'thin', color: { rgb: 'CBD5E1' } },
    bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
    left: { style: 'thin', color: { rgb: 'CBD5E1' } },
    right: { style: 'thin', color: { rgb: 'CBD5E1' } },
  },
};

const cellCenter = {
  font: { sz: 9 },
  alignment: { horizontal: 'center', vertical: 'center' },
  border: {
    top: { style: 'thin', color: { rgb: 'E2E8F0' } },
    bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
    left: { style: 'thin', color: { rgb: 'E2E8F0' } },
    right: { style: 'thin', color: { rgb: 'E2E8F0' } },
  },
};

const cellLeft = {
  font: { sz: 9 },
  alignment: { horizontal: 'left', vertical: 'center' },
  border: {
    top: { style: 'thin', color: { rgb: 'E2E8F0' } },
    bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
    left: { style: 'thin', color: { rgb: 'E2E8F0' } },
    right: { style: 'thin', color: { rgb: 'E2E8F0' } },
  },
};

function createStyledSheet(aoa, colWidths = [], centerIndices = []) {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const numRows = aoa.length;
  const numCols = aoa[0] ? aoa[0].length : 0;

  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      if (!ws[cellRef]) continue;
      if (r === 0) {
        ws[cellRef].s = headerStyle;
      } else {
        ws[cellRef].s = centerIndices.includes(c) ? cellCenter : cellLeft;
      }
    }
  }

  if (colWidths.length > 0) {
    ws['!cols'] = colWidths.map((w) => ({ wch: w }));
  }

  return ws;
}

export function buildDateWorkbook({
  dateStr,
  routing = [],
  tasks = [],
  locations = [],
  kpi = null,
}) {
  const routingHeader = [
    'No',
    'ID Routing',
    'Nama Routing',
    'Tanggal Pengiriman',
    'Dropped',
    'Histories',
    'Created By',
    'Created At',
    'Updated By',
    'Updated At',
  ];
  const routingRows = routing.map((r, i) => {
    const totalHistories =
      typeof r.histories === 'object' && r.histories !== null
        ? (r.histories.total ?? 0)
        : typeof r.histories === 'string'
          ? (() => {
              try {
                return JSON.parse(r.histories)?.total ?? 0;
              } catch {
                return 0;
              }
            })()
          : 0;
    return [
      i + 1,
      r.id || '',
      r.name || '',
      r.deliveryDate || dateStr,
      typeof r.dropped === 'object' && r.dropped !== null
        ? (r.dropped.total ?? 0)
        : (r.dropped ?? 0),
      totalHistories,
      r.sync_user?.created_by || r.createdBy || '',
      r.sync_user?.created_at || r.createdAt || '',
      r.sync_user?.updated_by || r.updatedBy || '',
      r.sync_user?.updated_at || r.updatedAt || '',
    ];
  });
  const wsRouting = createStyledSheet(
    [routingHeader, ...routingRows],
    [6, 25, 30, 18, 12, 10, 18, 20, 18, 20],
    [0, 3, 4, 5, 7, 9]
  );

  const taskHeader = [
    'No',
    'ID Task',
    'No Invoice',
    'Nama Pelanggan',
    'Alamat',
    'Status Delivery',
    'Status',
    'Alasan',
    'Tipe Storage',
    'Flow',
    'Driver',
    'Plat',
    'Tipe Kendaraan',
    'Urutan Rute',
    'Berat (kg)',
    'Volume (cbm)',
    'Jarak (km)',
    'Waktu Mulai',
    'Waktu Selesai',
    'Waktu Tiba',
    'ETA',
    'ETD',
    'Created By',
    'Created At',
    'Updated By',
    'Updated At',
  ];
  const taskRows = tasks.map((t, i) => {
    const cust = parseCustomerString(t.customerOrder || t.customer_order);
    return [
      i + 1,
      t.id || t._id || '',
      cust.invoiceNumber || t.orderId || '',
      cust.name || t.customerName || '',
      t.address || '',
      t.statusDelivery || t.status_delivery || '',
      t.status || '',
      t.alasan || '',
      t.typeStorage || t.type_storage || '',
      t.flow || '',
      t.driverName || t.driver_name || '',
      t.plat || '',
      t.vehicleType || t.vehicle_type || '',
      t.routePlannedOrder ?? t.route_planned_order ?? '',
      t.weightKg ?? t.weight_kg ?? 0,
      t.volumeCbm ?? t.volume_cbm ?? 0,
      t.distance ?? 0,
      t.startTime || t.start_time || '',
      t.endTime || t.end_time || '',
      t.arrivalTime || t.arrival_time || '',
      t.eta || '',
      t.etd || '',
      t.syncUser?.created_by || t.taskUser?.created_by || t.createdBy || '',
      t.syncUser?.created_at || t.taskUser?.created_at || t.createdAt || '',
      t.syncUser?.updated_by || t.taskUser?.updated_by || t.updatedBy || '',
      t.syncUser?.updated_at || t.taskUser?.updated_at || t.updatedAt || '',
    ];
  });
  const wsTask = createStyledSheet(
    [taskHeader, ...taskRows],
    [
      6, 25, 18, 25, 35, 16, 12, 20, 14, 12, 20, 14, 14, 12, 12, 12, 12, 12, 12, 12, 10, 10, 18, 20,
      18, 20,
    ],
    [0, 5, 6, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 23, 25]
  );

  const locHeader = [
    'No',
    'Email',
    'Nama Driver',
    'Tanggal',
    'Waktu Mulai',
    'Waktu Selesai',
    'Durasi',
    'Jarak (km)',
    'Tracked Time',
    'Start Lat',
    'Start Lon',
    'Finish Lat',
    'Finish Lon',
    'Updated By',
    'Updated At',
  ];
  const locRows = locations.map((l, i) => {
    const finish = l.finish || {};
    const finishTime = finish.finishTime || l.finish_time || l.finishTime || '';
    const totalDuration = finish.totalDuration ?? l.total_duration ?? l.totalDuration ?? '';
    const totalDistance = finish.totalDistance ?? l.total_distance ?? l.totalDistance;
    const startLat = l.startLat ?? l.start_lat ?? l.lat ?? '';
    const startLon = l.startLon ?? l.start_lon ?? l.lon ?? '';
    const finishLat = finish.lat ?? l.finish_lat ?? '';
    const finishLon = finish.lon ?? l.finish_lon ?? '';

    return [
      i + 1,
      l.email || '',
      l.driver_name || l.driverName || '',
      l.date || dateStr,
      l.start_time || l.startTime || '',
      finishTime,
      formatDurationHHMMSS(totalDuration),
      totalDistance != null && totalDistance !== '' ? Number(totalDistance).toFixed(2) : '',
      l.tracked_time ?? '',
      startLat,
      startLon,
      finishLat,
      finishLon,
      l.sync_user?.updated_by || l.syncUser?.updated_by || '',
      l.sync_user?.updated_at || l.syncUser?.updated_at || '',
    ];
  });
  const wsLoc = createStyledSheet(
    [locHeader, ...locRows],
    [6, 25, 22, 14, 14, 14, 14, 12, 14, 12, 12, 12, 12, 18, 20],
    [0, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14]
  );

  const kpiItem = Array.isArray(kpi) ? kpi[0] : kpi;
  const kpiHeader = ['Kategori', 'Metrik', 'Nilai'];
  const kpiRows = [
    ['Truk', 'Truk Dry', kpiItem?.truck_dry ?? 0],
    ['Truk', 'Truk Frozen', kpiItem?.truck_frz ?? 0],
    ['Truk', 'Total Truk', kpiItem?.total_truck ?? 0],
    ['Tugas', 'Tugas Dry', kpiItem?.task_dry ?? 0],
    ['Tugas', 'Tugas Frozen', kpiItem?.task_frz ?? 0],
    ['Tugas', 'Total Tugas', (kpiItem?.task_dry ?? 0) + (kpiItem?.task_frz ?? 0)],
    ['Pending', 'Pending Dry', kpiItem?.pending_dry ?? 0],
    ['Pending', 'Pending Frozen', kpiItem?.pending_frz ?? 0],
    ['Pending', 'Alasan Routing', kpiItem?.pending_routing ?? 0],
    ['Pending', 'Alasan Driver', kpiItem?.pending_driver ?? 0],
    ['Pending', 'Alasan Sales', kpiItem?.pending_sales ?? 0],
    ['Pending', 'Alasan Customer', kpiItem?.pending_customer ?? 0],
    ['Pending', 'Alasan Lainnya', kpiItem?.pending_other ?? 0],
    ['Waktu Operasional', 'Estimasi Jam Dry', kpiItem?.est_hour_dry ?? 0],
    ['Waktu Operasional', 'Estimasi Jam Frozen', kpiItem?.est_hour_frz ?? 0],
    ['Waktu Operasional', 'Aktual Jam Dry', kpiItem?.act_hour_dry ?? 0],
    ['Waktu Operasional', 'Aktual Jam Frozen', kpiItem?.act_hour_frz ?? 0],
    ['Jarak Tempuh (km)', 'Estimasi Jarak Dry', kpiItem?.est_dist_dry ?? 0],
    ['Jarak Tempuh (km)', 'Estimasi Jarak Frozen', kpiItem?.est_dist_frz ?? 0],
    ['Jarak Tempuh (km)', 'Aktual Jarak Dry', kpiItem?.act_dist_dry ?? 0],
    ['Jarak Tempuh (km)', 'Aktual Jarak Frozen', kpiItem?.act_dist_frz ?? 0],
    ['Kapasitas Muatan', 'Kapasitas Berat Dry (kg)', kpiItem?.capacity_kg_dry ?? 0],
    ['Kapasitas Muatan', 'Total Muatan Berat Dry (kg)', kpiItem?.total_kg_dry ?? 0],
    ['Kapasitas Muatan', 'Kapasitas Volume Dry (cbm)', kpiItem?.capacity_cbm_dry ?? 0],
    ['Kapasitas Muatan', 'Total Muatan Volume Dry (cbm)', kpiItem?.total_cbm_dry ?? 0],
    ['Kapasitas Muatan', 'Kapasitas Berat Frozen (kg)', kpiItem?.capacity_kg_frz ?? 0],
    ['Kapasitas Muatan', 'Total Muatan Berat Frozen (kg)', kpiItem?.total_kg_frz ?? 0],
    ['Kapasitas Muatan', 'Kapasitas Volume Frozen (cbm)', kpiItem?.capacity_cbm_frz ?? 0],
    ['Kapasitas Muatan', 'Total Muatan Volume Frozen (cbm)', kpiItem?.total_cbm_frz ?? 0],
  ];
  const wsKpi = createStyledSheet([kpiHeader, ...kpiRows], [25, 35, 20], [2]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsRouting, 'Routing');
  XLSX.utils.book_append_sheet(wb, wsTask, 'Task');
  XLSX.utils.book_append_sheet(wb, wsLoc, 'Driver Location');
  XLSX.utils.book_append_sheet(wb, wsKpi, 'KPI Data');

  return wb;
}

export function downloadSingleDateExcel({ dateStr, data, hubAcronym = '' }) {
  const wb = buildDateWorkbook({ dateStr, ...data });
  const dFormatted = formatDateUniversal(dateStr, 'DD.MM.YYYY');
  const fileName = hubAcronym
    ? `Database - ${dFormatted} - ${hubAcronym}.xlsx`
    : `Database - ${dFormatted}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export async function downloadDateRangeZip({ datesList, fetchDateData, hubAcronym = '' }) {
  const zip = new JSZip();

  for (const dateStr of datesList) {
    const data = await fetchDateData(dateStr);
    const wb = buildDateWorkbook({ dateStr, ...data });
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const dFormatted = formatDateUniversal(dateStr, 'DD.MM.YYYY');
    zip.file(`${dFormatted}.xlsx`, buffer);
  }

  const startD = formatDateUniversal(datesList[0], 'DD.MM.YYYY');
  const endD = formatDateUniversal(datesList[datesList.length - 1], 'DD.MM.YYYY');
  const zipName = hubAcronym
    ? `Database (Bulk) - (${startD} - ${endD}) - ${hubAcronym}.zip`
    : `Database (Bulk) - (${startD} - ${endD}).zip`;

  const blob = await zip.generateAsync({ type: 'blob' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = zipName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
