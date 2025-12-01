// File: lib/dashboardHelper.js

// Helper untuk memproses data Chart Service Level
export function processServiceLevelData(allTasks, view = 'monthly', selectedMonthKey = null) {
  if (!allTasks || allTasks.length === 0) return [];

  // Wadah Grouping
  const grouped = {};

  allTasks.forEach((task) => {
    // Gunakan doneTime atau createdTime
    const dateStr = task.doneTime || task.createdTime;
    if (!dateStr) return;

    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    // Key Bulanan: "2025-11"
    const monthKey = `${year}-${month}`;
    // Key Harian: "2025-11-03"
    const dayKey = `${year}-${month}-${day}`;

    // 1. MODE BULANAN (Tampilkan 12 Bulan)
    if (view === 'monthly') {
      if (!grouped[monthKey]) {
        // Label: "Nov"
        const label = date.toLocaleDateString('id-ID', { month: 'short' });
        grouped[monthKey] = { key: monthKey, label, total: 0, success: 0 };
      }

      grouped[monthKey].total += 1;
      if (isTaskSuccess(task)) {
        grouped[monthKey].success += 1;
      }
    }

    // 2. MODE HARIAN (Hanya untuk bulan yang dipilih)
    else if (view === 'daily' && selectedMonthKey) {
      if (monthKey !== selectedMonthKey) return; // Skip bulan lain

      // --- UPDATE: HIRAUKAN HARI MINGGU (0) ---
      if (date.getDay() === 0) return;
      // ---------------------------------------

      if (!grouped[dayKey]) {
        // Label: "03" (Tanggal saja biar ringkas)
        grouped[dayKey] = { key: dayKey, label: day, total: 0, success: 0 };
      }

      grouped[dayKey].total += 1;
      if (isTaskSuccess(task)) {
        grouped[dayKey].success += 1;
      }
    }
  });

  // Convert ke Array & Sort
  const chartData = Object.values(grouped)
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((item) => ({
      name: item.label, // Sumbu X
      key: item.key, // ID unik
      total: item.total,
      success: item.success,
      // Hitung Persentase (1 desimal)
      rate: item.total > 0 ? parseFloat(((item.success / item.total) * 100).toFixed(1)) : 0,
    }));

  return chartData;
}

// Helper Cek Status Sukses
function isTaskSuccess(task) {
  if (!task.label || task.label.length === 0) return false;
  const status = task.label[0].toUpperCase();
  // Sesuai request: Hanya "SUKSES" yang dihitung berhasil
  return status === 'SUKSES';
}
