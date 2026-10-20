// File: src/features/help/vms/helper/driverScoreExcelHelper.js
import * as XLSX from 'xlsx-js-style';
import { capitalizeText } from '@/lib/utils';
import { DRIVER_SCORE_CONFIG, getScoreIndex } from '../constants/driverScoreConfig';

/**
 * Validasi berkas excel penilaian driver
 * Baris 4 memuat header: Pengemudi, Total Skor, Indeks, Total Jarak Tempuh (Km),
 * Grup Kendaraan, Akselerasi Mendadak, Perlambatan Mendadak, Tikungan Tajam,
 * Kecepatan Melebihi Batas Aman, Melebihi Batas Waktu Diam.
 */
export async function validateDriverScoreFile(file) {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) return false;

    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    if (rows.length < 4) return false;

    let headerFound = false;
    for (let r = 0; r < Math.min(10, rows.length); r++) {
      const rowClean = rows[r].map((cell) =>
        String(cell || '')
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
      );

      const hasDriver = rowClean.some((c) => c.includes('pengemudi') || c.includes('sopir'));
      const hasDistance = rowClean.some(
        (c) => c.includes('jaraktempuh') || c.includes('totaljarak')
      );
      const hasAcceleration = rowClean.some((c) => c.includes('akselerasi'));
      const hasBraking = rowClean.some((c) => c.includes('perlambatan'));

      if (hasDriver && hasDistance && hasAcceleration && hasBraking) {
        headerFound = true;
        break;
      }
    }

    return headerFound;
  } catch (error) {
    console.error('Validation error for Driver Score file:', error);
    return false;
  }
}

/**
 * Parsing data excel penilaian sopir
 * Mengambil data tiap baris driver dari kolom:
 * - A: Sopir (Pengemudi)
 * - D: Jarak Tempuh
 * - F: Akselerasi Mendadak
 * - H: Perlambatan Mendadak
 * - J: Tikungan Tajam
 * - L: Kecepatan Melebihi Batas Aman
 * - N: Melebihi Batas Waktu Diam
 */
export async function parseDriverScoreExcel(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  // Cari index baris header (default baris 4 = index 3)
  let headerRowIndex = 3;
  for (let r = 0; r < Math.min(10, rows.length); r++) {
    const rowClean = rows[r].map((cell) =>
      String(cell || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
    );
    if (
      rowClean.some((c) => c.includes('pengemudi') || c.includes('sopir')) &&
      rowClean.some((c) => c.includes('akselerasi'))
    ) {
      headerRowIndex = r;
      break;
    }
  }

  // Tentukan baris awal data (biasanya setelah sub-header jumlah/skor)
  let startDataRow = headerRowIndex + 1;
  if (rows[startDataRow]) {
    const subClean = rows[startDataRow].map((c) =>
      String(c || '')
        .trim()
        .toLowerCase()
    );
    if (subClean.some((c) => c.includes('jumlah') || c.includes('skor'))) {
      startDataRow = headerRowIndex + 2;
    }
  }

  const parseNumber = (val) => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const cleanStr = String(val || '')
      .replace(/\s+/g, '')
      .replace(/,/g, '.');
    const num = parseFloat(cleanStr);
    return isNaN(num) ? 0 : num;
  };

  const drivers = [];

  for (let r = startDataRow; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const rawDriverName = String(row[0] || '').trim();
    if (!rawDriverName) continue;

    const lowerName = rawDriverName.toLowerCase();
    if (
      lowerName.startsWith('total') ||
      lowerName.startsWith('rata') ||
      lowerName.startsWith('jumlah') ||
      lowerName.startsWith('kesimpulan')
    ) {
      continue;
    }

    const driverName = capitalizeText(rawDriverName);

    const distance = parseNumber(row[3]); // Kolom D
    const suddenAcceleration = Math.round(parseNumber(row[5])); // Kolom F
    const suddenBraking = Math.round(parseNumber(row[7])); // Kolom H
    const sharpTurn = Math.round(parseNumber(row[9])); // Kolom J
    const overSpeed = Math.round(parseNumber(row[11])); // Kolom L
    const idleOvertime = Math.round(parseNumber(row[13])); // Kolom N

    // Kalkulasi nilai
    const warningThreshold =
      distance >= DRIVER_SCORE_CONFIG.MIN_DISTANCE
        ? Math.round(distance * DRIVER_SCORE_CONFIG.WARNING_THRESHOLD_PERCENT)
        : 0;

    const incidentsData = {
      suddenAcceleration,
      suddenBraking,
      sharpTurn,
      overSpeed,
      idleOvertime,
    };

    const breakdown = DRIVER_SCORE_CONFIG.INCIDENT_TYPES.map((type) => {
      const count = incidentsData[type.id] || 0;
      let rawScore = 0;
      let isExceeded = false;
      let formulaText = '';

      if (warningThreshold <= 0) {
        rawScore = count === 0 ? 100 : 0;
        formulaText = count === 0 ? 'Tidak ada kejadian = 100' : 'Batas 0 km = 0';
      } else if (count > warningThreshold) {
        rawScore = 0;
        isExceeded = true;
        formulaText = `${count} > ${warningThreshold} = 0`;
      } else {
        rawScore = Math.max(0, 100 - (count / warningThreshold) * 100);
        formulaText = `100 - ((${count} / ${warningThreshold}) * 100) = ${rawScore.toFixed(2).replace('.', ',')}`;
      }

      const finalScore = rawScore * type.weight;
      const finalFormulaText = `${rawScore.toFixed(2).replace('.', ',')} * ${type.weightPercent}% = ${finalScore.toFixed(2).replace('.', ',')}`;

      return {
        id: type.id,
        label: type.label,
        weight: type.weight,
        weightPercent: type.weightPercent,
        count,
        rawScore,
        finalScore,
        isExceeded,
        formulaText,
        finalFormulaText,
      };
    });

    const totalScore = breakdown.reduce((acc, curr) => acc + curr.finalScore, 0);
    const roundedTotalScore = Math.round(totalScore);
    const indexInfo = getScoreIndex(roundedTotalScore);

    drivers.push({
      driverName,
      distance,
      incidents: incidentsData,
      warningThreshold,
      breakdown,
      totalScore,
      roundedTotalScore,
      indexInfo,
    });
  }

  return drivers;
}
