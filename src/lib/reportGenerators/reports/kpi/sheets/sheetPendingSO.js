import { normalizeDeliveryStatus } from '@/lib/deliveryStatus';
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
      let isPending = normalizeDeliveryStatus(task.statusDelivery) === 'PENDING';

      if (!isPending) {
        let statusGr = '';
        if (task.statusGr) {
          statusGr =
            typeof task.statusGr === 'string' ? task.statusGr.split(',')[0].trim() : task.statusGr;
        }
        isPending = normalizeDeliveryStatus(statusGr) === 'PENDING';
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

        const alasan =
          task.pendingDetail?.detailReason && task.pendingDetail.detailReason.trim() !== ''
            ? task.pendingDetail.detailReason
            : task.alasan || '-';

        const pd = task.pendingDetail;
        const hasPendingDetail = Boolean(
          pd &&
            ((pd.detailReason && pd.detailReason.trim() !== '' && pd.detailReason !== '-') ||
              (pd.groupReason && pd.groupReason.trim() !== '' && pd.groupReason !== '-') ||
              (pd.pic && pd.pic.trim() !== '' && pd.pic !== '-') ||
              (pd.internalExternal &&
                pd.internalExternal.trim() !== '' &&
                pd.internalExternal !== '-'))
        );

        const isReasonEmpty =
          !hasPendingDetail || !alasan || alasan === '-' || alasan.trim() === '';

        pendingRows.push({
          row: [
            task.flow || '-',
            formattedStartTime,
            finalPlat,
            finalDriver,
            custInfo.fullCustomerName || custInfo.name || '-',
            custInfo.invoiceNumber || '-',
            alasan,
          ],
          isReasonEmpty,
          driver: finalDriver,
        });
      }
    });
  }

  pendingRows.sort((a, b) =>
    String(a.driver || '')
      .toUpperCase()
      .localeCompare(String(b.driver || '').toUpperCase())
  );

  const sheetData = [
    ['Flow', 'Tanggal', 'Plat Nomor', 'Driver', 'Customer', 'Nomor Faktur', 'Alasan'],
    ...pendingRows.map((p) => p.row),
    [],
    ['NOTE'],
    ['', 'data detail alasan pending belum lengkap'],
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
  const styleCenterError = {
    alignment: { horizontal: 'center', vertical: 'center' },
    fill: { fgColor: { rgb: 'F6C5C0' } },
  };
  const styleLeftError = {
    alignment: { horizontal: 'left', vertical: 'center' },
    fill: { fgColor: { rgb: 'F6C5C0' } },
  };
  const styleNoteTitle = {
    font: { color: { rgb: 'FF0000' }, underline: true, bold: true },
    alignment: { horizontal: 'left', vertical: 'center' },
  };
  const styleLegendColor = {
    fill: { fgColor: { rgb: 'F6C5C0' } },
  };
  const styleLegendText = {
    alignment: { horizontal: 'left', vertical: 'center' },
  };

  const totalRows = sheetData.length;
  for (let R = 0; R < totalRows; ++R) {
    for (let C = 0; C < 7; ++C) {
      const cell = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cell]) ws[cell] = { v: '', t: 's' };

      if (R === 0) {
        ws[cell].s = styleHeader;
      } else if (R === totalRows - 2 && C === 0) {
        ws[cell].s = styleNoteTitle;
      } else if (R === totalRows - 1 && C === 0) {
        ws[cell].s = styleLegendColor;
      } else if (R === totalRows - 1 && C === 1) {
        ws[cell].s = styleLegendText;
      } else if (R > 0 && R < totalRows - 3) {
        const isError = pendingRows[R - 1]?.isReasonEmpty;
        ws[cell].s = isError
          ? C <= 2
            ? styleCenterError
            : styleLeftError
          : C <= 2
            ? styleCenter
            : styleLeft;
      }
    }
  }

  ws['!merges'] = [
    { s: { r: totalRows - 2, c: 0 }, e: { r: totalRows - 2, c: 6 } },
    { s: { r: totalRows - 1, c: 1 }, e: { r: totalRows - 1, c: 6 } },
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
