// File: src/lib/utils.js

// Mengubah format input tanggal (Date atau string) menjadi pola string tertentu (default: YYYY-MM-DD)
export function formatDateUniversal(dateInput, pattern = 'YYYY-MM-DD') {
  if (!dateInput) return '-';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '-';

  const map = {
    YYYY: date.getFullYear(),
    MM: String(date.getMonth() + 1).padStart(2, '0'),
    DD: String(date.getDate()).padStart(2, '0'),
    HH: String(date.getHours()).padStart(2, '0'),
    mm: String(date.getMinutes()).padStart(2, '0'),
    ss: String(date.getSeconds()).padStart(2, '0'),
  };

  return pattern.replace(/YYYY|MM|DD|HH|mm|ss/g, (matched) => map[matched]);
}

// Menentukan tanggal otomatis (H-1) dengan penyesuaian jika hari tersebut adalah Minggu (mundur ke Sabtu)
export function calculateTargetDates(selectedDateStr) {
  if (!selectedDateStr) {
    const today = new Date();
    selectedDateStr = formatDateUniversal(today);
  }

  const selectedDate = new Date(selectedDateStr);

  selectedDate.setDate(selectedDate.getDate() - 1);

  if (selectedDate.getDay() === 0) {
    selectedDate.setDate(selectedDate.getDate() - 1);
  }

  const targetDateStr = formatDateUniversal(selectedDate);

  return {
    dateFrom: targetDateStr,
    dateTo: targetDateStr,
  };
}

// Memicu browser untuk mengunduh data objek sebagai file JSON
export function saveJSON(data, filename = 'results.json') {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Mengonversi total menit menjadi string jam:menit dengan format text excel ('HH:mm)
export function formatMinutesToHHMM(totalMinutes) {
  if (totalMinutes == null || isNaN(totalMinutes) || totalMinutes < 0) {
    return "'-'";
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  const formattedHours = String(hours).padStart(2, '0');
  const formattedMinutes = String(minutes).padStart(2, '0');
  return `'${formattedHours}:${formattedMinutes}`;
}

// Mengambil jam dan menit dari timestamp ISO dan mengembalikannya sebagai string HH:mm
export function formatTimestampToHHMM(timestamp) {
  if (!timestamp) return null;
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return null;

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch (e) {
    return null;
  }
}

// Menghitung selisih waktu dalam satuan menit antara dua timestamp
export function calculateMinuteDifference(time1, time2) {
  if (!time1 || !time2) return null;
  try {
    const date1 = new Date(time1);
    const date2 = new Date(time2);
    if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return null;

    const diffMs = Math.abs(date1.getTime() - date2.getTime());
    return Math.round(diffMs / 60000);
  } catch (e) {
    return null;
  }
}

// Memecah string data pelanggan menjadi Nama, ID, dan Lokasi berdasarkan pola pemisah tertentu
export function parseCustomerString(fullString) {
  if (!fullString || typeof fullString !== 'string') {
    return { name: '', id: null, location: null };
  }
  const parts = fullString.split(/\s+-\s+/);
  let id = parts.find((p) => /^C\d+/.test(p) && !p.includes(' '));
  if (!id && parts.length >= 2) {
    id = parts[1];
  }
  const location = parts.length > 2 ? parts[parts.length - 1] : null;
  const name = parts[0] && parts[0] !== id ? parts[0] : '';
  return { name, id, location };
}

// Menyederhanakan string waktu (HH:mm:ss) menjadi format HH:mm
export function formatSimpleTime(timeString) {
  if (typeof timeString !== 'string' || !timeString.includes(':')) {
    return null;
  }
  const parts = timeString.split(':');
  if (parts.length < 2) {
    return null;
  }
  return `${parts[0]}:${parts[1]}`;
}

// Mendeteksi jenis suhu (FRZ/DRY) berdasarkan kode string pada nama driver
export function extractTempFromDriverName(driverName) {
  if (typeof driverName !== 'string' || !driverName) {
    return null;
  }

  const trimmedName = driverName.trim().toUpperCase();

  if (trimmedName.startsWith("'FRZ'")) {
    return 'FRZ';
  }
  if (trimmedName.startsWith("'DRY'")) {
    return 'DRY';
  }

  return null;
}

// Memformat string koordinat agar memiliki presisi 6 angka desimal
export function formatCoordinates(coordsString) {
  const coords = parseCoordinates(coordsString);

  if (!coords) return null;

  return `${coords.lat.toFixed(6)}, ${coords.lon.toFixed(6)}`;
}

// Mengubah string "lat,long" menjadi objek { lat, lon } bertipe angka
export function parseCoordinates(coordString) {
  if (typeof coordString !== 'string' || !coordString.includes(',')) return null;
  const [latStr, lonStr] = coordString.split(',');
  const lat = parseFloat(latStr);
  const lon = parseFloat(lonStr);
  if (isNaN(lat) || isNaN(lon)) return null;
  return { lat, lon };
}

// Menghitung jarak antara dua koordinat menggunakan rumus Haversine (hasil dalam meter)
export function calculateHaversineDistance(coordsString1, coordsString2) {
  const c1 = parseCoordinates(coordsString1);
  const c2 = parseCoordinates(coordsString2);

  if (!c1 || !c2) return null;

  const toRad = (value) => (Number(value) * Math.PI) / 180;
  const R = 6371000;

  const dLat = toRad(c2.lat - c1.lat);
  const dLon = toRad(c2.lon - c1.lon);
  const rLat1 = toRad(c1.lat);
  const rLat2 = toRad(c2.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(rLat1) * Math.cos(rLat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Membersihkan string email (lowercase dan trim spasi)
export const normalizeEmail = (email) => {
  if (typeof email !== 'string' || !email) {
    return null;
  }
  return email.toLowerCase().trim();
};

// Menambahkan jumlah jam tertentu ke dalam objek Date
function addHours(date, hours) {
  const newDate = new Date(date);
  newDate.setTime(newDate.getTime() + hours * 60 * 60 * 1000);
  return newDate;
}

// Menghitung rentang waktu Start (H-1/H-2 00:00) hingga Finish (H 23:59) untuk keperluan query laporan
export function calculateStartFinishDates(selectedDateStr) {
  const selectedDate = new Date(selectedDateStr + 'T12:00:00');

  const timeToEnd = new Date(selectedDate);
  timeToEnd.setHours(23, 59, 59, 999);
  const timeTo = formatDateUniversal(timeToEnd, 'YYYY-MM-DD HH:mm:ss');

  const timeFromStart = new Date(selectedDate);
  timeFromStart.setDate(timeFromStart.getDate() - 1);
  if (timeFromStart.getDay() === 0) {
    timeFromStart.setDate(timeFromStart.getDate() - 2);
  }
  timeFromStart.setHours(0, 0, 0, 0);
  const timeFrom = formatDateUniversal(timeFromStart, 'YYYY-MM-DD HH:mm:ss');

  return {
    timeFrom,
    timeTo,
  };
}

// Mengonversi timestamp UTC string menjadi objek Date yang digeser manual ke UTC+7
function parseAndShiftToUTC7(timestampStr) {
  if (!timestampStr) return null;
  try {
    const utcTimestamp = timestampStr.replace(' ', 'T') + 'Z';
    const utcDate = new Date(utcTimestamp);
    if (isNaN(utcDate.getTime())) return null;

    return addHours(utcDate, 7);
  } catch (e) {
    return null;
  }
}

// Memformat tanggal UTC+7 menjadi DD-MM-YYYY
export function formatTimestampToDDMMYYYY_UTC7(timestampStr) {
  const date = parseAndShiftToUTC7(timestampStr);
  if (!date) return null;

  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();

  return `${day}-${month}-${year}`;
}

// Memformat waktu UTC+7 menjadi string 'HH:mm (quoted untuk excel)
export function formatTimestampToQuotedHHMM_UTC7(timestampStr) {
  const date = parseAndShiftToUTC7(timestampStr);
  if (!date) return null;

  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');

  return `'${hours}:${minutes}`;
}

// Wrapper untuk menghitung durasi antar dua waktu dan mengembalikan format 'HH:mm
export function calculateDurationAsQuotedHHMM(startTimeStr, finishTimeStr) {
  const totalMinutes = calculateMinuteDifference(startTimeStr, finishTimeStr);
  return formatMinutesToHHMM(totalMinutes);
}

// Mengubah format tanggal string dari YYYY-MM-DD menjadi DD.MM.YYYY
export function formatYYYYMMDDToDDMMYYYY(yyyyMmDd) {
  if (typeof yyyyMmDd !== 'string' || !yyyyMmDd.includes('-')) {
    return yyyyMmDd;
  }
  try {
    const [y, m, d] = yyyyMmDd.split('-');
    if (!y || !m || !d) return yyyyMmDd;
    return `${d}.${m}.${y}`;
  } catch (e) {
    return yyyyMmDd;
  }
}

// Mendapatkan string YYYY-MM-DD dari timestamp yang sudah disesuaikan ke UTC+7
export const getUTC7DateString = (timestamp) => {
  const date = parseAndShiftToUTC7(timestamp);
  if (!date) return null;
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
};

// Mengecek apakah string tanggal jatuh pada hari Minggu
export const isDateSunday = (dateStr) => {
  const date = new Date(dateStr.replace(/-/g, '/'));
  return date.getDay() === 0;
};

// Memformat detik integer menjadi string timer MM:SS
export const formatTimer = (seconds) => {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

// Memformat objek Date menjadi string format database (YYYY-MM-DD HH:mm:ss)
export const formatToApiUtc = (date) => date.toISOString().slice(0, 19).replace('T', ' ');

// Mengubah input tanggal menjadi string sesuai pattern di zona waktu Asia/Jakarta.
export function formatDateWIB(dateInput, pattern = 'YYYY-MM-DD') {
  if (!dateInput) return '-';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '-';

  // 1. Ambil bagian waktu spesifik Asia/Jakarta
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  // 2. Pecah menjadi object { year: '2025', month: '12', ... }
  const parts = formatter.formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});

  // 3. Mapping pattern ke nilai
  const map = {
    YYYY: parts.year,
    MM: parts.month,
    DD: parts.day,
    HH: parts.hour,
    mm: parts.minute,
    ss: parts.second,
  };

  // 4. Replace pattern
  return pattern.replace(/YYYY|MM|DD|HH|mm|ss/g, (matched) => map[matched]);
}

// Khusus untuk format teks panjang Indonesia (Contoh: "23 Desember 2025")
// Ini jarang dipakai untuk logic, biasanya cuma untuk tampilan UI
export function formatLongDate(dateInput, language = 'id-ID') {
  if (!dateInput) return '-';
  try {
    return new Date(dateInput).toLocaleDateString(language, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch (e) {
    return '-';
  }
}