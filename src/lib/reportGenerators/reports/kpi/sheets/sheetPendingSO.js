import {
  formatDateUniversal,
  getBasePlate,
  normalizeEmail,
  parseCustomerString,
} from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';

export function generateSheetPendingSO(tasksData, driverData) {
  const pendingRows = [];

  if (Array.isArray(tasksData)) {
    tasksData.forEach((task) => {
      let statusDeliv = '';
      if (task.statusDelivery) {
        statusDeliv =
          typeof task.statusDelivery === 'string'
            ? task.statusDelivery.split(',')[0].trim()
            : task.statusDelivery;
      }
      let isPending = String(statusDeliv || '').toUpperCase() === 'PENDING';

      if (!isPending) {
        let statusGr = '';
        if (task.statusGr) {
          statusGr =
            typeof task.statusGr === 'string' ? task.statusGr.split(',')[0].trim() : task.statusGr;
        }
        isPending = String(statusGr || '').toUpperCase() === 'PENDING';
      }

      if (isPending) {
        let driverName = task.driverName;
        let rawAssignee = '';
        if (task.assignee) {
          rawAssignee =
            typeof task.assignee === 'string' ? task.assignee.split(',')[0].trim() : task.assignee;
        }
        const email = normalizeEmail(rawAssignee);

        const driverInfo = (driverData || []).find(
          (d) =>
            (email && normalizeEmail(d.email) === email) ||
            (driverName && d.name && d.name.toUpperCase() === driverName.toUpperCase())
        );

        let rawPlat = driverInfo?.plat || task.basePlat || task.vehicleName || task.plat || '-';
        const finalPlat = getBasePlate(rawPlat);
        const finalDriver = driverInfo?.name || driverName || rawAssignee || '-';
        const custInfo = parseCustomerString(task.customerOrder || '');

        let formattedStartTime = '-';
        if (task.startTime) {
          formattedStartTime = formatDateUniversal(task.startTime);
        }

        pendingRows.push([
          task.flow || '-',
          formattedStartTime,
          finalPlat,
          finalDriver,
          custInfo.fullCustomerName || custInfo.name || '-',
          custInfo.invoiceNumber || '-',
          task.alasan || '-',
        ]);
      }
    });
  }

  pendingRows.sort((a, b) =>
    String(a[3] || '')
      .toUpperCase()
      .localeCompare(String(b[3] || '').toUpperCase())
  );

  const sheetData = [
    ['Flow', 'Tanggal', 'Plat Nomor', 'Driver', 'Customer', 'Nomor Faktur', 'Alasan'],
    ...pendingRows,
    [],
    ['NOTE'],
    [
      'Berdasarkan alasan tersebut, tentukan kategorinya untuk mengisikan data di RT by Routing/Driver/Sales/Customer/Other',
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  const styleHeader = {
    font: { bold: true },
    alignment: { horizontal: 'center', vertical: 'center' },
    fill: { fgColor: { rgb: 'EFEFEF' } },
    border: {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    },
  };
  const styleCenter = { alignment: { horizontal: 'center', vertical: 'center' } };
  const styleLeft = { alignment: { horizontal: 'left', vertical: 'center' } };

  const totalRows = sheetData.length;
  for (let R = 0; R < totalRows; ++R) {
    for (let C = 0; C < 7; ++C) {
      const cell = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cell]) ws[cell] = { v: '', t: 's' };

      if (R === 0) ws[cell].s = styleHeader;
      else if (R === totalRows - 2 && C === 0)
        ws[cell].s = {
          font: { color: { rgb: 'FF0000' }, underline: true, bold: true },
          alignment: { horizontal: 'left', vertical: 'center' },
        };
      else if (R === totalRows - 1 && C === 0)
        ws[cell].s = {
          font: { italic: true, color: { rgb: '000000' } },
          alignment: { horizontal: 'left', vertical: 'center' },
        };
      else if (R > 0 && R < totalRows - 3) ws[cell].s = C <= 2 ? styleCenter : styleLeft;
    }
  }

  ws['!merges'] = [
    { s: { r: totalRows - 2, c: 0 }, e: { r: totalRows - 2, c: 6 } },
    { s: { r: totalRows - 1, c: 0 }, e: { r: totalRows - 1, c: 6 } },
  ];
  ws['!cols'] = [
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 30 },
    { wch: 45 },
    { wch: 20 },
    { wch: 35 },
  ];

  return ws;
}
