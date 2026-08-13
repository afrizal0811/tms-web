import { formatDateUniversal, normalizeEmail } from '@/lib/utils';
import { pdf, StyleSheet } from '@react-pdf/renderer';
import JSZip from 'jszip';
import { toastError, toastSuccess } from '../../../lib/toast';
import DeliveryForm from '../components/DeliveryForm';
import {
  abortIfNoRoutingResults,
  buildEnrichedTripsMap,
  getDriverName,
  getLocationName,
  getUniqueFileName,
  resolveDedupedTrip,
  sortRoutingResultsByCreatedTime,
  triggerDownload,
} from './shared';

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

export const handleFullDeliveryFormDownload = async ({
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
    const locationName = getLocationName();
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
      const fileName = getUniqueFileName(file.safeName, dateForFilename, '.pdf', seenFileNames);
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

export const handlePartialDeliveryFormDownload = async ({
  routingResults,
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
    const locationName = getLocationName();

    if (abortIfNoRoutingResults(routingResults, t, setIsDownloading)) return;

    const sortedRoutingResults = sortRoutingResultsByCreatedTime(routingResults);

    const enrichedTripsMap = buildEnrichedTripsMap(filteredVehicleRoutes);

    const masterZip = new JSZip();
    let masterHasData = false;
    const globalSeenSOByVehicle = new Map();
    let routingIndex = 1;

    const generatePdfBlob = async (route, realDriverName, tData) => {
      return await pdf(
        <DeliveryForm
          data={route}
          selectedDate={selectedDate}
          driverNameOverride={realDriverName}
          jamBerangkat={tData.jamBerangkat}
          jamKembali={tData.jamKembali}
        />
      ).toBlob();
    };

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

        const processedTripsToRender = [];

        (route.trips || []).forEach((rawTrip) => {
          const trip = resolveDedupedTrip(rawTrip, enrichedTripsMap, vehicleSeenSOs);
          if (trip === null) return;
          processedTripsToRender.push(trip);
        });

        if (processedTripsToRender.length <= 2 && processedTripsToRender.every((pt) => pt.isHub)) {
          continue;
        }

        routingHasData = true;
        const nameFile = getUniqueFileName(cleanName, dateForFilename, '.pdf', seenFileNames);
        const driverName = getDriverName(route, driverData);

        const normalizedAssignee = normalizeEmail(route.assignee);
        const timeData = timeMap.get(normalizedAssignee) || { jamBerangkat: '', jamKembali: '' };

        const modifiedRoute = { ...route, trips: processedTripsToRender };
        const blob = await generatePdfBlob(modifiedRoute, driverName, timeData);

        routingZip.file(nameFile, blob);
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
    triggerDownload(masterContent, `Delivery Form - ${dateForFilename} - ${locationName}.zip`);
    toastSuccess(t('common.toast.success'));
  } catch (err) {
    toastError(t('common.toast.error', { err: err.message }));
  } finally {
    setIsDownloading(false);
  }
};
