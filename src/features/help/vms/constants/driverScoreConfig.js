// File: src/features/help/vms/constants/driverScoreConfig.js

/**
 * Konfigurasi penilaian skor sopir
 * Mudah disesuaikan jika terdapat perubahan kebijakan / bobot di masa mendatang
 */
export const DRIVER_SCORE_CONFIG = {
  // Jarak tempuh minimum untuk penilaian (300 km)
  MIN_DISTANCE: 300,

  // Persentase batas peringatan terhadap jarak tempuh (5%)
  WARNING_THRESHOLD_PERCENT: 0.05,

  // Definisi jenis peringatan / kejadian beserta bobot penilaian
  INCIDENT_TYPES: [
    {
      id: 'suddenAcceleration',
      label: 'Akselerasi Mendadak',
      weight: 0.23,
      weightPercent: 23,
      description: 'Kecepatan naik > 9,18 km/jam dalam 1 detik',
    },
    {
      id: 'suddenBraking',
      label: 'Perlambatan Mendadak',
      weight: 0.28,
      weightPercent: 28,
      description: 'Kecepatan turun > 9,72 km/jam dalam 1 detik',
    },
    {
      id: 'sharpTurn',
      label: 'Tikungan Tajam',
      weight: 0.22,
      weightPercent: 22,
      description: 'Perubahan arah > 20 derajat dalam 1 detik',
    },
    {
      id: 'overSpeed',
      label: 'Kecepatan Melebihi Batas Aman',
      weight: 0.17,
      weightPercent: 17,
      description: 'Melewati batas kecepatan 75 km/jam',
    },
    {
      id: 'idleOvertime',
      label: 'Melebihi Batas Waktu Diam',
      weight: 0.1,
      weightPercent: 10,
      description: 'Kendaraan diam > 15 menit',
    },
  ],

  // Rentang nilai indeks skor
  INDEX_RANGES: [
    {
      min: 91,
      max: 100,
      grade: 'A',
      label: 'Sangat Baik',
      badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      pillClass: 'bg-emerald-600 text-white',
    },
    {
      min: 71,
      max: 90,
      grade: 'B',
      label: 'Baik',
      badgeClass: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
      pillClass: 'bg-sky-600 text-white',
    },
    {
      min: 51,
      max: 70,
      grade: 'C',
      label: 'Cukup',
      badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
      pillClass: 'bg-amber-600 text-white',
    },
    {
      min: 31,
      max: 50,
      grade: 'D',
      label: 'Kurang',
      badgeClass: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
      pillClass: 'bg-orange-600 text-white',
    },
    {
      min: 0,
      max: 30,
      grade: 'E',
      label: 'Buruk',
      badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
      pillClass: 'bg-rose-600 text-white',
    },
  ],
};

/**
 * Mendapatkan indeks skor dan warna berdasarkan nilai total
 */
export function getScoreIndex(score) {
  if (score === null || score === undefined || isNaN(score)) {
    return {
      grade: '-',
      label: '-',
      badgeClass:
        'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      pillClass: 'bg-slate-400 text-white',
    };
  }

  // Handle rounding edge case (misal 90.5 atau nilai desimal)
  // Rentang standar: 91-100: A, 71-90: B, dst.
  for (const item of DRIVER_SCORE_CONFIG.INDEX_RANGES) {
    if (score >= item.min) {
      return item;
    }
  }

  return DRIVER_SCORE_CONFIG.INDEX_RANGES[DRIVER_SCORE_CONFIG.INDEX_RANGES.length - 1];
}
