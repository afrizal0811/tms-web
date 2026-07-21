import { getLocalStorage } from '@/lib/localStorageHandler';
import { formatDateUniversal, normalizeEmail, parseCustomerString } from '@/lib/utils';
import { StyleSheet } from '@react-pdf/renderer';
import * as XLSX from 'xlsx-js-style';
import { toastError, toastSuccess } from '../../lib/toast';

export function getDriverName(route, driverData) {
  if (!route) return '';

  const email = normalizeEmail(route.assignee);
  const storedDriver = driverData ? driverData[email] : null;
  return storedDriver?.name || '-';
}

export const handleConfirmDownload = async ({
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
      { key: 'visit', title: t('estimation.visit') },
    ];

    activeCols.push(
      { key: 'custId', title: t('common.customer_id') },
      { key: 'locId', title: t('common.location_id') },
      { key: 'so', title: t('common.so_number') },
      { key: 'openTime', title: t('common.open_time') },
      { key: 'closeTime', title: t('common.close_time') },
      { key: 'eta', title: t('estimation.est_arrival') },
      { key: 'etd', title: t('estimation.est_depart') }
    );

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

      const stylingMeta = [];
      stylingMeta.push(
        { row: 0, col: 0, style: { font: { bold: true } } },
        { row: 0, col: 1, style: { font: { bold: true, sz: 12 } } },
        { row: 1, col: 0, style: { font: { bold: true } } }
      );

      const headerRowIndex = 3;
      for (let i = 0; i < activeCols.length; i++) {
        stylingMeta.push({
          row: headerRowIndex,
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
      }

      let currentRowIndex = 4;
      route.trips.forEach((trip, index) => {
        const isHub = trip.isHub;
        const isFirstHub = index === 0 && isHub;
        const isLastHub = index === route.trips.length - 1 && isHub;

        let baseOutletName = '';
        let custId = '-';
        let locId = '-';

        const parsedCust = parseCustomerString(trip.visitName);
        if (isHub) {
          baseOutletName = 'HUB';
          custId = '';
          locId = '';
        } else if (trip.flow === 'Pickup' && trip.warehouseName) {
          baseOutletName = trip.warehouseName;
          custId = parsedCust?.id || '-';
          locId = parsedCust?.location || '-';
        } else {
          baseOutletName = parsedCust?.name || trip.visitName;
          custId = parsedCust?.id || '-';
          locId = parsedCust?.location || '-';
        }

        if (trip.isReDelivery && !isHub) {
          baseOutletName = `[REDELIVERY] ${baseOutletName}`;
        }

        const mapping = trip.soWarehouseMapping || [];

        const pushRow = (
          displayNo,
          displayCustId,
          displayLocId,
          displaySo,
          whInfo = null,
          isSplit = false,
          isUnsyncOverride = null,
          partnerOverride = null
        ) => {
          const openVal = isHub ? '' : trip.openTime || '-';
          const closeVal = isHub ? '' : trip.closeTime || '-';
          let etaVal = isFirstHub ? '' : trip.eta ? formatDateUniversal(trip.eta, 'HH:mm') : '-';
          const etdVal = isLastHub ? '' : trip.etd ? formatDateUniversal(trip.etd, 'HH:mm') : '-';

          const isRowUnsync = isUnsyncOverride !== null ? isUnsyncOverride : trip.isUnsync;
          const rowPartner = partnerOverride !== null ? partnerOverride : trip.partnerVehicle;

          let outletWithWh =
            isDetailView && whInfo ? `${baseOutletName}\n↳ Pickup: ${whInfo}` : baseOutletName;

          if (isRowUnsync && rowPartner) {
            outletWithWh += `\n[Partner: ${rowPartner}]`;
          }

          const rowVals = {
            no: displayNo,
            visit: outletWithWh,
            custId: displayCustId,
            locId: displayLocId,
            so: displaySo,
            openTime: openVal,
            closeTime: closeVal,
            eta: etaVal,
            etd: etdVal,
          };

          wsData.push(activeCols.map((col) => rowVals[col.key]));

          const cellStyle = {
            border: {
              top: { style: 'thin' },
              bottom: { style: 'thin' },
              left: { style: 'thin' },
              right: { style: 'thin' },
            },
            alignment: {
              vertical: 'center',
              wrapText: true,
            },
          };

          if (trip.isManual) {
            cellStyle.fill = { fgColor: { rgb: 'E6EEFF' } };
          }

          if (isHub) {
            cellStyle.font = { color: { rgb: 'DC2626' }, bold: true };
          }

          for (let c = 0; c < activeCols.length; c++) {
            const colKey = activeCols[c].key;
            let colStyle = { ...cellStyle };
            let comment = null;

            if (colKey === 'no') {
              colStyle.alignment = { ...colStyle.alignment, horizontal: 'right' };
              if (isSplit && !isHub) {
                colStyle.font = { ...(colStyle.font || {}), color: { rgb: '16A34A' }, bold: true };
              }
            }

            if (colKey === 'visit' && trip.isReDelivery && !isHub) {
              colStyle.font = { ...(colStyle.font || {}), color: { rgb: 'DC2626' } };
            }

            if (colKey === 'eta' && isLastHub && hasManualInRoute && trip.eta) {
              comment = [{ a: 'Info', t: t('estimation.hub_eta_short'), h: true }];
            }

            stylingMeta.push({ row: currentRowIndex, col: c, style: colStyle, comment });
          }
          currentRowIndex++;
        };

        if (!isHub && isDetailView && mapping.length > 0) {
          mapping.forEach((item, idx) => {
            const letter = mapping.length > 1 ? String.fromCharCode(65 + idx) : '';
            const displayNo = trip.isManual ? '-' : `${trip.routePlannedOrder}${letter}`;
            const whInfo = trip.flow !== 'Pickup' ? item.wh : null;

            const soPartner = trip.syncDetails ? trip.syncDetails[item.so] : null;
            const soIsUnsync = !!soPartner;

            pushRow(
              displayNo,
              custId,
              locId,
              item.so,
              whInfo,
              mapping.length > 1,
              soIsUnsync,
              soPartner
            );
          });
          return;
        }

        let displaySo = '-';
        if (!isHub) {
          if (mapping.length > 0) {
            displaySo = mapping
              .map((item) =>
                item.wh && trip.flow !== 'Pickup' ? `${item.so} (${item.wh})` : item.so
              )
              .join(', ');
          } else {
            displaySo = parseCustomerString(trip.visitName).invoiceNumber || trip.orderId || '-';
          }
        }

        const displayNo = isHub ? '' : trip.isManual ? '-' : trip.routePlannedOrder;
        pushRow(displayNo, custId, locId, displaySo, null, false);
      });

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      stylingMeta.forEach((meta) => {
        const cellRef = XLSX.utils.encode_cell({ r: meta.row, c: meta.col });
        if (!ws[cellRef]) ws[cellRef] = { v: '' };
        ws[cellRef].s = { ...(ws[cellRef].s || {}), ...meta.style };
        if (meta.comment) ws[cellRef].c = meta.comment;
      });

      const colWidths = activeCols.map((col, colIndex) => {
        let maxLength = 0;
        for (let r = 3; r < wsData.length; r++) {
          const cellValue = wsData[r][colIndex];
          if (cellValue !== null && cellValue !== undefined) {
            const lines = cellValue.toString().split('\n');
            const maxLineLength = Math.max(...lines.map((l) => l.length));
            maxLength = Math.max(maxLength, maxLineLength);
          }
        }
        return { wch: Math.min(Math.max(maxLength + 2, 8), 60) };
      });

      ws['!cols'] = colWidths;

      let finalSheetName = cleanName;
      let counter = 1;
      while (wb.SheetNames.includes(finalSheetName)) {
        finalSheetName = `${cleanName.substring(0, 25)}_${counter}`;
        counter++;
      }

      XLSX.utils.book_append_sheet(wb, ws, finalSheetName);
    });
    const { storedLocationAcronym: locationName } = getLocalStorage() || '-';
    const date = formatDateUniversal(new Date(), 'DD.MM.YYYY');
    let fileName = `${t('estimation.title')} - ${date} - ${locationName}.xlsx`;
    if (fileNamePrefix) {
      fileName = `${t('estimation.title')} (${fileNamePrefix}) - ${date} - ${locationName}.xlsx`;
    }

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

  headerContainer: {
    flexDirection: 'column',
    marginBottom: 5,
  },
  titleRow: {
    marginBottom: 10,
    borderBottomWidth: 1.5,
    borderColor: '#000',
    alignSelf: 'flex-start',
    paddingBottom: 2,
  },
  mainTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },

  formSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  inputsContainer: {
    flex: 1,
    marginRight: 20,
    flexDirection: 'column',
    gap: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },

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
  inputText: {
    fontSize: 9,
    marginLeft: 5,
    marginBottom: 1,
  },

  miniTable: {
    width: 180,
    borderWidth: 1,
    borderColor: '#000',
    flexDirection: 'column',
  },
  miniTableRow: {
    flexDirection: 'row',
    height: 15,
  },
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
  miniTableFont: {
    fontWeight: 'bold',
  },
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
  tableHeaderRow: {
    backgroundColor: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
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
  nestedSubContainer: {
    flexDirection: 'row',
    flex: 1,
    width: '100%',
  },
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
  infoTextColumn: {
    flexDirection: 'column',
    gap: 1,
    width: '30%',
  },

  legendContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderLeftWidth: 1,
    borderColor: '#000',
    paddingLeft: 8,
  },

  legendColumn: {
    width: '48%',
    flexDirection: 'column',
    gap: 1,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 1,
  },

  bullet: {
    width: 8,
    fontSize: 7,
    marginTop: -1,
  },

  legendTextContent: {
    fontSize: 6,
    fontFamily: 'Helvetica',
    flex: 1,
  },

  infoText: {
    fontSize: 7,
    fontFamily: 'Helvetica',
  },

  signatureSection: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 20,
  },
  signatureBox: {
    flex: 1,
  },
  signatureHeader: {
    fontSize: 7,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  sigTable: {
    borderWidth: 1,
    borderColor: '#000',
    flexDirection: 'column',
  },
  sigRowHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#000',
    backgroundColor: '#FFFFFF',
    height: 15,
  },
  sigRowBody: {
    flexDirection: 'row',
    height: 40,
  },
  sigRowFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: '#000',
    height: 15,
  },
  sigCell: {
    flex: 1,
    borderRightWidth: 1,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    fontSize: 7,
  },
  sigCellLast: {
    borderRightWidth: 0,
  },
});
