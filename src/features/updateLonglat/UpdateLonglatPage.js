// File: src/features/updateLonglat/UpdateLonglatPage.js
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import DatePicker from 'react-datepicker';
import * as XLSX from 'xlsx-js-style';

import BodyCard from '@/components/card/BodyCard';
import HeaderCard from '@/components/card/HeaderCard';
import DownloadButton from '@/components/DownloadButton';
import { getTasks } from '@/lib/apiService';
import { getOrFetchDriverData } from '@/lib/driverDataHelper'; // Import Helper Driver
import { toastError, toastSuccess, toastWarning } from '@/lib/toastHelper';
import {
  calculateHaversineDistance,
  extractCustomerId,
  extractLocationId,
  formatCoordinates,
  formatToApiUtc,
  formatYYYYMMDDToDDMMYYYY,
  normalizeEmail, // Import Normalize Email
} from '@/lib/utils';

import UpdateLonglatTable from './components/UpdateLonglatTable';

export default function UpdateLonglatPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  // Data utama hari ini
  const [tasksData, setTasksData] = useState([]);
  // Data riwayat 3 bulan
  const [historyMap, setHistoryMap] = useState(new Map());
  // Range tanggal history untuk judul modal
  const [historyRange, setHistoryRange] = useState({ start: '', end: '' });

  const [error, setError] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDateChange = (date) => {
    if (!date) return;
    if (date.getDay() === 0) {
      toastError('Tidak ada pengiriman saat Minggu. Silahkan pilih tanggal lain');
      return;
    }
    setSelectedDate(date);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setTasksData([]);
    setHistoryMap(new Map());

    if (selectedDate.getDay() === 0) {
      setLoading(false);
      return;
    }

    try {
      if (typeof window === 'undefined') return;

      const hubId = localStorage.getItem('userLocation');
      if (!hubId) throw new Error('Lokasi Hub tidak ditemukan. Harap login ulang.');

      // 1. Ambil Data Driver untuk Mapping Nama
      const drivers = await getOrFetchDriverData(hubId);
      const emailToNameMap = new Map();
      if (drivers) {
        drivers.forEach((d) => {
          const normEmail = normalizeEmail(d.email);
          if (normEmail) emailToNameMap.set(normEmail, d.name);
        });
      }

      // 2. Waktu untuk Data Utama (Hari Ini)
      const localStart = new Date(selectedDate);
      localStart.setHours(0, 0, 0, 0);
      const localEnd = new Date(localStart);
      localEnd.setHours(23, 59, 59, 999);

      const timeFrom = formatToApiUtc(localStart);
      const timeTo = formatToApiUtc(localEnd);

      // 3. Waktu untuk History (3 Bulan ke belakang)
      const historyStart = new Date(localStart);
      historyStart.setMonth(historyStart.getMonth() - 3); // Mundur 3 bulan
      const historyTimeFrom = formatToApiUtc(historyStart);

      // Format tanggal untuk UI Modal (dd MMMM yyyy)
      const options = { day: 'numeric', month: 'long', year: 'numeric' };
      setHistoryRange({
        start: historyStart.toLocaleDateString('id-ID', options),
        end: localEnd.toLocaleDateString('id-ID', options),
      });

      // 4. Parallel Fetching: Task Hari Ini & Task History
      const [todayTasks, historyTasks] = await Promise.all([
        getTasks({
          status: 'DONE',
          hubId,
          timeFrom,
          timeTo,
          timeBy: 'doneTime',
          limit: 1000,
        }),
        getTasks({
          status: 'DONE',
          hubId,
          timeFrom: historyTimeFrom,
          timeTo: timeTo,
          timeBy: 'doneTime',
          limit: 5000,
        }),
      ]);

      // Set Data Utama
      if (!todayTasks || todayTasks.length === 0) {
        setTasksData([]);
      } else {
        setTasksData(todayTasks);
      }

      // Process History Data menjadi Map
      const map = new Map();
      if (historyTasks && Array.isArray(historyTasks)) {
        // URUTKAN DARI TANGGAL AWAL (LAMA) KE TANGGAL TERPILIH (BARU) [ASCENDING]
        historyTasks.sort((a, b) => new Date(a.doneTime) - new Date(b.doneTime));

        historyTasks.forEach((task) => {
          // Hanya ambil task yang ada update lokasi (klikLokasiClient)
          // Atau jika ingin menampilkan semua kunjungan, hapus kondisi ini.
          // Tapi biasanya history update lokasi hanya yg ada update-nya.
          if (!task.klikLokasiClient) return;

          const name = task.customerName || '';
          if (!name) return;

          if (!map.has(name)) {
            map.set(name, []);
          }

          // Format Tanggal
          let dateStr = '-';
          if (task.doneTime) {
            try {
              dateStr = new Date(task.doneTime).toLocaleDateString('id-ID', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              });
            } catch (e) {
              dateStr = String(task.doneTime);
            }
          }

          // Mapping Driver Name
          const rawAssignee = Array.isArray(task.assignee) ? task.assignee[0] : '';
          const normAssignee = normalizeEmail(rawAssignee);
          const driverName = emailToNameMap.get(normAssignee) || rawAssignee || '-';

          // Hitung Perbedaan Jarak
          const bedaJarak = calculateHaversineDistance(task.longlat, task.klikLokasiClient);

          map.get(name).push({
            date: dateStr,
            longlat: task.klikLokasiClient, // New Longlat
            distanceDiff: bedaJarak,
            driverName: driverName,
          });
        });
      }
      setHistoryMap(map);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Gagal mengambil data task.');
      toastWarning('Gagal mengambil data task.');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- PROCESSING DATA (Data Tabel Utama) ---
  const processedData = useMemo(() => {
    if (loading || !tasksData) return [];

    const updateList = [];

    for (const task of tasksData) {
      if (task.klikLokasiClient) {
        const customerName = task.customerName || '';

        const custId = extractCustomerId(customerName);
        const locId = extractLocationId(customerName);

        const bedaJarak = calculateHaversineDistance(task.longlat, task.klikLokasiClient);

        // Flagging Merah: Jika salah satu ID tidak ada
        const isDataIncomplete = !custId || !locId;

        updateList.push({
          customerName: customerName,
          customerId: custId,
          locationId: locId,
          newLonglat: formatCoordinates(task.klikLokasiClient),
          bedaJarak: bedaJarak !== null ? bedaJarak : 0,
          originalTask: task,
          isIncomplete: isDataIncomplete,
        });
      }
    }

    updateList.sort((a, b) => a.bedaJarak - b.bedaJarak);

    return updateList;
  }, [loading, tasksData]);

  // --- DOWNLOAD EXCEL HANDLER ---
  const handleDownloadExcel = () => {
    if (processedData.length === 0) {
      toastWarning('Tidak ada data untuk diunduh.');
      return;
    }

    setIsDownloading(true);
    try {
      const wb = XLSX.utils.book_new();

      const headers = [
        'No',
        'Customer Name',
        'Customer ID',
        'Location ID',
        'New Longlat',
        'Beda Jarak (m)',
      ];

      const sheetData = [headers];

      processedData.forEach((row, index) => {
        // Logic Excel: Jika incomplete, ID di-strip
        const displayCustId = row.isIncomplete ? '-' : row.customerId || '';
        const displayLocId = row.isIncomplete ? '-' : row.locationId || '';

        sheetData.push([
          index + 1,
          row.customerName,
          displayCustId,
          displayLocId,
          row.newLonglat,
          row.bedaJarak,
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(sheetData);

      const headerStyle = {
        font: { bold: true, color: { rgb: '000000' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        fill: { fgColor: { rgb: 'EFEFEF' } },
      };

      const redFillStyle = {
        fill: { patternType: 'solid', fgColor: { rgb: 'FFC7CE' } },
      };

      const range = XLSX.utils.decode_range(ws['!ref']);

      ws['!cols'] = [{ wch: 5 }, { wch: 40 }, { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 15 }];

      for (let R = range.s.r; R <= range.e.r; ++R) {
        const rowData = R > 0 ? processedData[R - 1] : null;

        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };

          if (R === 0) {
            ws[cellRef].s = headerStyle;
          } else {
            if (rowData && rowData.isIncomplete) {
              ws[cellRef].s = redFillStyle;
            }
            if (C !== 1) {
              if (!ws[cellRef].s) ws[cellRef].s = {};
              ws[cellRef].s.alignment = { horizontal: 'center' };
            }
          }
        }
      }

      XLSX.utils.book_append_sheet(wb, ws, 'Update Longlat');

      const fileName = `Update_Longlat_${formatYYYYMMDDToDDMMYYYY(selectedDate)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toastSuccess('Berhasil mengunduh data.');
    } catch (e) {
      console.error(e);
      toastError('Gagal membuat Excel.');
    } finally {
      setIsDownloading(false);
    }
  };

  // --- RENDER COMPONENTS ---
  const datePicker = (
    <DatePicker
      className="border border-gray-300 rounded-lg p-2.5 text-center font-medium text-slate-700 shadow-sm outline-none w-full md:w-48 cursor-pointer hover:bg-gray-50 transition-colors"
      dateFormat="dd MMMM yyyy"
      disabled={loading || isDownloading}
      maxDate={new Date()}
      onChange={handleDateChange}
      selected={selectedDate}
      wrapperClassName="w-full md:w-auto"
    />
  );

  const downloadBtn = (
    <DownloadButton
      onClick={handleDownloadExcel}
      disabled={loading || isDownloading || processedData.length === 0}
      isLoading={isDownloading}
      width="w-full md:w-auto"
    />
  );

  const headerItems = [
    {
      label: 'Tanggal Pengiriman',
      component: datePicker,
      hideLabel: false,
    },
    {
      label: 'Action',
      component: downloadBtn,
      hideLabel: true,
    },
  ];

  const subtitle = (
    <>
      Daftar customer yang melakukan{' '}
      <span className="font-semibold text-sky-600">update koordinat lokasi</span>.
    </>
  );

  return (
    <div className="w-full max-w-none px-4 sm:px-6 pb-2">
      <HeaderCard title="Update Longlat" subtitle={subtitle} items={headerItems} />

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          <strong>Gagal memuat data:</strong> {error}
        </div>
      )}

      <BodyCard
        isLoading={loading}
        loadingText="Memuat Data Update Longlat..."
        isEmpty={!loading && processedData.length === 0}
        emptyMessage="Tidak ada data task ditemukan untuk tanggal ini."
      >
        <div className="p-6 h-full overflow-y-auto">
          {/* Kirim props historyRange ke tabel */}
          <UpdateLonglatTable
            data={processedData}
            historyMap={historyMap}
            historyRange={historyRange}
          />
        </div>
      </BodyCard>
    </div>
  );
}
