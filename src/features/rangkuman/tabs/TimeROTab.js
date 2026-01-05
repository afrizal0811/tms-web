// File: src/features/rangkuman/tabs/TimeROTab.js
'use client';

import { formatDateWIB, isDateSunday } from '@/lib/utils'; // Pastikan import ini ada
import { useMemo } from 'react';

const violetColor = 'bg-[#d9d2e9]';
const headerClass = 'px-6 py-3 border-r border-b border-gray-300 font-bold w-1/3 text-center';
const dataClass =
  'px-6 py-4 font-medium text-gray-900 border-r border-b border-gray-200 text-center';
// Fungsi helper untuk membandingkan apakah Tanggal, Bulan, Tahun sama
const isSameDayWIB = (isoString1, isoString2) => {
  if (!isoString1 || !isoString2) return false;
  const d1 = formatDateWIB(new Date(isoString1), 'YYYY-MM-DD');
  const d2 = formatDateWIB(new Date(isoString2), 'YYYY-MM-DD');
  return d1 === d2;
};

export default function TimeROTab({ tasks, startDateStr, endDateStr, translate, language }) {
  const isIndo = language === 'id';
  // Proses data menggunakan useMemo agar tidak render ulang jika data tidak berubah
  const processedData = useMemo(() => {
    const dataMap = {};

    // 1. Inisialisasi Range Tanggal sesuai filter
    // Menggunakan parsing manual YYYY-MM-DD untuk menghindari timezone bug
    const start = new Date(startDateStr);
    start.setHours(0, 0, 0, 0); // Normalize

    const end = new Date(endDateStr);
    end.setHours(0, 0, 0, 0); // Normalize

    const current = new Date(start);

    // Loop sampai current > end
    while (current <= end) {
      const dateKey = formatDateWIB(current, 'YYYY-MM-DD');
      // Format tampilan tanggal (contoh: 28 Oct 2025)
      const displayDate = current.toLocaleDateString(isIndo ? 'id-ID' : 'en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      dataMap[dateKey] = {
        dateKey: dateKey, // Disimpan untuk cek Sunday
        dateDisplay: displayDate,
        minCreatedTime: null,
        minAssignedTime: null,
        // Properti Debug
        debugStartOrder: null,
        debugEndOrder: null,
      };
      // Increment 1 hari
      current.setDate(current.getDate() + 1);
    }

    // 2. Iterasi semua tasks untuk mencari nilai terkecil (Start & End)
    if (tasks && Array.isArray(tasks)) {
      tasks.forEach((task) => {
        // Filter: Hanya task yang dibuat dari API
        if (task.createdFrom !== 'API') return;

        if (!task.createdTime) return;

        // Tentukan task ini masuk ke tanggal mana (berdasarkan createdTime WIB)
        const taskDateKey = formatDateWIB(new Date(task.createdTime), 'YYYY-MM-DD');

        // Jika tanggal task ada dalam range filter
        if (dataMap[taskDateKey]) {
          const currentData = dataMap[taskDateKey];

          // Cek Min Created Time (Start RO)
          if (
            !currentData.minCreatedTime ||
            new Date(task.createdTime) < new Date(currentData.minCreatedTime)
          ) {
            currentData.minCreatedTime = task.createdTime;
            currentData.debugStartOrder = task.customerOrder; // Simpan untuk debug
          }

          // Cek Min Assigned Time (End RO)
          if (task.assignedTime) {
            if (
              !currentData.minAssignedTime ||
              new Date(task.assignedTime) < new Date(currentData.minAssignedTime)
            ) {
              currentData.minAssignedTime = task.assignedTime;
              currentData.debugEndOrder = task.customerOrder; // Simpan untuk debug
            }
          }
        }
      });
    }

    // Ubah object ke array untuk dirender dan urutkan
    return Object.keys(dataMap)
      .sort()
      .map((key) => dataMap[key]);
  }, [tasks, startDateStr, endDateStr, isIndo]);

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-b-lx shadow-sm border border-gray-200 p-0 overflow-auto">
      <div className="flex-1 overflow-auto">
        <table className="min-w-full text-sm text-left border-separate border border-gray-300 border-spacing-0">
          <thead className={`text-xs text-gray-700 uppercase sticky top-0 z-10 ${violetColor}`}>
            <tr>
              <th className={headerClass}>
                {translate('summary.tabs.time_ro.date_ro')}
              </th>
              <th className={headerClass}>
                {translate('summary.tabs.time_ro.start_ro')}
              </th>
              <th className={headerClass}>
                {translate('summary.tabs.time_ro.end_ro')}
              </th>
            </tr>
          </thead>
          <tbody>
            {processedData.map((row, idx) => {
              const isSunday = isDateSunday(row.dateKey);

              // Jika Minggu: Background Merah & Merge Cells
              if (isSunday) {
                return (
                  <tr key={idx} className="bg-red-200 border-b border-red-300 text-red-900 text-center">
                    <td className="px-6 py-4 font-medium border-r border-red-300">
                      {row.dateDisplay}
                    </td>
                    <td colSpan={2} className="px-6 py-4 font-bold text-center">
                      {translate('summary.tabs.time_ro.holiday')}
                    </td>
                  </tr>
                );
              }

              // Jika Hari Kerja Biasa
              const isValidEndRO = isSameDayWIB(row.minCreatedTime, row.minAssignedTime);
              const endRODisplay = isValidEndRO ? formatDateWIB(row.minAssignedTime, 'HH:mm') : '-';

              return (
                <tr key={idx} className="bg-white border-b hover:bg-gray-50">
                  <td className={dataClass}>
                    {row.dateDisplay}
                  </td>
                  <td className={dataClass}>
                    {formatDateWIB(row.minCreatedTime, 'HH:mm')}
                  </td>
                  <td className={dataClass}>
                    {endRODisplay}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
