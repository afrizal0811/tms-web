import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError, toastInfo, toastSuccess, toastWarning } from '@/lib/toastHelper';
import { formatDateUniversal, isDateSunday, isEmpty } from '@/lib/utils';
import JSZip from 'jszip';
import * as XLSX from 'xlsx-js-style';

export const getDatesInRange = (startDate, endDate) => {
  const dates = [];
  let currentDate = new Date(startDate);
  currentDate.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  while (currentDate <= end) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
};

export const bulkDownloader = async ({
  startDate,
  endDate,
  driverData,
  reportType,
  zipPrefix,
  setIsLoading,
  setCurrentReport,
  processDateCallback,
  t,
}) => {
  if (!driverData || isEmpty(driverData)) {
    toastError(t('common.toast.error', { err: t('common.no_driver') }));
    return;
  }

  setIsLoading(true);
  setCurrentReport(reportType);
  toastInfo(t('report.toast.processing'));

  try {
    const originalStartDateString = formatDateUniversal(startDate, 'DD.MM.YYYY');
    const originalEndDateString = formatDateUniversal(endDate, 'DD.MM.YYYY');
    const {
      storedLocation: hubId,
      storedLocationName: hubName,
      storedLocationAcronym,
    } = getLocalStorage();
    const hubLabel = storedLocationAcronym || hubName;
    const datesToProcess = getDatesInRange(startDate, endDate);
    const zip = new JSZip();
    let filesGenerated = 0;
    let sundaysSkipped = 0;
    const skippedDates = [];

    for (const dateObj of datesToProcess) {
      const dateForFile = formatDateUniversal(dateObj);
      if (isDateSunday(dateForFile)) {
        sundaysSkipped++;
        continue;
      }
      try {
        const result = await processDateCallback({
          dateObj,
          dateForFile,
          hubId,
          hubName: hubLabel,
        });
        if (result?.error) {
          skippedDates.push(dateForFile);
          continue;
        }

        if (result?.wb || result?.excelFileName) {
          const { wb, excelFileName } = result;
          const excelUint8Array = XLSX.write(wb, {
            bookType: 'xlsx',
            type: 'array',
          });
          zip.file(excelFileName, excelUint8Array);
          filesGenerated++;
          continue;
        }

        skippedDates.push(dateForFile);
      } catch (err) {
        skippedDates.push(dateForFile);
        console.error(err);
      }
    }

    const totalSkipped = skippedDates.length + sundaysSkipped;
    const failedZipText = t('report.toast.failed_zip');
    const noDataText = t('common.no_data');
    const skipDateText = t('report.toast.skip_data', {
      skippedDates: skippedDates.length,
    });
    const skipSundayText = t('report.toast.skip_sunday', {
      sundaysSkipped,
    });

    if (filesGenerated === 0) {
      throw new Error(`${failedZipText}, ${noDataText.toLowerCase()}`);
    }

    if (totalSkipped > 0) {
      if (skippedDates.length > 0 && sundaysSkipped > 0) {
        toastWarning(`${skipDateText}, ${skipSundayText.toLowerCase()}`);
      } else if (skippedDates.length > 0) {
        toastWarning(skipDateText);
      } else if (sundaysSkipped > 0) {
        toastWarning(skipSundayText);
      }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(zipBlob);
    link.download = `${zipPrefix} - (${originalStartDateString} - ${originalEndDateString}) - ${hubLabel}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toastSuccess(t('common.toast.success'));
  } catch (e) {
    toastError(t('common.toast.error', { err: e.message }));
  } finally {
    setIsLoading(false);
    setCurrentReport(null);
  }
};

export const taskDetailHeaders = [
  '_id',
  'flow',
  'flowId',
  'organizationId',
  'parentId',
  'subId',
  'hub',
  'hubId',
  'title',
  'content',
  'label',
  'orderIndex',
  'status',
  'startTime',
  'endTime',
  'updatedTime',
  'assignee',
  'assignedTo',
  'assignedBy',
  'assignedTime',
  'createdBy',
  'createdFrom',
  'createdTime',
  'doneBy',
  'doneCoordinate',
  'doneTime',
  'openTaskTime',
  'waitingTime',
  'travelDuration',
  'distance',
  'eta',
  'etd',
  'assignedVehicleId',
  'assignedVehicle',
  'routePlannedOrder',
  'expectedCoordinate',
  'createdCoordinate',
  'doneFrom',
  'updatedBy',
  'autoSplit',
  'splitNumber',
  'visitGroup',
  'visitGroupPriority',
  'inLocation',
  'outLocation',
  'travelDistance',
  'taskType',
  'workflow',
  'page1DoneTime',
  'page2DoneTime',
  'page3DoneTime',
  'Customer Name',
  'Order ID',
  'Type Storage',
  'Volume',
  'Weight',
  'Address',
  'Longlat',
  'Open Time',
  'Close Time',
  'Visit Time',
  'Maksimum Vehicle Type',
  'Priority',
  'Status GR',
  'Alasan',
  'Customer Order',
  'Warehouse Name',
  'Type Storage (typeStorage)',
  'Volume (Cbm)',
  'Weight (Kg)',
  'Location ID',
  'Total SO',
  'Group Visit',
  'Address Pickup',
  'Longlat Pickup',
  'Klik Jika Anda Sudah Sampai di Gudang',
  'Customer',
  'Location',
  'Klik Jika Anda Sudah Sampai',
  'Kondisi Toko atau Customer',
  'Alasan Tidak Bisa Dikunjungi',
  'Status Delivery',
  'Alasan Tolakan',
  'Alasan Batal',
  'Nama Penerima PIC',
  'GPS Sesuai',
  'Klik Lokasi Client',
  'Original Weight',
  'Original Volume',
  'Expected Vehicle',
  'Vehicle Capacity',
  'Split Notes',
  'Is Split Task',
  'Klik Jika Sudah Sampai',
  'List Product',
  'List barang pickup',
  'List Product Tolakan',
  'Photo Delivery',
  'photoDelivery_0_url',
  'photoDelivery_0_category',
  'Tanda Tangan Penerima',
  'tandaTanganPenerima_url',
  'activity',
  'routingResultId',
];

export const taskDetailKeyMapping = {
  _id: '_id',
  flow: 'flow',
  flowId: 'flowId',
  organizationId: 'organizationId',
  parentId: 'parentId',
  subId: 'subId',
  hub: 'hub',
  hubId: 'hubId',
  title: 'title',
  content: 'content',
  label: 'label',
  orderIndex: 'orderIndex',
  status: 'status',
  startTime: 'startTime',
  endTime: 'endTime',
  updatedTime: 'updatedTime',
  assignee: 'assignee',
  assignedTo: 'assignedTo',
  assignedBy: 'assignedBy',
  assignedTime: 'assignedTime',
  createdBy: 'createdBy',
  createdFrom: 'createdFrom',
  createdTime: 'createdTime',
  doneBy: 'doneBy',
  doneCoordinate: 'doneCoordinate',
  doneTime: 'doneTime',
  openTaskTime: 'openTaskTime',
  waitingTime: 'waitingTime',
  travelDuration: 'travelDuration',
  distance: 'distance',
  eta: 'eta',
  etd: 'etd',
  assignedVehicleId: 'assignedVehicleId',
  assignedVehicle: 'assignedVehicle',
  routePlannedOrder: 'routePlannedOrder',
  expectedCoordinate: 'expectedCoordinate',
  createdCoordinate: 'createdCoordinate',
  doneFrom: 'doneFrom',
  updatedBy: 'updatedBy',
  autoSplit: 'autoSplit',
  splitNumber: 'splitNumber',
  visitGroup: 'visitGroup',
  visitGroupPriority: 'visitGroupPriority',
  inLocation: 'inLocation',
  outLocation: 'outLocation',
  travelDistance: 'travelDistance',
  taskType: 'taskType',
  workflow: 'workflow',
  page1DoneTime: 'page1DoneTime',
  page2DoneTime: 'page2DoneTime',
  page3DoneTime: 'page3DoneTime',
  'Customer Name': 'customerName',
  'Order ID': 'orderId',
  'Type Storage': 'typeStorage',
  Volume: 'volume',
  Weight: 'weight',
  Address: 'address',
  Longlat: 'longlat',
  'Open Time': 'openTime',
  'Close Time': 'closeTime',
  'Visit Time': 'visitTime',
  'Maksimum Vehicle Type': 'maksimumVehicleType',
  Priority: 'priority',
  'Status GR': 'statusGr',
  Alasan: 'alasan',
  'Customer Order': 'customerOrder',
  'Warehouse Name': 'warehouseName',
  'Type Storage (typeStorage)': 'typeStorage',
  'Volume (Cbm)': 'volumeCbm',
  'Weight (Kg)': 'weightKg',
  'Location ID': 'locationId',
  'Total SO': 'totalSo',
  'Group Visit': 'groupVisit',
  'Address Pickup': 'addressPickup',
  'Longlat Pickup': 'longlatPickup',
  'Klik Jika Anda Sudah Sampai di Gudang': 'klikJikaAndaSudahSampaiDiGudang',
  Customer: 'customer',
  Location: 'location',
  'Klik Jika Anda Sudah Sampai': 'klikJikaSudahSampai',
  'Kondisi Toko atau Customer': 'kondisiTokoAtauCustomer',
  'Alasan Tidak Bisa Dikunjungi': 'alasanTidakBisaDikunjungi',
  'Status Delivery': 'statusDelivery',
  'Alasan Tolakan': 'alasanTolakan',
  'Alasan Batal': 'alasanBatal',
  'Nama Penerima PIC': 'namaPenerimaPic',
  'GPS Sesuai': 'gpsSesuai',
  'Klik Lokasi Client': 'klikLokasiClient',
  'Original Weight': 'originalWeight',
  'Original Volume': 'originalVolume',
  'Expected Vehicle': 'expectedVehicle',
  'Vehicle Capacity': 'vehicleCapacity',
  'Split Notes': 'splitNotes',
  'Is Split Task': 'isSplitTask',
  'Klik Jika Sudah Sampai': 'klikJikaSudahSampai',
  'List Product': 'listProduct',
  'List barang pickup': 'listBarangPickup',
  'List Product Tolakan': 'listProductTolakan',
  'Photo Delivery': 'photoDelivery',
  photoDelivery_0_url: 'photoDelivery_0_url',
  photoDelivery_0_category: 'photoDelivery_0_category',
  'Tanda Tangan Penerima': 'tandaTanganPenerima',
  tandaTanganPenerima_url: 'tandaTanganPenerima_url',
  activity: 'activity',
  routingResultId: 'routingResultId',
};

export const tutorialData = {
  routing: [
    {
      image: '/images/tutorial/routing/routing-1.png',
      text: 'Masuk ke MileApp, lalu buka menu Routing (Rute) di sidebar. Pilih submenu Result (Hasil).',
    },
    {
      image: '/images/tutorial/routing/routing-2.png',
      text: 'Lakukan filter berdasarkan tanggal dilakukannya routing.',
    },
    {
      image: '/images/tutorial/routing/routing-3.png',
      text: 'Pilih hasil routing yang sudah di-dispatch (ditugaskan).',
    },
    {
      image: '/images/tutorial/routing/routing-4.png',
      text: 'Klik tombol Export (Ekspor). Lakukan untuk semua hasil routing.',
    },
  ],
  delivery: [
    {
      image: '/images/tutorial/task/task-1.png',
      text: 'Masuk ke MileApp, lalu buka menu Task (Tugas) di sidebar.',
    },
    {
      image: '/images/tutorial/task/task-2.png',
      text: 'Lakukan filter berdasarkan tanggal dilakukannya pengiriman. Gunakan filter Status dan Tanggal Pengiriman.',
    },
    {
      image: '/images/tutorial/task/task-3.png',
      text: 'Klik tombol Export (Ekspor), lalu klik Export Task (Ekspor Tugas).',
    },
    {
      image: '/images/tutorial/task/task-4.png',
      text: 'Buka menu Import & Export (Impor & Ekspor) di sidebar. Pilih submenu Data Export.',
    },
    {
      image: '/images/tutorial/task/task-5.png',
      text: 'Klik ikon unduh di kolom Action (Aksi) untuk mengunduh file Excel.',
    },
  ],
};
