// File: src/features/updateLonglat/UpdateLonglatPage.js
'use client';

import BodyCard from '@/components/card/BodyCard';
import HeaderCard from '@/components/card/HeaderCard';
import CustomDatePicker from '@/components/CustomDatePicker';
import DownloadButton from '@/components/DownloadButton';
import { getTasks } from '@/lib/apiService';
import { getOrFetchDriverData } from '@/lib/driverDataHelper';
import { toastError, toastSuccess, toastWarning } from '@/lib/toastHelper';
import {
  calculateHaversineDistance,
  formatCoordinates,
  formatToApiUtc,
  normalizeEmail,
  parseCustomerString,
} from '@/lib/utils';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import UpdateLonglatTable from './components/UpdateLonglatTable';
import { handleDownloadExcel } from './help';

export default function UpdateLonglatPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [loadingText, setLoadingText] = useState('Memuat Data...');
  const [tasksData, setTasksData] = useState([]);
  const [historyMap, setHistoryMap] = useState(new Map());
  const [historyRange, setHistoryRange] = useState({ start: '', end: '' });
  const [isDownloading, setIsDownloading] = useState(false);

  const driverMapRef = useRef(new Map());
  const hubName = localStorage.getItem('userLocationName');

  const handleDateChange = (date) => {
    if (!date) return;
    if (date.getDay() === 0) {
      toastError('Tidak ada pengiriman saat Minggu. Silahkan pilih tanggal lain');
      return;
    }
    setSelectedDate(date);
  };

  // --- HELPER: Process Raw Tasks to Map ---
  // Fungsi ini dipisahkan agar bisa dipakai saat Initial Load maupun saat Retry
  const processHistoryRawData = (rawTasks, targetCustomerSet) => {
    const tempMap = new Map();

    // Sort tanggal lama -> baru
    rawTasks.sort((a, b) => new Date(a.doneTime) - new Date(b.doneTime));

    rawTasks.forEach((task) => {
      if (!task.klikLokasiClient) return;
      const name = task.customerName || '';
      if (!name) return;
      // Filter hanya customer yg relevan
      if (!targetCustomerSet.has(name)) return;

      if (!tempMap.has(name)) {
        tempMap.set(name, []);
      }

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

      const rawAssignee = Array.isArray(task.assignee) ? task.assignee[0] : '';
      const normAssignee = normalizeEmail(rawAssignee);
      const driverName = driverMapRef.current.get(normAssignee) || rawAssignee || '-';

      const bedaJarak = calculateHaversineDistance(task.longlat, task.klikLokasiClient);

      tempMap.get(name).push({
        date: dateStr,
        newLonglat: task.klikLokasiClient,
        oldLonglat: task.longlat,
        distanceDiff: bedaJarak,
        driverName: driverName,
      });
    });

    return tempMap;
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadingText('Memuat Data Harian...');
    setTasksData([]);
    setHistoryMap(new Map());
    driverMapRef.current = new Map();

    if (selectedDate.getDay() === 0) {
      setLoading(false);
      return;
    }

    try {
      if (typeof window === 'undefined') return;
      const hubId = localStorage.getItem('userLocation');
      if (!hubId) throw new Error('Lokasi Hub tidak ditemukan. Harap login ulang.');

      // 1. Ambil Data Driver
      const drivers = await getOrFetchDriverData(hubId);
      if (drivers) {
        drivers.forEach((d) => {
          const normEmail = normalizeEmail(d.email);
          if (normEmail) driverMapRef.current.set(normEmail, d.name);
        });
      }

      // 2. Fetch Data Hari Ini
      const localStart = new Date(selectedDate);
      localStart.setHours(0, 0, 0, 0);

      const localEnd = new Date(selectedDate);
      localEnd.setHours(23, 59, 59, 999);

      const timeFrom = formatToApiUtc(localStart);
      const timeTo = formatToApiUtc(localEnd);

      const todayTasks = await getTasks({
        status: 'DONE',
        hubId,
        timeFrom,
        timeTo,
        timeBy: 'startTime',
        limit: 1000,
      });

      const currentData = todayTasks || [];
      setTasksData(currentData);

      // Identifikasi Customer
      const uniqueCustomersWithUpdates = new Set();
      currentData.forEach((task) => {
        if (task.klikLokasiClient && task.customerName) {
          uniqueCustomersWithUpdates.add(task.customerName);
        }
      });

      // Early Return jika tidak ada update
      if (uniqueCustomersWithUpdates.size === 0) {
        setLoading(false);
        return;
      }

      // --- STEP 3: Setup History Chunks ---
      setLoadingText('Memuat Riwayat...');

      const historyEndDate = new Date(selectedDate);
      const historyStartDate = new Date(selectedDate);
      historyStartDate.setMonth(historyStartDate.getMonth() - 2);

      // Setup UI Range
      const displayOptions = { day: 'numeric', month: 'long', year: 'numeric' };
      setHistoryRange({
        start: historyStartDate.toLocaleDateString('id-ID', displayOptions),
        end: historyEndDate.toLocaleDateString('id-ID', displayOptions),
      });

      const createDateChunks = (start, end, daysPerChunk = 15) => {
        const chunks = [];
        let current = new Date(start);
        const finalEnd = new Date(end);
        while (current < finalEnd) {
          const chunkStart = new Date(current);
          const chunkEnd = new Date(current);
          chunkEnd.setDate(chunkEnd.getDate() + daysPerChunk);
          if (chunkEnd > finalEnd) chunkEnd.setTime(finalEnd.getTime());
          chunkStart.setHours(0, 0, 0, 0);
          chunkEnd.setHours(23, 59, 59, 999);

          chunks.push({
            startStr: formatToApiUtc(chunkStart),
            endStr: formatToApiUtc(chunkEnd),
          });
          current.setDate(current.getDate() + daysPerChunk + 1);
        }
        return chunks;
      };

      const dateChunks = createDateChunks(historyStartDate, historyEndDate, 15);

      // --- Parallel Fetching dengan Status ---
      // Kita memetakan promise agar mengembalikan status 'ok' atau 'failed'
      const chunkPromises = dateChunks.map((chunk) =>
        getTasks({
          status: 'DONE',
          hubId,
          timeFrom: chunk.startStr,
          timeTo: chunk.endStr,
          timeBy: 'startTime',
          limit: 2000,
          fields: 'customerName,klikLokasiClient,longlat,doneTime,assignee',
        })
          .then((res) => ({ status: 'ok', data: res || [] }))
          .catch((err) => ({ status: 'failed', chunk: chunk, error: err }))
      );

      const results = await Promise.all(chunkPromises);

      // Pisahkan yang sukses dan gagal
      const successfulChunks = results.filter((r) => r.status === 'ok').flatMap((r) => r.data);
      const failedChunks = results.filter((r) => r.status === 'failed').map((r) => r.chunk);

      // --- TAMPILKAN HASIL SEADANYA DULU (Biar user gak nunggu lama) ---
      const initialMap = processHistoryRawData(successfulChunks, uniqueCustomersWithUpdates);
      setHistoryMap(initialMap);
      setLoading(false); // <--- UI TAMPIL DI SINI

      // --- STEP 4: RETRY LOGIC (Background) ---
      if (failedChunks.length > 0) {
        toastWarning(`Mengulang ${failedChunks.length} chunk yang gagal...`);

        // Jalankan retry
        const retryPromises = failedChunks.map((chunk) =>
          getTasks({
            status: 'DONE',
            hubId,
            timeFrom: chunk.startStr,
            timeTo: chunk.endStr,
            timeBy: 'startTime',
            limit: 2000,
            fields: 'customerName,klikLokasiClient,longlat,doneTime,assignee',
          })
            .then((res) => res || [])
            .catch((err) => {
              toastWarning('Retry masih gagal:', chunk.startStr);
              return []; // Jika gagal lagi, ya sudah give up
            })
        );

        const retryResults = await Promise.all(retryPromises);
        const recoveredTasks = retryResults.flat();

        if (recoveredTasks.length > 0) {
          // --- LOGIC MERGE ---
          // Munculkan loading lagi seperti request
          setLoading(true);
          setLoadingText('Menyinkronkan data tambahan...');

          // Beri jeda dikit biar loading terlihat (UX)
          await new Promise((r) => setTimeout(r, 500));

          // Proses data baru menjadi Map
          const newRecoveredMap = processHistoryRawData(recoveredTasks, uniqueCustomersWithUpdates);

          // Gabungkan ke State yang sudah ada
          setHistoryMap((prevMap) => {
            const mergedMap = new Map(prevMap); // Clone map lama

            for (const [customerName, newItems] of newRecoveredMap.entries()) {
              if (mergedMap.has(customerName)) {
                // Jika customer sudah ada, tambahkan item baru ke array existing
                const existingItems = mergedMap.get(customerName);
                const combined = [...existingItems, ...newItems];
                // Sort ulang biar rapi
                combined.sort((a, b) => {
                  // parsing tanggal manual karena format string 'DD/MM/YYYY' agak tricky sortingnya
                  // lebih aman pakai sorting by Date object original kalau disimpan,
                  // tapi karena disini string, kita biarkan append atau sort simple.
                  return 0;
                });
                mergedMap.set(customerName, combined);
              } else {
                // Jika customer belum ada (tapi aneh karena harusnya ada di list update hari ini)
                mergedMap.set(customerName, newItems);
              }
            }
            return mergedMap;
          });

          setLoading(false);
          toastSuccess('Data riwayat berhasil dilengkapi.');
        }
      }
    } catch (err) {
      toastError('Gagal mengambil data task.');
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- PROCESSING DATA ---
  const processedData = useMemo(() => {
    if (loading && tasksData.length === 0) return []; // Only block if no data at all

    const updateList = [];

    for (const task of tasksData) {
      if (task.klikLokasiClient) {
        const customerName = task.customerName || '';
        const { id: custId, location: locId } = parseCustomerString(customerName);
        const bedaJarak = calculateHaversineDistance(task.longlat, task.klikLokasiClient);
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
  }, [tasksData, loading]); // Added deps

  const datePicker = (
    <CustomDatePicker
      selected={selectedDate}
      onChange={handleDateChange}
      isLoading={loading || isDownloading}
      className="md:w-48"
      wrapperClassName="w-full"
    />
  );

  const downloadBtn = (
    <DownloadButton
      onClick={() => handleDownloadExcel(processedData, setIsDownloading, selectedDate, hubName)}
      disabled={loading || isDownloading || processedData.length === 0}
      isLoading={isDownloading}
      width="w-full md:w-auto"
    />
  );

  const headerItems = [
    { label: 'Tanggal Pengiriman', component: datePicker, hideLabel: false },
    { label: 'Action', component: downloadBtn, hideLabel: true },
  ];

  const subtitle = (
    <>
      Daftar customer yang memerlukan{' '}
      <span className="font-semibold text-sky-600">update koordinat lokasi</span>.
    </>
  );

  return (
    <div className="w-full max-w-none px-4 sm:px-6 pb-2">
      <HeaderCard title="Update Longlat" subtitle={subtitle} items={headerItems} />
      <BodyCard
        isLoading={loading}
        loadingText={loadingText}
        isEmpty={!loading && processedData.length === 0}
      >
        <div className="p-6 h-full overflow-y-auto">
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
