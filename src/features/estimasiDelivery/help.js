// File: src/features/estimasiDelivery/help.js
import { getLocalStorage } from '@/lib/localStorageHandler';
import {
  formatDateUniversal,
  formatSimpleTime,
  formatTimestampToDDMMYYYY_UTC7,
  formatTimestampToQuotedHHMM_UTC7,
  getUTC7DateString,
  isEmpty,
  normalizeEmail,
  parseCustomerString,
} from '@/lib/utils';
import { StyleSheet } from '@react-pdf/renderer';
import * as XLSX from 'xlsx-js-style';
import { toastError, toastSuccess } from '../../lib/toastHelper';
export function parseSONumber(visitName) {
  if (!visitName) return '';
  const str = String(visitName);
  const matches = str.match(/(SO|SS)\d{4}-\d+/g);
  return matches ? matches.join(', ') : '';
}

export function getDriverName(route, driverData) {
  if (!route) return '';

  const email = normalizeEmail(route.assignee);
  const storedDriver = driverData ? driverData[email] : null;
  return storedDriver?.name || '-';
}

export function processDriverTimeMap(apiData, selectedDateStr) {
  const timeMap = new Map();

  if (!Array.isArray(apiData) || isEmpty(apiData)) return timeMap;

  const [y, m, d] = selectedDateStr.split('-');
  const targetDateFormatted = `${d}-${m}-${y}`;

  apiData.forEach((item) => {
    const trackedTime = Math.abs(item.trackedTime || 0);
    const totalDistance = item.finish?.totalDistance || 0;

    if (trackedTime < 10 || totalDistance <= 5) return;

    const startTime = item.startTime;
    const startDateFormatted = formatTimestampToDDMMYYYY_UTC7(startTime);

    if (startDateFormatted !== targetDateFormatted) return;

    const email = normalizeEmail(item.email);
    if (!email) return;

    const rawStart = formatTimestampToQuotedHHMM_UTC7(startTime);
    const startDisplay = rawStart ? rawStart.replace("'", '') : '-';

    const finishTime = item.finish?.finishTime;
    const rawFinish = formatTimestampToQuotedHHMM_UTC7(finishTime);
    let finishDisplay = rawFinish ? rawFinish.replace("'", '') : '-';

    if (startTime && finishTime) {
      const sDate = new Date(getUTC7DateString(startTime));
      const fDate = new Date(getUTC7DateString(finishTime));
      const d1 = new Date(sDate.getFullYear(), sDate.getMonth(), sDate.getDate());
      const d2 = new Date(fDate.getFullYear(), fDate.getMonth(), fDate.getDate());

      const diffTime = d2 - d1;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 0) {
        finishDisplay = `${finishDisplay} (+${diffDays})`;
      }
    }
    if (!timeMap.has(email)) {
      timeMap.set(email, {
        jamBerangkat: startDisplay,
        jamKembali: finishDisplay,
        _rawStart: new Date(startTime),
        _rawFinish: finishTime ? new Date(finishTime) : null,
      });
    } else {
      const current = timeMap.get(email);
      const newStart = new Date(startTime);
      const newFinish = finishTime ? new Date(finishTime) : null;
      if (newStart < current._rawStart) {
        current._rawStart = newStart;
        current.jamBerangkat = startDisplay;
      }
      if (newFinish && (!current._rawFinish || newFinish > current._rawFinish)) {
        current._rawFinish = newFinish;
        const d1 = new Date(
          current._rawStart.getFullYear(),
          current._rawStart.getMonth(),
          current._rawStart.getDate()
        );
        const d2 = new Date(newFinish.getFullYear(), newFinish.getMonth(), newFinish.getDate());
        const diffDays = Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));

        const updatedRawFinish = formatTimestampToQuotedHHMM_UTC7(finishTime).replace("'", '');
        current.jamKembali =
          diffDays > 0 ? `${updatedRawFinish} (H+${diffDays})` : updatedRawFinish;
      }

      timeMap.set(email, current);
    }
  });
  return timeMap;
}

export const handleConfirmDownload = async ({
  filteredVehicleRoutes,
  setIsDownloading,
  t,
  driverData,
  fileNamePrefix,
}) => {
  setIsDownloading(true);
  try {
    const wb = XLSX.utils.book_new();
    filteredVehicleRoutes.forEach((route) => {
      const cleanName = (route.vehicleName || 'Vehicle')
        .replace(/[\\/:*?\[\]]/g, '')
        .substring(0, 30);
      const driverName = getDriverName(route, driverData);

      const hasManualInRoute = route.trips?.some((t) => t.isManual);
      const wsData = [
        ['Kendaraan', route.vehicleName], // Baris 1
        ['Driver', driverName], // Baris 2
        [], // Baris 3 (Spacer)
        [
          'No.',
          t('estimation.visit'),
          t('estimation.no_so'),
          t('estimation.open_time'),
          t('estimation.close_time'),
          t('estimation.est_arrival'),
          t('estimation.est_depart'),
        ],
      ];
      const stylingMeta = [];
      stylingMeta.push(
        { row: 0, col: 0, style: { font: { bold: true } } }, // Label 'Kendaraan'
        { row: 0, col: 1, style: { font: { bold: true, sz: 12 } } }, // Value Kendaraan
        { row: 1, col: 0, style: { font: { bold: true } } } // Label 'Driver'
      );

      const headerRowIndex = 3;
      for (let i = 0; i < 7; i++) {
        stylingMeta.push({
          row: headerRowIndex,
          col: i,
          style: {
            font: { bold: true, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: '4F46E5' } }, // Indigo
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

        let outletName = '';
        if (isHub) {
          outletName = 'HUB';
        } else if (trip.flow === 'Pickup' && trip.warehouseName) {
          outletName = trip.warehouseName;
        } else {
          const parsed = parseCustomerString(trip.visitName);
          outletName = parsed?.name || trip.visitName;
        }

        let soNumber = isHub ? '' : parseSONumber(trip.visitName);

        if (!isHub && isEmpty(soNumber)) {
          const rawOrderId = trip.orderId;
          const standardRegex = /^(SO|SC|SE)\d{4}-\d+$/;
          if (rawOrderId && standardRegex.test(rawOrderId)) {
            soNumber = rawOrderId;
          } else {
            soNumber = '-';
          }
        } else if (!isHub && isEmpty(soNumber)) {
          soNumber = '-';
        }

        const noVal = trip.isManual ? '-' : trip.routePlannedOrder;
        const openVal = isHub ? '' : trip.openTime || '-';
        const closeVal = isHub ? '' : trip.closeTime || '-';

        let etaVal = isFirstHub ? '' : trip.eta ? formatSimpleTime(trip.eta) : '-';
        const etdVal = isLastHub ? '' : trip.etd ? formatSimpleTime(trip.etd) : '-';

        if (isLastHub && hasManualInRoute && trip.eta) {
          etaVal = `${formatSimpleTime(trip.eta)} ${t('estimation.hub_eta_short')}`;
        }

        wsData.push([noVal, outletName, soNumber, openVal, closeVal, etaVal, etdVal]);
        const cellStyle = {
          border: {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' },
          },
        };

        if (trip.isManual) {
          cellStyle.fill = { fgColor: { rgb: 'FEE2E2' } };
        }

        if (trip.isUnsync) {
          const blue400 = { style: 'medium', color: { rgb: '60A5FA' } };
          cellStyle.border = {
            top: blue400,
            bottom: blue400,
            left: blue400,
            right: blue400,
          };
        }

        if (isHub) {
          cellStyle.font = { color: { rgb: 'DC2626' }, bold: true };
        }

        for (let c = 0; c < 7; c++) {
          stylingMeta.push({ row: currentRowIndex, col: c, style: cellStyle });
        }
        currentRowIndex++;
      });

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      stylingMeta.forEach((meta) => {
        const cellRef = XLSX.utils.encode_cell({ r: meta.row, c: meta.col });
        if (!ws[cellRef]) ws[cellRef] = { v: '' };
        ws[cellRef].s = { ...(ws[cellRef].s || {}), ...meta.style };
      });

      ws['!cols'] = [
        { wch: 5 }, // No
        { wch: 40 }, // Visit
        { wch: 20 }, // SO
        { wch: 10 }, // Open
        { wch: 10 }, // Close
        { wch: 30 }, // ETA
        { wch: 15 }, // ETD
      ];

      let finalSheetName = cleanName;
      let counter = 1;
      while (wb.SheetNames.includes(finalSheetName)) {
        finalSheetName = `${cleanName.substring(0, 25)}_${counter}`;
        counter++;
      }

      XLSX.utils.book_append_sheet(wb, ws, finalSheetName);
    });
    const { storedLocationName: locationName } = getLocalStorage() || '-';
    const timestamp = formatDateUniversal(new Date(), 'DD.MM.YYYY');
    let fileName = `${t('estimation.title')} - ${locationName} - ${timestamp}.xlsx`;
    if (fileNamePrefix) {
      fileName = `${t('estimation.title')} (${fileNamePrefix}) - ${locationName} - ${timestamp}.xlsx`;
    }

    XLSX.writeFile(wb, fileName);

    toastSuccess(t('estimation.toast.success_excel'));
  } catch (e) {
    toastError(t('estimation.toast.download_failed', { err: e.message }));
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
    backgroundColor: '#E5E7EB',
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
  colNoUrut: { width: 50, borderRightWidth: 1 },
  colBln: { width: 30, borderRightWidth: 1 },
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
    backgroundColor: '#E5E7EB',
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

  // --- 3. UPDATE WIDTHS (REVISI) ---
  colFaktur: { width: '15%' }, // Update: 15%
  colOutlet: { width: '18%' }, // Update: 18%
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
    backgroundColor: '#E5E7EB',
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
    alignSelf: 'flex-start',
  },
  infoTextColumn: {
    flexDirection: 'column',
    gap: 1,
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
    backgroundColor: '#E5E7EB',
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

// --- UPDATE: Logic Excel Download Multi-Sheet ---
