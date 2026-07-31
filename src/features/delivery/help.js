import { getLocalStorage } from '@/lib/localStorageHandler';
import {
  checkInvalidSo,
  checkInvalidSoList,
  formatDateUniversal,
  isEmpty,
  isValidSo,
  normalizeEmail,
  parseCustomerString,
  standardizeSo,
} from '@/lib/utils';
import { pdf, StyleSheet } from '@react-pdf/renderer';
import JSZip from 'jszip';
import * as XLSX from 'xlsx-js-style';
import { toastError, toastSuccess } from '../../lib/toast';
import DeliveryForm from './components/DeliveryForm';

const isTripRedelivery = (trip) => {
  const flowLower = (trip.flow || '').toLowerCase();
  const visitLower = (trip.visitName || '').toLowerCase();
  return (
    flowLower.includes('re delivery') ||
    flowLower.includes('redelivery') ||
    visitLower.includes('re delivery') ||
    visitLower.includes('redelivery') ||
    trip.isReDelivery
  );
};

const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const buildSoWorksheet = (processedRows) => {
  processedRows.sort((a, b) => {
    const validA = isValidSo(a.so) && !a.isInvalidCustomer;
    const validB = isValidSo(b.so) && !b.isInvalidCustomer;
    if (!validA && validB) return -1;
    if (validA && !validB) return 1;
    return a.so.localeCompare(b.so);
  });

  const wsData = [
    ['Order Nbr.', 'Order Type'],
    ...processedRows.map((row) => {
      const valid = isValidSo(row.so) && !row.isInvalidCustomer;
      return valid ? [row.so, row.so.substring(0, 2).toUpperCase()] : [row.so, '-'];
    }),
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  ['A1', 'B1'].forEach((cell) => {
    if (ws[cell]) {
      ws[cell].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '4F46E5' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        },
      };
    }
  });

  processedRows.forEach((row, idx) => {
    const rowIndex = idx + 2;
    const cellRef = `A${rowIndex}`;
    const typeCellRef = `B${rowIndex}`;
    const valid = isValidSo(row.so) && !row.isInvalidCustomer;

    const baseStyle = {
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      },
      alignment: { vertical: 'center', horizontal: 'left' },
    };

    if (!ws[cellRef]) ws[cellRef] = { v: row.so };
    if (!ws[typeCellRef]) ws[typeCellRef] = { v: '-' };

    if (!valid) {
      const errorStyle = {
        ...baseStyle,
        fill: { fgColor: { rgb: 'FFC7CE' } },
        font: { color: { rgb: '9C0006' }, bold: true },
      };

      ws[cellRef].s = errorStyle;
      ws[typeCellRef].s = {
        ...errorStyle,
        alignment: { vertical: 'center', horizontal: 'center' },
      };
      ws[cellRef].c = [{ a: 'System', t: 'Nomor SO tidak ditemukan!', h: true }];
    } else {
      ws[cellRef].s = baseStyle;
      ws[typeCellRef].s = {
        ...baseStyle,
        alignment: { vertical: 'center', horizontal: 'center' },
      };
    }
  });

  ws['!cols'] = [0, 1].map((colIndex) => {
    let maxLen = 0;
    for (let r = 0; r < wsData.length; r++) {
      const cellValue = wsData[r][colIndex];
      if (cellValue !== null && cellValue !== undefined) {
        maxLen = Math.max(maxLen, cellValue.toString().length);
      }
    }
    return { wch: Math.min(Math.max(maxLen + 3, 14), 50) };
  });

  return ws;
};

export const getDriverName = (route, driverData) => {
  if (!route) return '';
  const email = normalizeEmail(route.assignee);
  return driverData?.[email]?.name || '-';
};

export const handleFullRouteTransDownload = async ({
  filteredVehicleRoutes,
  setIsDownloading,
  t,
  selectedDate,
}) => {
  setIsDownloading(true);
  try {
    const dateForFilename = formatDateUniversal(selectedDate, 'DD.MM.YYYY');
    const { storedLocationAcronym, storedLocationName } = getLocalStorage();
    const locationName = storedLocationAcronym || storedLocationName || 'Hub';
    const isMultiVehicle = filteredVehicleRoutes.length > 1;
    const zip = isMultiVehicle ? new JSZip() : null;
    const seenFileNames = new Set();

    for (const route of filteredVehicleRoutes) {
      const cleanName = (route.vehicleName || 'Vehicle').replace(/[\\/:*?\[\]]/g, '').trim();
      let nameFile = `${cleanName} - ${dateForFilename}.xlsx`;
      let counter = 1;

      while (seenFileNames.has(nameFile)) {
        nameFile = `${cleanName}_${counter++} - ${dateForFilename}.xlsx`;
      }
      seenFileNames.add(nameFile);

      const processedRows = [];
      const seenSO = new Set();

      (route.trips || []).forEach((trip) => {
        if (!trip.isHub && trip.orderId && !isTripRedelivery(trip)) {
          const parsedCust = parseCustomerString(trip.visitName);
          const isCustomerInvalid = isEmpty(parsedCust?.id) || isEmpty(parsedCust?.location);
          const rawSOs = (parsedCust.invoiceNumber || trip.orderId)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);

          rawSOs.forEach((rawSo) => {
            const standardizedSo = standardizeSo(rawSo);
            if (!seenSO.has(standardizedSo)) {
              seenSO.add(standardizedSo);
              processedRows.push({
                so: standardizedSo,
                isInvalidCustomer: isCustomerInvalid,
              });
            }
          });
        }
      });

      const ws = buildSoWorksheet(processedRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, cleanName.substring(0, 31));

      if (isMultiVehicle) {
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        zip.file(nameFile, excelBuffer);
      } else {
        XLSX.writeFile(wb, nameFile);
        toastSuccess(t('common.toast.success'));
        return;
      }
    }

    if (isMultiVehicle) {
      const content = await zip.generateAsync({ type: 'blob' });
      triggerDownload(content, `Route Transaction - ${dateForFilename} - ${locationName}.zip`);
      toastSuccess(t('common.toast.success'));
    }
  } catch (err) {
    toastError(t('common.toast.error', { err: err.message }));
  } finally {
    setIsDownloading(false);
  }
};

export const handlePartialRouteTransDownload = async ({
  routingResults,
  setIsDownloading,
  t,
  selectedDate,
}) => {
  setIsDownloading(true);
  try {
    const dateForFilename = formatDateUniversal(selectedDate, 'DD.MM.YYYY');
    const { storedLocationAcronym, storedLocationName } = getLocalStorage();
    const locationName = storedLocationAcronym || storedLocationName || 'Hub';

    if (!routingResults || routingResults.length === 0) {
      toastError(t('common.toast.error', { err: 'Data routing tidak ditemukan' }));
      setIsDownloading(false);
      return;
    }

    const sortedRoutingResults = [...routingResults].sort((a, b) => {
      const timeA = new Date(a.createdTime || 0).getTime();
      const timeB = new Date(b.createdTime || 0).getTime();
      return timeA - timeB;
    });

    const masterZip = new JSZip();
    let masterHasData = false;
    const globalSeenSOByVehicle = new Map();
    let routingIndex = 1;

    for (const routing of sortedRoutingResults) {
      const status = routing.status || routing.dispatchStatus || '';
      if (String(status).toLowerCase() !== 'done') continue;
      const routes = routing.result?.routing || [];
      if (routes.length === 0) continue;

      const cleanRoutingName = (routing.name || routing._id || 'Routing')
        .replace(/[\\/:*?\[\]]/g, '')
        .trim();
      const zipFolderName = `Routing ${routingIndex} (${cleanRoutingName})`;
      routingIndex++;

      const routingZip = new JSZip();
      let routingHasData = false;
      const seenFileNames = new Set();

      for (const route of routes) {
        const cleanName = (route.vehicleName || route.vehicleId || 'Vehicle')
          .replace(/[\\/:*?\[\]]/g, '')
          .trim();

        if (!globalSeenSOByVehicle.has(cleanName)) {
          globalSeenSOByVehicle.set(cleanName, new Set());
        }
        const vehicleSeenSOs = globalSeenSOByVehicle.get(cleanName);

        const processedRows = [];
        const seenSO = new Set();

        (route.trips || []).forEach((trip) => {
          if (!trip.isHub && !isTripRedelivery(trip)) {
            const parsedCust = parseCustomerString(trip.visitName);
            const isCustomerInvalid = isEmpty(parsedCust?.id) || isEmpty(parsedCust?.location);
            const rawInvoice = parsedCust.invoiceNumber || trip.orderId || '';

            if (!rawInvoice) return;

            const rawSOs = rawInvoice
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);

            rawSOs.forEach((rawSo) => {
              const standardizedSo = standardizeSo(rawSo);

              if (!vehicleSeenSOs.has(standardizedSo)) {
                vehicleSeenSOs.add(standardizedSo);

                if (!seenSO.has(standardizedSo)) {
                  seenSO.add(standardizedSo);
                  processedRows.push({
                    so: standardizedSo,
                    isInvalidCustomer: isCustomerInvalid,
                  });
                }
              }
            });
          }
        });

        if (processedRows.length === 0) continue;

        routingHasData = true;
        let nameFile = `${cleanName} - ${dateForFilename}.xlsx`;
        let counter = 1;
        while (seenFileNames.has(nameFile)) {
          nameFile = `${cleanName}_${counter++} - ${dateForFilename}.xlsx`;
        }
        seenFileNames.add(nameFile);

        const ws = buildSoWorksheet(processedRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, cleanName.substring(0, 31));
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        routingZip.file(nameFile, excelBuffer);
      }

      if (routingHasData) {
        masterHasData = true;
        const routingZipBlob = await routingZip.generateAsync({ type: 'blob' });
        masterZip.file(`${zipFolderName}.zip`, routingZipBlob);
      }
    }

    if (!masterHasData) {
      toastError(t('common.toast.error', { err: 'Tidak ada transaksi valid untuk diunduh' }));
      setIsDownloading(false);
      return;
    }

    const masterContent = await masterZip.generateAsync({ type: 'blob' });
    triggerDownload(masterContent, `Route Transaction - ${dateForFilename} - ${locationName}.zip`);
    toastSuccess(t('common.toast.success'));
  } catch (err) {
    toastError(t('common.toast.error', { err: err.message }));
  } finally {
    setIsDownloading(false);
  }
};

export const handleDeliveryFormDownload = async ({
  filteredVehicleRoutes,
  setIsDownloading,
  t,
  selectedDate,
  driverData,
  timeMap,
}) => {
  setIsDownloading(true);
  try {
    const dateForFilename = formatDateUniversal(selectedDate, 'DD.MM.YYYY');
    const { storedLocationAcronym, storedLocationName } = getLocalStorage();
    const locationName = storedLocationAcronym || storedLocationName || 'Hub';
    const isMultiVehicle = filteredVehicleRoutes.length > 1;
    const zip = isMultiVehicle ? new JSZip() : null;

    const generatePdfBlob = async (route) => {
      const normalizedAssignee = normalizeEmail(route.assignee);
      const realDriverName = getDriverName(route, driverData);
      const timeData = timeMap.get(normalizedAssignee) || { jamBerangkat: '', jamKembali: '' };

      return await pdf(
        <DeliveryForm
          data={route}
          selectedDate={selectedDate}
          driverNameOverride={realDriverName}
          jamBerangkat={timeData.jamBerangkat}
          jamKembali={timeData.jamKembali}
        />
      ).toBlob();
    };

    if (!isMultiVehicle) {
      const route = filteredVehicleRoutes[0];
      const blob = await generatePdfBlob(route);
      const safeName = (route.vehicleName || 'Vehicle').replace(/[^a-zA-Z0-9-_ ]/g, '').trim();
      triggerDownload(blob, `Delivery Form - ${safeName} - ${dateForFilename}.pdf`);
      toastSuccess(t('common.toast.success'));
      return;
    }

    const pdfPromises = filteredVehicleRoutes.map(async (route) => {
      const blob = await generatePdfBlob(route);
      const safeName = (route.vehicleName || 'Vehicle').replace(/[^a-zA-Z0-9-_ ]/g, '').trim();
      return { safeName, blob };
    });

    const generatedFiles = await Promise.all(pdfPromises);
    const seenFileNames = new Set();

    generatedFiles.forEach((file) => {
      let fileName = `${file.safeName} - ${dateForFilename}.pdf`;
      let counter = 1;
      while (seenFileNames.has(fileName)) {
        fileName = `${file.safeName}_${counter++} - ${dateForFilename}.pdf`;
      }
      seenFileNames.add(fileName);
      zip.file(fileName, file.blob);
    });

    const content = await zip.generateAsync({ type: 'blob' });
    triggerDownload(content, `Delivery Form - ${dateForFilename} - ${locationName}.zip`);
    toastSuccess(t('common.toast.success', { length: generatedFiles.length }));
  } catch (error) {
    toastError(t('common.toast.error', { err: error.message }));
  } finally {
    setIsDownloading(false);
  }
};

export const handleDeliveryListDownload = async ({
  filteredVehicleRoutes,
  setIsDownloading,
  t,
  driverData,
  fileNamePrefix,
  isDetailView,
}) => {
  setIsDownloading(true);
  try {
    const wb = XLSX.utils.book_new();
    const activeCols = [
      { key: 'no', title: 'No.' },
      { key: 'visit', title: t('delivery.visit') },
      { key: 'custId', title: t('common.customer_id') },
      { key: 'locId', title: t('common.location_id') },
      { key: 'so', title: t('common.so_number') },
      { key: 'openTime', title: t('common.open_time') },
      { key: 'closeTime', title: t('common.close_time') },
      { key: 'eta', title: t('delivery.est_arrival') },
      { key: 'etd', title: t('delivery.est_depart') },
    ];

    filteredVehicleRoutes.forEach((route) => {
      const cleanName = (route.vehicleName || 'Vehicle')
        .replace(/[\\/:*?\[\]]/g, '')
        .substring(0, 30);
      const driverName = getDriverName(route, driverData);
      const hasManualInRoute = route.trips?.some((t) => t.isManual);

      const wsData = [
        [t('common.vehicle'), route.vehicleName],
        [t('common.driver'), driverName],
        [],
        activeCols.map((col) => col.title),
      ];

      const stylingMeta = [
        { row: 0, col: 0, style: { font: { bold: true } } },
        { row: 0, col: 1, style: { font: { bold: true, sz: 12 } } },
        { row: 1, col: 0, style: { font: { bold: true } } },
      ];

      activeCols.forEach((_, i) => {
        stylingMeta.push({
          row: 3,
          col: i,
          style: {
            font: { bold: true, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: '4F46E5' } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: {
              top: { style: 'thin' },
              bottom: { style: 'thin' },
              left: { style: 'thin' },
              right: { style: 'thin' },
            },
          },
        });
      });

      let currentRowIndex = 4;
      route.trips.forEach((trip, index) => {
        const isHub = trip.isHub;
        const isFirstHub = index === 0 && isHub;
        const isLastHub = index === route.trips.length - 1 && isHub;
        const parsedCust = parseCustomerString(trip.visitName);
        const isBadCust = isEmpty(parsedCust?.id) || isEmpty(parsedCust?.location);

        let baseOutletName = isHub
          ? 'HUB'
          : trip.flow === 'Pickup' && trip.warehouseName
            ? trip.warehouseName
            : parsedCust?.name || trip.visitName;

        if (trip.isReDelivery && !isHub) baseOutletName = `[REDELIVERY] ${baseOutletName}`;

        const custId = isHub ? '' : parsedCust?.id || '-';
        const locId = isHub ? '' : parsedCust?.location || '-';
        const mapping = trip.soWarehouseMapping || [];

        const pushRow = (
          displayNo,
          displayCustId,
          displayLocId,
          displaySo,
          whInfo = null,
          isSplit = false,
          isUnsyncOverride = null,
          partnerOverride = null,
          isInvalidSo = false
        ) => {
          const openVal = isHub ? '' : trip.openTime || '-';
          const closeVal = isHub ? '' : trip.closeTime || '-';
          const etaVal = isFirstHub ? '' : trip.eta ? formatDateUniversal(trip.eta, 'HH:mm') : '-';
          const etdVal = isLastHub ? '' : trip.etd ? formatDateUniversal(trip.etd, 'HH:mm') : '-';

          const isRowUnsync = isUnsyncOverride !== null ? isUnsyncOverride : trip.isUnsync;
          const rowPartner = partnerOverride !== null ? partnerOverride : trip.partnerVehicle;

          let outletWithWh =
            isDetailView && whInfo ? `${baseOutletName}\n↳ Pickup: ${whInfo}` : baseOutletName;

          if (isRowUnsync && rowPartner) outletWithWh += `\n[Partner: ${rowPartner}]`;

          wsData.push(
            activeCols.map(
              (col) =>
                ({
                  no: displayNo,
                  visit: outletWithWh,
                  custId: displayCustId,
                  locId: displayLocId,
                  so: displaySo,
                  openTime: openVal,
                  closeTime: closeVal,
                  eta: etaVal,
                  etd: etdVal,
                })[col.key]
            )
          );

          const cellStyle = {
            border: {
              top: { style: 'thin' },
              bottom: { style: 'thin' },
              left: { style: 'thin' },
              right: { style: 'thin' },
            },
            alignment: { vertical: 'center', wrapText: true },
            ...(trip.isManual && { fill: { fgColor: { rgb: 'E6EEFF' } } }),
            ...(isHub && { font: { color: { rgb: 'DC2626' }, bold: true } }),
          };

          activeCols.forEach((col, c) => {
            let colStyle = { ...cellStyle };
            let comment = null;

            if (col.key === 'no') {
              colStyle.alignment = { ...colStyle.alignment, horizontal: 'right' };
              if (isSplit && !isHub) {
                colStyle.font = { ...(colStyle.font || {}), color: { rgb: '16A34A' }, bold: true };
              }
            }
            if (col.key === 'visit' && trip.isReDelivery && !isHub) {
              colStyle.font = { ...(colStyle.font || {}), color: { rgb: 'DC2626' } };
            }
            if (col.key === 'eta' && isLastHub && hasManualInRoute && trip.eta) {
              comment = [{ a: 'Info', t: t('delivery.hub_eta_short'), h: true }];
            }
            if (col.key === 'so' && isInvalidSo && !isHub) {
              colStyle.font = { ...(colStyle.font || {}), color: { rgb: 'DC2626' }, bold: true };
            }

            stylingMeta.push({ row: currentRowIndex, col: c, style: colStyle, comment });
          });
          currentRowIndex++;
        };

        if (!isHub && isDetailView && mapping.length > 0) {
          mapping.forEach((item, idx) => {
            const letter = mapping.length > 1 ? String.fromCharCode(65 + idx) : '';
            const displayNo = trip.isManual ? '-' : `${trip.routePlannedOrder}${letter}`;
            const soPartner = trip.syncDetails?.[item.so] || null;
            pushRow(
              displayNo,
              custId,
              locId,
              item.so,
              trip.flow !== 'Pickup' ? item.wh : null,
              mapping.length > 1,
              !!soPartner,
              soPartner,
              checkInvalidSo(item.so, isBadCust)
            );
          });
          return;
        }

        const isInvalidSoTotal = isHub
          ? false
          : checkInvalidSoList(parsedCust?.invoiceNumber || trip.orderId || '', isBadCust);

        let displaySo = isHub
          ? null
          : mapping.length > 0
            ? mapping
                .map((item) =>
                  item.wh && trip.flow !== 'Pickup' ? `${item.so} (${item.wh})` : item.so
                )
                .join(', ')
            : parsedCust.invoiceNumber || trip.orderId || '-';

        pushRow(
          isHub ? '' : trip.isManual ? '-' : trip.routePlannedOrder,
          custId,
          locId,
          displaySo,
          null,
          false,
          null,
          null,
          isInvalidSoTotal
        );
      });

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      stylingMeta.forEach((meta) => {
        const cellRef = XLSX.utils.encode_cell({ r: meta.row, c: meta.col });
        if (!ws[cellRef]) ws[cellRef] = { v: '' };
        ws[cellRef].s = { ...(ws[cellRef].s || {}), ...meta.style };
        if (meta.comment) ws[cellRef].c = meta.comment;
      });

      ws['!cols'] = activeCols.map((_, colIndex) => {
        let maxLen = 0;
        for (let r = 3; r < wsData.length; r++) {
          const val = wsData[r][colIndex];
          if (val != null) {
            const lines = val.toString().split('\n');
            maxLen = Math.max(maxLen, ...lines.map((l) => l.length));
          }
        }
        return { wch: Math.min(Math.max(maxLen + 2, 8), 60) };
      });

      let finalSheetName = cleanName;
      let counter = 1;
      while (wb.SheetNames.includes(finalSheetName)) {
        finalSheetName = `${cleanName.substring(0, 25)}_${counter++}`;
      }
      XLSX.utils.book_append_sheet(wb, ws, finalSheetName);
    });

    const { storedLocationAcronym: locationName } = getLocalStorage() || '-';
    const date = formatDateUniversal(new Date(), 'DD.MM.YYYY');
    const fileName = fileNamePrefix
      ? `${t('delivery.title')} (${fileNamePrefix}) - ${date} - ${locationName}.xlsx`
      : `${t('delivery.title')} - ${date} - ${locationName}.xlsx`;

    XLSX.writeFile(wb, fileName);
    toastSuccess(t('common.toast.success'));
  } catch (e) {
    toastError(t('common.toast.error', { err: e.message }));
  } finally {
    setIsDownloading(false);
  }
};

export const styles = StyleSheet.create({
  page: {
    padding: 20,
    fontSize: 9,
    fontFamily: 'Helvetica',
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
  },
  headerContainer: { flexDirection: 'column', marginBottom: 5 },
  titleRow: {
    marginBottom: 10,
    borderBottomWidth: 1.5,
    borderColor: '#000',
    alignSelf: 'flex-start',
    paddingBottom: 2,
  },
  mainTitle: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  formSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  inputsContainer: { flex: 1, marginRight: 20, flexDirection: 'column', gap: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end' },
  labelCol1: { width: 50, fontSize: 8, fontWeight: 'bold' },
  lineCol1: {
    width: 140,
    borderBottomWidth: 1,
    borderColor: '#000',
    height: 12,
    justifyContent: 'flex-end',
  },
  spacer: { width: 15 },
  labelCol2: { width: 70, fontSize: 8, fontWeight: 'bold', textAlign: 'right', paddingRight: 2 },
  lineCol2: {
    width: 50,
    borderBottomWidth: 1,
    borderColor: '#000',
    height: 12,
    justifyContent: 'flex-end',
  },
  labelCol3: { width: 90, fontSize: 8, fontWeight: 'bold', textAlign: 'right', paddingRight: 2 },
  lineCol3: {
    flex: 1,
    borderBottomWidth: 1,
    borderColor: '#000',
    height: 12,
    justifyContent: 'flex-end',
  },
  inputText: { fontSize: 9, marginLeft: 5, marginBottom: 1 },
  miniTable: { width: 180, borderWidth: 1, borderColor: '#000', flexDirection: 'column' },
  miniTableRow: { flexDirection: 'row', height: 15 },
  miniTableHeader: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    flexDirection: 'row',
    height: 15,
    alignItems: 'center',
  },
  miniCell: {
    borderRightWidth: 1,
    borderColor: '#000',
    fontSize: 7,
    justifyContent: 'center',
    textAlign: 'center',
    height: '100%',
    paddingTop: 2,
  },
  miniTableFont: { fontWeight: 'bold' },
  colBln: { width: 60, borderRightWidth: 1 },
  colNamaDriver: { flex: 1, borderRightWidth: 0 },
  tableContainer: {
    marginTop: 5,
    flexDirection: 'column',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: '#000',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    minHeight: 18,
    alignItems: 'stretch',
  },
  tableHeaderRow: { backgroundColor: '#FFFFFF', fontWeight: 'bold', textAlign: 'center' },
  cell: {
    borderRightWidth: 1,
    borderRightColor: '#000',
    padding: 2,
    justifyContent: 'center',
    fontSize: 8,
  },
  headerCell: {
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colFaktur: { width: '15%' },
  colOutlet: { width: '18%' },
  colQty: { width: '5%', textAlign: 'center' },
  colBiayaParent: { width: '37%', padding: 0 },
  colJml: { width: '10%', textAlign: 'center' },
  colKetParent: { width: '15%', padding: 0 },
  nestedHeaderTop: {
    borderBottomWidth: 1,
    borderColor: '#000',
    textAlign: 'center',
    height: 10,
    fontSize: 7,
    justifyContent: 'center',
    width: '100%',
  },
  nestedSubContainer: { flexDirection: 'row', flex: 1, width: '100%' },
  nestedSubCell: {
    flex: 1,
    borderRightWidth: 1,
    borderColor: '#000',
    textAlign: 'center',
    fontSize: 6,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 1,
    paddingHorizontal: 1,
  },
  nestedSubCellLast: { borderRightWidth: 0 },
  footerLabelCell: {
    backgroundColor: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 7,
    justifyContent: 'center',
    paddingLeft: 5,
  },
  infoBox: {
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#000',
    padding: 4,
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  infoTextColumn: { flexDirection: 'column', gap: 1, width: '30%' },
  legendContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderLeftWidth: 1,
    borderColor: '#000',
    paddingLeft: 8,
  },
  legendColumn: { width: '48%', flexDirection: 'column', gap: 1 },
  legendItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 1 },
  bullet: { width: 8, fontSize: 7, marginTop: -1 },
  legendTextContent: { fontSize: 6, fontFamily: 'Helvetica', flex: 1 },
  infoText: { fontSize: 7, fontFamily: 'Helvetica' },
  signatureSection: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 20,
  },
  signatureBox: { flex: 1 },
  signatureHeader: {
    fontSize: 7,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  sigTable: { borderWidth: 1, borderColor: '#000', flexDirection: 'column' },
  sigRowHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#000',
    backgroundColor: '#FFFFFF',
    height: 15,
  },
  sigRowBody: { flexDirection: 'row', height: 40 },
  sigRowFooter: { flexDirection: 'row', borderTopWidth: 1, borderColor: '#000', height: 15 },
  sigCell: {
    flex: 1,
    borderRightWidth: 1,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    fontSize: 7,
  },
  sigCellLast: { borderRightWidth: 0 },
});
