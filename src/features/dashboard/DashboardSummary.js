'use client';

import { useState, useEffect, forwardRef } from 'react'; // <-- 'forwardRef' di-import
import { getTasks } from '@/lib/apiService';
import { toastError, toastWarning, toastSuccess } from '@/lib/toastHelper';
import { isDateSunday } from '@/lib/utils';
import Spinner from '@/components/Spinner';
import Tooltip from '@/components/Tooltip';

// ... (Helper functions: getTodayString, normalizeEmail, getWIBDateString - TIDAK BERUBAH) ...
const getTodayString = () => new Date().toISOString().split('T')[0];
const normalizeEmail = (email) => {
  if (!email) return null;
  return email.toLowerCase().trim();
};
const getWIBDateString = (utcTimestamp) => {
  if (!utcTimestamp) return null;
  try {
    const date = new Date(utcTimestamp);
    return date
      .toLocaleString('en-GB', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
      .replace(/\//g, '-');
  } catch (e) {
    return null;
  }
};

// --- (Komponen StatCard - Diperbarui untuk menerima 'ref' via forwardRef) ---
const StatCard = forwardRef(function StatCard(
  // 1. Props (argumen pertama)
  { title, value, isLoading, className = '', valueClassName = '', tooltipContent },
  // 2. 'ref' (argumen kedua) - ini akan datang dari <Tooltip>
  ref
) {
  // 3. Buat elemen <div> (Kartu)
  const cardElement = (
    // 4. Teruskan 'ref' ke elemen <div>
    <div ref={ref} className={`bg-white shadow-md rounded-lg p-6 ${className}`}>
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      {isLoading ? (
        <div className="mt-2 h-8 w-12 bg-gray-200 animate-pulse rounded"></div>
      ) : (
        <p className={`mt-1 text-3xl font-semibold text-gray-900 ${valueClassName}`}>{value}</p>
      )}
    </div>
  );

  // 5. Jika ada 'tooltipContent', bungkus 'cardElement' dengan <Tooltip>
  if (tooltipContent) {
    // Kita tidak bisa membungkus 'ref' di dalam 'ref',
    // jadi kita harus meneruskan 'ref' ke 'cardElement'
    // dan 'Tooltip' akan menangani event hover secara terpisah.
    // Solusi paling sederhana adalah membungkusnya.
    return <Tooltip tooltipContent={tooltipContent}>{cardElement}</Tooltip>;
  }

  // 6. Jika tidak, kembalikan 'cardElement' saja
  return cardElement;
});
StatCard.displayName = 'StatCard'; // (Good practice untuk debugging)
// --- (SELESAI PEMBARUAN StatCard) ---

// ... (Fungsi formatToApiUtc - TIDAK BERUBAH) ...
const formatToApiUtc = (date) => {
  return date.toISOString().slice(0, 19).replace('T', ' ');
};

// ... (Fungsi processOrderInfo - TIDAK BERUBAH) ...
function processOrderInfo(rawOrderId) {
  if (!rawOrderId || rawOrderId === 'N/A') {
    return {
      tooltip: 'Tidak ada nomor SO',
      copyValue: null,
    };
  }
  const firstOrderId = rawOrderId.split(',')[0].trim();
  let copyValueToUse = null;
  if (firstOrderId.startsWith('SO') && firstOrderId.includes('-')) {
    const processedCopy = firstOrderId.split('-')[1];
    if (processedCopy) {
      copyValueToUse = processedCopy;
    } else {
      copyValueToUse = firstOrderId;
    }
  } else {
    copyValueToUse = firstOrderId;
  }
  return {
    tooltip: rawOrderId,
    copyValue: copyValueToUse,
  };
}

export default function DashboardSummary({ driverData }) {
  // ... (State dan Handler - TIDAK BERUBAH) ...
  const [selectedDate, setSelectedDate] = useState(getTodayString);
  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState(null);
  const [error, setError] = useState(null);

  const handleCopy = (task) => {
    if (!task.copyValue) {
      toastWarning('Tidak ada nomor SO untuk disalin');
      return;
    }
    navigator.clipboard.writeText(task.copyValue).then(
      () => {
        toastSuccess(`Salin: ${task.tooltip}`);
      },
      (err) => {
        toastError('Gagal menyalin ke clipboard');
        console.error('Gagal menyalin:', err);
      }
    );
  };

  // ... (useEffect - Logic pengambilan data tidak berubah) ...
  useEffect(() => {
    async function fetchData() {
      // 1. CEK: JANGAN fetch data tasks SEBELUM data driver (prop) siap.
      if (!driverData || driverData.length === 0) {
        setLoading(true);
        return;
      }

      // Cek Hari Minggu di Awal
      const date = new Date(selectedDate.replace(/-/g, '/'));
      if (date.getDay() === 0) {
        setLoading(false);
        setError(null);
        setSummaryData({
          totalTasks: 0,
          unassigned: 0,
          manualAssignList: [],
          unassignedList: [],
          done: 0,
          ongoing: 0,
          assignedTasks: 0,
          flowDelivery: 0,
          flowReDelivery: 0,
          flowPendingGR: 0,
          crossDayTasks: [],
        });
        return;
      }

      setLoading(true);
      setError(null);
      setSummaryData(null);

      // 2. Buat driverMap DARI PROPS
      const driverMap = new Map();
      try {
        driverData.forEach((driver) => {
          if (driver.email && driver.name) {
            driverMap.set(normalizeEmail(driver.email), driver.name);
          }
        });
      } catch (e) {
        toastWarning('Gagal memproses cache nama driver.');
      }

      // 3. Lanjutkan fetch data tasks
      try {
        const hubId = localStorage.getItem('userLocation');
        if (!hubId) {
          throw new Error('Lokasi Hub tidak ditemukan. Harap login ulang.');
        }

        // Logika konversi tanggal
        const localStart = new Date(selectedDate.replace(/-/g, '/'));
        localStart.setHours(0, 0, 0, 0);
        const localEnd = new Date(localStart);
        localEnd.setHours(23, 59, 59, 999);
        const timeFrom = formatToApiUtc(localStart);
        const timeTo = formatToApiUtc(localEnd);

        const tasksData = await getTasks({
          status: 'DONE,ONGOING,UNASSIGNED',
          hubId: hubId,
          timeFrom: timeFrom,
          timeTo: timeTo,
          timeBy: 'startTime',
          limit: 1000,
        });

        // Tampilan jika data kosong
        if (!tasksData || tasksData.length === 0) {
          setSummaryData({
            totalTasks: 0,
            unassigned: 0,
            manualAssignList: [],
            unassignedList: [],
            done: 0,
            ongoing: 0,
            assignedTasks: 0,
            flowDelivery: 0,
            flowReDelivery: 0,
            flowPendingGR: 0,
            crossDayTasks: [],
          });
          return;
        }

        // Inisialisasi variabel baru
        let manualAssignList = [];
        let crossDayTasks = [];
        let unassignedList = [];
        let done = 0;
        let ongoing = 0;
        let unassigned = 0;
        let flowDelivery = 0;
        let flowReDelivery = 0;
        let flowPendingGR = 0;

        for (const task of tasksData) {
          const flow = task.flow || 'N/A';
          const orderInfo = processOrderInfo(task.orderId);

          // Cek Status
          if (task.status === 'DONE') done++;
          else if (task.status === 'ONGOING') ongoing++;
          else if (task.status === 'UNASSIGNED') {
            unassigned++;
            unassignedList.push({
              customer: task.customerName || 'N/A',
              flow: flow,
              copyValue: orderInfo.copyValue,
              tooltip: orderInfo.tooltip,
            });
          }

          // Cek Manual Assign
          if (!task.routingResultId && task.status !== 'UNASSIGNED') {
            const rawAssignee =
              task.assignee && task.assignee.length > 0 ? task.assignee[0] : 'N/A';
            const normalizedAssignee = normalizeEmail(rawAssignee);
            let finalAssignee = driverMap.get(normalizedAssignee) || rawAssignee;
            if (finalAssignee === 'N/A') finalAssignee = '-';

            manualAssignList.push({
              customer: task.customerName || 'N/A',
              assignee: finalAssignee,
              flow: flow,
              copyValue: orderInfo.copyValue,
              tooltip: orderInfo.tooltip,
            });
          }

          // Cek Flow
          if (flow === 'Delivery') {
            flowDelivery++;
          } else if (flow.includes('Re Delivery')) {
            flowReDelivery++;
          } else if (flow.includes('Pending GR')) {
            flowPendingGR++;
          }

          // Cek Task Beda Hari
          if (task.status === 'DONE' && task.startTime && task.doneTime) {
            const startDateWIB = getWIBDateString(task.startTime);
            const doneDateWIB = getWIBDateString(task.doneTime);

            // --- (PERUBAHAN POIN 3) ---
            if (startDateWIB && doneDateWIB && startDateWIB !== doneDateWIB) {
              // Buat objek Date untuk perhitungan (ini aman, string sudah UTC)
              const startDate = new Date(task.startTime);
              const doneDate = new Date(task.doneTime);

              // Hitung perbedaan dalam milidetik
              const diffInMs = doneDate.getTime() - startDate.getTime();

              // Konversi ke hari dan bulatkan ke atas
              // (2 jam = 1 hari, 25 jam = 2 hari)
              const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

              const rawAssignee =
                task.assignee && task.assignee.length > 0 ? task.assignee[0] : 'N/A';
              const normalizedAssignee = normalizeEmail(rawAssignee);
              const driverName = driverMap.get(normalizedAssignee) || rawAssignee;

              crossDayTasks.push({
                customer: task.customerName || 'N/A',
                // Simpan format baru: "DD-MM-YYYY (H+N)"
                doneDateDisplay: `${doneDateWIB} (H+${diffInDays})`,
                driver: driverName,
                copyValue: orderInfo.copyValue,
                tooltip: orderInfo.tooltip,
              });
            }
            // --- (SELESAI POIN 3) ---
          }
        }

        setSummaryData({
          totalTasks: tasksData.length,
          unassigned: unassigned,
          manualAssignList: manualAssignList,
          unassignedList: unassignedList,
          done: done,
          ongoing: ongoing,
          assignedTasks: done + ongoing, // Total baru
          flowDelivery: flowDelivery,
          flowReDelivery: flowReDelivery,
          flowPendingGR: flowPendingGR,
          crossDayTasks: crossDayTasks,
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [driverData, selectedDate]);

  // Handler Datepicker (tidak berubah)
  const handleDateChange = (e) => {
    const date = e.target.value;
    if (isDateSunday(date)) {
      toastError('Tidak ada pengiriman saat Minggu. Silahkan pilih tanggal lain');
      return;
    }
    setSelectedDate(date);
  };

  return (
    <div className="w-full max-w-none">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard Rangkuman</h1>

      {/* Tampilan Error (Jika ada) */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          <strong>Gagal memuat data:</strong> {error}
        </div>
      )}

      {/* --- (PERUBAHAN TOTAL LAYOUT) --- */}
      {/* Grid 3 Kolom (Desktop) -> tumpukan 3 Blok (Mobile)
        Menggunakan Mobile-First Order (Urutan HTML = Urutan Mobile)
        Lalu menggunakan lg:order- untuk mengatur ulang di desktop
      */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* --- Blok 1: Kartu Utama (Mobile: Posisi 1 / Desktop: Posisi 2 [Tengah]) --- */}
        <div className="lg:col-span-1 lg:order-2 flex flex-col gap-6">
          <StatCard
            title="Total Task"
            value={summaryData?.totalTasks}
            isLoading={loading}
            className="flex flex-col items-center justify-center text-center h-full min-h-[150px]"
            valueClassName="text-5xl"
            tooltipContent="Total semua task (Selesai, Berjalan, & Belum Assign)."
          />
          <StatCard
            title="Task Ter-assign"
            value={summaryData?.assignedTasks}
            isLoading={loading}
            className="flex flex-col items-center justify-center text-center h-full min-h-[150px]"
            valueClassName="text-5xl"
            tooltipContent="Total task yang sudah di-assign ke driver (Selesai + Berjalan)."
          />
        </div>

        {/* --- Blok 2: Kontrol & Kartu Sekunder (Mobile: Posisi 2 / Desktop: Posisi 1 [Kiri]) --- */}
        <div className="lg:col-span-2 lg:order-1 flex flex-col gap-6">
          {/* Datepicker Card */}
          <div className="bg-white shadow-md rounded-lg p-6">
            <label htmlFor="dashboardDate" className="block text-sm font-medium text-gray-700 mb-1">
              Pilih Tanggal Laporan
            </label>
            <input
              type="date"
              id="dashboardDate"
              value={selectedDate}
              onChange={handleDateChange}
              className="p-2 border border-gray-300 rounded-md text-gray-900 w-full"
              disabled={loading}
            />
          </div>

          {/* (POIN 1) Grid Kartu Sekunder: 2 kolom di mobile, 3 di desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Baris 1 */}
            <StatCard
              title="Belum Assign"
              value={summaryData?.unassigned}
              isLoading={loading}
              tooltipContent="Jumlah task dengan status 'UNASSIGNED'."
            />
            <StatCard
              title="Berjalan"
              value={summaryData?.ongoing}
              isLoading={loading}
              tooltipContent="Jumlah task dengan status 'ONGOING'."
            />
            <StatCard
              title="Selesai"
              value={summaryData?.done}
              isLoading={loading}
              tooltipContent="Jumlah task dengan status 'DONE'."
            />

            {/* Baris 2 */}
            <StatCard
              title="Manual Assign"
              value={summaryData?.manualAssignList?.length}
              isLoading={loading}
              tooltipContent="Jumlah task yang di-assign secara manual tanpa melalui proses routing"
            />
            <StatCard
              title="Beda Hari"
              value={summaryData?.crossDayTasks?.length}
              isLoading={loading}
              tooltipContent="Jumlah task 'DONE' yang tanggal Mulai dan Selesai berbeda."
            />

            {/* Baris 3 */}
            <StatCard
              title="Delivery"
              value={summaryData?.flowDelivery}
              isLoading={loading}
              tooltipContent="Jumlah task dengan flow 'Delivery'."
            />
            <StatCard
              title="Re-Delivery"
              value={summaryData?.flowReDelivery}
              isLoading={loading}
              tooltipContent="Jumlah task dengan flow 'Re Delivery'."
            />
            <StatCard
              title="Pending GR"
              value={summaryData?.flowPendingGR}
              isLoading={loading}
              tooltipContent="Jumlah task dengan flow 'Pending GR'."
            />
          </div>
        </div>

        {/* --- Blok 3: Daftar List (Mobile: Posisi 3 / Desktop: Posisi 3 [Kanan]) --- */}
        <div className="lg:col-span-2 lg:order-3 flex flex-col gap-6">
          {/* Daftar Task Belum Assign (Paling Atas) */}
          <div
            className="bg-white shadow-md rounded-lg overflow-hidden 
                          flex flex-col h-64"
          >
            <h3 className="text-lg font-semibold text-gray-900 p-4 border-b shrink-0">
              Daftar Task Belum Assign
            </h3>

            {loading ? (
              <div className="flex justify-center items-center p-10 grow">
                <Spinner />
              </div>
            ) : summaryData && summaryData.unassignedList.length > 0 ? (
              <div className="overflow-y-auto grow">
                <table className="min-w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Flow
                      </th>
                      <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Customer Name
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {summaryData.unassignedList.map((task, index) => (
                      <Tooltip key={index} tooltipContent={task.tooltip}>
                        <tr
                          className="hover:bg-gray-50 cursor-copy"
                          onClick={() => handleCopy(task)}
                        >
                          <td className="p-3 text-sm text-gray-800">{task.flow}</td>
                          <td className="p-3 text-sm text-gray-800">{task.customer}</td>
                        </tr>
                      </Tooltip>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-10 text-center flex justify-center items-center grow">
                <p className="text-gray-500">Semua Task Sudah Di-Assign!</p>
              </div>
            )}
          </div>

          {/* Daftar Task Manual (Fixed Height) */}
          <div
            className="bg-white shadow-md rounded-lg overflow-hidden 
                          flex flex-col h-64"
          >
            <h3 className="text-lg font-semibold text-gray-900 p-4 border-b shrink-0">
              Daftar Task Manual
            </h3>

            {loading ? (
              <div className="flex justify-center items-center p-10 grow">
                <Spinner />
              </div>
            ) : summaryData && summaryData.manualAssignList.length > 0 ? (
              <div className="overflow-y-auto grow">
                <table className="min-w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Flow
                      </th>
                      <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Customer Name
                      </th>
                      <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Assignee
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {summaryData.manualAssignList.map((task, index) => (
                      <Tooltip key={index} tooltipContent={task.tooltip}>
                        <tr
                          className="hover:bg-gray-50 cursor-copy"
                          onClick={() => handleCopy(task)}
                        >
                          <td className="p-3 text-sm text-gray-800">{task.flow}</td>
                          <td className="p-3 text-sm text-gray-800">{task.customer}</td>
                          <td className="p-3 text-sm text-gray-800">{task.assignee}</td>
                        </tr>
                      </Tooltip>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-10 text-center flex justify-center items-center grow">
                <p className="text-gray-500">Tidak Ada Task yang di Manual Assign!</p>
              </div>
            )}
          </div>

          {/* Daftar Task Beda Hari (Fixed Height) */}
          <div
            className="bg-white shadow-md rounded-lg overflow-hidden 
                          flex flex-col h-64"
          >
            <h3 className="text-lg font-semibold text-gray-900 p-4 border-b shrink-0">
              Daftar Task Beda Hari
            </h3>

            {loading ? (
              <div className="flex justify-center items-center p-10 grow">
                <Spinner />
              </div>
            ) : summaryData && summaryData.crossDayTasks.length > 0 ? (
              <div className="overflow-y-auto grow">
                <table className="min-w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Customer Name
                      </th>
                      <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Tgl. Selesai
                      </th>
                      <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Driver
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {summaryData.crossDayTasks.map((task, index) => (
                      <Tooltip key={index} tooltipContent={task.tooltip}>
                        <tr
                          className="hover:bg-gray-50 cursor-copy"
                          onClick={() => handleCopy(task)}
                        >
                          <td className="p-3 text-sm text-gray-800">{task.customer}</td>
                          <td className="p-3 text-sm text-gray-800">{task.doneDateDisplay}</td>
                          <td className="p-3 text-sm text-gray-800">{task.driver}</td>
                        </tr>
                      </Tooltip>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-10 text-center flex justify-center items-center grow">
                <p className="text-gray-500">Tidak Ada Task yang Selesai di Hari Berbeda!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
