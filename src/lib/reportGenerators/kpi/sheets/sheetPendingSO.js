import {
  formatTimestampToDDMMYYYY_UTC7,
  getBasePlate,
  normalizeEmail,
  parseCustomerString,
} from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';

export function generateSheetPendingSO(tasksData, driverData) {
  const headers = ['Flow', 'Tanggal', 'Plat Nomor', 'Driver', 'Customer', 'Nomor Faktur', 'Alasan'];
  const sheetData = [headers];
  const pendingRows = [];

  if (Array.isArray(tasksData)) {
    tasksData.forEach((task) => {
      let isPending = false;

      if (Array.isArray(task.statusDelivery) && task.statusDelivery.length > 0) {
        isPending = String(task.statusDelivery[0]).toUpperCase() === 'PENDING';
      } else if (typeof task.statusDelivery === 'string') {
        isPending = task.statusDelivery.toUpperCase() === 'PENDING';
      }

      if (
        !isPending &&
        typeof task.statusGr === 'string' &&
        task.statusGr.toUpperCase() === 'PENDING'
      ) {
        isPending = true;
      }

      if (isPending) {
        const flow = task.flow || '-';
        const tanggal = formatTimestampToDDMMYYYY_UTC7(task.startTime);
        let platNomor = task.assignedVehicle;
        let driverName = task.driverName;

        const rawAssignee = task.assignee?.[0] || '';
        const email = normalizeEmail(rawAssignee);

        const driverInfo = (driverData || []).find((d) => {
          if (email && normalizeEmail(d.email) === email) return true;
          if (driverName && d.name && d.name.toUpperCase() === driverName.toUpperCase())
            return true;
          return false;
        });

        if (driverInfo) {
          platNomor = driverInfo.plat || platNomor;
          driverName = driverInfo.name || driverName;
        } else if (!driverName) {
          driverName = rawAssignee || '-';
        }

        if (!platNomor) platNomor = '-';
        if (!driverName) driverName = '-';

        platNomor = getBasePlate(platNomor);

        const custInfo = parseCustomerString(task.customerOrder || '');
        const customer = custInfo.fullCustomerName || custInfo.name || '-';
        const noFaktur = custInfo.invoiceNumber || '-';
        const alasan = task.alasan || '-';

        pendingRows.push([flow, tanggal, platNomor, driverName, customer, noFaktur, alasan]);
      }
    });
  }

  pendingRows.sort((a, b) => {
    const driverA = String(a[3] || '').toUpperCase();
    const driverB = String(b[3] || '').toUpperCase();
    return driverA.localeCompare(driverB);
  });

  pendingRows.forEach((row) => sheetData.push(row));

  sheetData.push([]);
  sheetData.push(['NOTE']);
  sheetData.push([
    'Berdasarkan alasan tersebut, tentukan kategorinya untuk mengisikan data di RT by Routing/Driver/Sales/Customer/Other',
  ]);

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  const headerStyle = {
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

  const centerStyle = { alignment: { horizontal: 'center', vertical: 'center' } };
  const leftStyle = { alignment: { horizontal: 'left', vertical: 'center' } };

  const noteTitleStyle = {
    font: { color: { rgb: 'FF0000' }, underline: true, bold: true },
    alignment: { horizontal: 'left', vertical: 'center' },
  };

  const noteTextStyle = {
    font: { italic: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'left', vertical: 'center' },
  };

  const range = XLSX.utils.decode_range(ws['!ref']);
  const totalRows = sheetData.length;
  const noteTitleRowIndex = totalRows - 2;
  const noteTextRowIndex = totalRows - 1;

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellAddress]) ws[cellAddress] = { v: '', t: 's' };

      if (R === 0) {
        ws[cellAddress].s = headerStyle;
      } else if (R === noteTitleRowIndex && C === 0) {
        ws[cellAddress].s = noteTitleStyle;
      } else if (R === noteTextRowIndex && C === 0) {
        ws[cellAddress].s = noteTextStyle;
      } else if (R > 0 && R < noteTitleRowIndex - 1) {
        if (C <= 2) {
          ws[cellAddress].s = centerStyle;
        } else {
          ws[cellAddress].s = leftStyle;
        }
      }
    }
  }

  ws['!merges'] = [
    { s: { r: noteTitleRowIndex, c: 0 }, e: { r: noteTitleRowIndex, c: 6 } },
    { s: { r: noteTextRowIndex, c: 0 }, e: { r: noteTextRowIndex, c: 6 } },
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
