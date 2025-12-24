import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError, toastInfo, toastSuccess, toastWarning } from '@/lib/toastHelper';
import { formatDateUniversal, isDateSunday } from '@/lib/utils';
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

  if (!driverData || driverData.length === 0) {
    toastError('Data Driver tidak valid.');
    return;
  }

  setIsLoading(true);
  setCurrentReport(reportType);
  toastInfo('Memulai proses...');

  try {
    const originalStartDateString = formatDateUniversal(startDate, 'DD.MM.YYYY');
    const originalEndDateString = formatDateUniversal(endDate, 'DD.MM.YYYY');
    const { storedLocation: hubId, storedLocationName: hubName } = getLocalStorage();

    if (!hubId) throw new Error('Data Hub tidak valid (ID Lokasi tidak ditemukan).');

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
          hubName,
        });

        if (result) {
          const { wb, excelFileName } = result;
          const excelUint8Array = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
          zip.file(excelFileName, excelUint8Array);
          filesGenerated++;
        } else {
          skippedDates.push(dateForFile);
        }
      } catch (err) {
        toastError(`Gagal memproses ${dateForFile}: ${err.message}`);
      }
    }

    if (filesGenerated === 0) {
      if (skippedDates.length > 0) {
        toastWarning(`Tidak ada data ditemukan untuk semua tanggal dalam rentang ini.`);
      } else {
        toastError(`Tidak ada file ${zipPrefix} yang berhasil dibuat.`);
      }
      return;
    }

    if (sundaysSkipped > 0 && skippedDates.length === 0) {
      toastWarning(`Melewati ${sundaysSkipped} tanggal untuk hari Minggu.`);
    } else if (sundaysSkipped > 0) {
      toastWarning(
        `Terdapat ${skippedDates.length} tanggal yang tidak memiliki data (termasuk hari Minggu).`
      );
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
