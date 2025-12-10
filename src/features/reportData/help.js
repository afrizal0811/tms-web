import { toastError, toastInfo, toastSuccess, toastWarning } from '@/lib/toastHelper';
import { formatDate, formatDatePoint, isDateSunday } from '@/lib/utils';
import JSZip from 'jszip';
import * as XLSX from 'xlsx-js-style';

/**
 * Helper untuk mendapatkan array tanggal di antara dua tanggal
 */
function getDatesInRange(startDate, endDate) {
  const dates = [];
  let currentDate = new Date(startDate);
  const stopDate = new Date(endDate);
  currentDate.setHours(12, 0, 0, 0);
  stopDate.setHours(12, 0, 0, 0);
  while (currentDate <= stopDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
}

export const bulkDownloader = async ({
  startDate,
  endDate,
  driverData,
  reportType,
  zipPrefix,
  setIsLoading,
  setCurrentReport,
  processDateCallback,
}) => {
  // 1. Validasi Tanggal
  let isRangeInvalid = false;
  if (!startDate || !endDate) {
    isRangeInvalid = true;
  } else if (startDate.getTime() === endDate.getTime()) {
    isRangeInvalid = true;
  } else if (startDate > endDate) {
    isRangeInvalid = true;
  }

  if (isRangeInvalid) {
    if (startDate && endDate && startDate.getTime() === endDate.getTime()) {
      toastError('Rentang tanggal tidak boleh sama. Harap pilih minimal 2 hari.');
    } else {
      toastError('Rentang tanggal tidak valid. Pastikan awal <= akhir dan berbeda tanggal.');
    }
    return;
  }

  // 2. Validasi Data Driver
  if (!driverData || driverData.length === 0) {
    toastError('Data Driver tidak valid.');
    return;
  }

  // 3. Setup State & Variable
  setIsLoading(true);
  setCurrentReport(reportType);
  toastInfo('Memulai proses...');

  try {
    const originalStartDateString = formatDatePoint(startDate);
    const originalEndDateString = formatDatePoint(endDate);

    // Ambil info lokasi dari LocalStorage
    const hubId = localStorage.getItem('userLocation');
    const hubName = localStorage.getItem('userLocationName') || 'Lokasi';

    if (!hubId) throw new Error('Data Hub tidak valid (ID Lokasi tidak ditemukan).');

    const datesToProcess = getDatesInRange(startDate, endDate);
    const zip = new JSZip();
    let filesGenerated = 0;
    let sundaysSkipped = 0;

    // 4. Looping Tanggal
    for (const dateObj of datesToProcess) {
      const dateForFile = formatDate(dateObj);

      // Skip Hari Minggu
      if (isDateSunday(dateForFile)) {
        sundaysSkipped++;
        // console.log(`Melewati ${dateForFile} (Hari Minggu)`); // Optional log
        continue;
      }

      try {
        // Jalankan logika spesifik (fetch api & generate excel) lewat callback
        const result = await processDateCallback({
          dateObj,
          dateForFile,
          hubId,
          hubName,
        });

        // Jika callback mengembalikan data workbook
        if (result) {
          const { wb, excelFileName } = result;
          const excelUint8Array = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
          zip.file(excelFileName, excelUint8Array);
          filesGenerated++;
        }
      } catch (err) {
        toastError(`Gagal memproses ${dateForFile}: ${err.message}`);
      }
    }

    // 5. Finalisasi & Download
    if (filesGenerated === 0) {
      toastError(`Tidak ada file ${zipPrefix} yang berhasil dibuat.`);
      return;
    }

    if (sundaysSkipped > 0) {
      toastWarning(`Melewati ${sundaysSkipped} hari (Hari Minggu)`);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(zipBlob);
    link.download = `${zipPrefix} ${originalStartDateString} - ${originalEndDateString}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toastSuccess(`Berhasil! ${filesGenerated} file telah di-zip dan diunduh.`);
  } catch (e) {
    toastError(e.message);
  } finally {
    setIsLoading(false);
    setCurrentReport(null);
  }
};
