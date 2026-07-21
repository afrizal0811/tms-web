// File: src/lib/utils.js

// Mengubah format input tanggal (Date atau string) menjadi pola string tertentu (default: YYYY-MM-DD)
export function formatDateUniversal(dateInput, pattern = 'YYYY-MM-DD') {
  if (!dateInput) return '-';

  let date;
  if (typeof dateInput === 'string') {
    const dmyMatch = dateInput.match(
      /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/
    );
    if (dmyMatch) {
      const [, dd, mm, yyyy, HH = '00', min = '00', ss = '00'] = dmyMatch;
      date = new Date(`${yyyy}-${mm}-${dd}T${HH}:${min}:${ss}`);
    } else {
      date = new Date(dateInput);
    }
  } else {
    date = new Date(dateInput);
  }

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

// Mengonversi total menit menjadi string jam:menit dengan format text excel ('HH:mm)
export function formatMinutesToHHMM(totalMinutes, needQuote = true) {
  if (totalMinutes == null || isNaN(totalMinutes) || totalMinutes < 0) {
    return "'-'";
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  const formattedHours = String(hours).padStart(2, '0');
  const formattedMinutes = String(minutes).padStart(2, '0');
  return `${needQuote ? "'" : ''}${formattedHours}:${formattedMinutes}`;
}

// Menghitung selisih waktu dalam satuan menit antara dua timestamp
export function calculateMinuteDifference(time1, time2) {
  if (!time1 || !time2) return null;

  try {
    const date1 = new Date(time1);
    const date2 = new Date(time2);

    if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return null;

    const minutes1 = date1.getHours() * 60 + date1.getMinutes();
    const minutes2 = date2.getHours() * 60 + date2.getMinutes();

    return Math.abs(minutes1 - minutes2);
  } catch (e) {
    return null;
  }
}

// Memecah string data pelanggan menjadi Nama, ID, dan Lokasi berdasarkan pola pemisah tertentu
export function parseCustomerString(fullString) {
  if (!fullString || typeof fullString !== 'string') {
    return { name: '', id: null, location: null, fullCustomerName: '', invoiceNumber: '' };
  }

  const parts = fullString.split(/\s+-\s+/);

  let id = parts.find((p) => /^C\d+/.test(p) && !p.includes(' '));
  if (!id && parts.length >= 2) {
    id = parts[1];
  }
  id = id !== undefined ? id : '';

  let location = null;
  let invoiceNumber = '';

  if (parts.length > 2) {
    const rawLocation = parts[parts.length - 1];
    const commaSplit = rawLocation.split(',');
    location = commaSplit[0].trim();
    if (commaSplit.length > 1) {
      invoiceNumber = commaSplit.slice(1).join(', ').trim();
    }
  } else if (parts.length === 2 && id.includes(',')) {
    const commaSplit = id.split(',');
    id = commaSplit[0].trim();
    invoiceNumber = commaSplit.slice(1).join(', ').trim();
  }
  location = location !== null ? location : '';

  const name = parts[0] && parts[0] !== id ? parts[0] : '';
  const fullCustomerName = id !== '' || location !== '' ? `${name} - ${id} - ${location}` : name;

  return { name, id, location, fullCustomerName, invoiceNumber };
}

// Menentukan tipe penyimpanan
export function getStorageType(input) {
  if (Array.isArray(input) || typeof input === 'string') {
    const text = (Array.isArray(input) ? input.join(' ') : input).toUpperCase();
    if (text.includes('FROZEN') || text.includes('FRZ')) return 'Frozen';
    if (text.includes('DRY')) return 'Dry';
    return '-';
  }
  const typeStr = input.type || '';
  const nameStr = input.name || input || '';
  if (typeStr.toUpperCase().includes('FROZEN')) return 'Frozen';
  if (typeStr.toUpperCase().includes('DRY')) return 'Dry';
  if (nameStr.toUpperCase().includes("'FRZ'") || nameStr.toUpperCase().includes('FROZEN'))
    return 'Frozen';
  if (nameStr.toUpperCase().includes("'DRY'") || nameStr.toUpperCase().includes('DRY'))
    return 'Dry';
  return '-';
}

// Memformat koordinat
export function formatCoordinates(coordsString) {
  const coords = parseCoordinates(coordsString);
  if (!coords) return null;
  return `${coords.lat.toFixed(6)}, ${coords.lon.toFixed(6)}`;
}

// Mengubah koordinat menjadi object
export function parseCoordinates(coordString) {
  if (typeof coordString !== 'string' || !coordString.includes(',')) return null;
  const [latStr, lonStr] = coordString.split(',');
  const lat = parseFloat(latStr);
  const lon = parseFloat(lonStr);
  if (isNaN(lat) || isNaN(lon)) return null;
  return { lat, lon };
}

// Menghitung jarak antar koordinat
export function getDistance(coordsString1, coordsString2) {
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

// Menormalkan email
export const normalizeEmail = (email) => {
  if (typeof email !== 'string' || !email) {
    return null;
  }
  return email.toLowerCase().trim();
};

// Menambahkan jam ke Date
function addHours(date, hours) {
  const newDate = new Date(date);
  newDate.setTime(newDate.getTime() + hours * 60 * 60 * 1000);
  return newDate;
}

// Menghasilkan rentang waktu laporan
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

// Mengubah timestamp UTC ke UTC+7
export function parseAndShiftToUTC7(timestampStr) {
  if (!timestampStr) return null;
  try {
    let utcTimestamp = timestampStr.replace(' ', 'T');
    if (
      !utcTimestamp.endsWith('Z') &&
      !utcTimestamp.substring(10).includes('+') &&
      !utcTimestamp.substring(10).includes('-')
    ) {
      utcTimestamp += 'Z';
    }

    const utcDate = new Date(utcTimestamp);
    if (isNaN(utcDate.getTime())) return null;

    return addHours(utcDate, 7);
  } catch (e) {
    return null;
  }
}

// Memformat timestamp UTC+7
export function formatUTC7(timestampStr, pattern = 'YYYY-MM-DD') {
  const date = parseAndShiftToUTC7(timestampStr);
  if (!date) return null;

  const map = {
    YYYY: date.getUTCFullYear(),
    MM: String(date.getUTCMonth() + 1).padStart(2, '0'),
    DD: String(date.getUTCDate()).padStart(2, '0'),
    HH: String(date.getUTCHours()).padStart(2, '0'),
    mm: String(date.getUTCMinutes()).padStart(2, '0'),
    ss: String(date.getUTCSeconds()).padStart(2, '0'),
  };

  const result = pattern.replace(/YYYY|MM|DD|HH|mm|ss/g, (matched) => map[matched]);
  return result;
}

// Menghitung durasi format HH:mm
export function calculateDurationAsQuotedHHMM(startTimeStr, finishTimeStr) {
  const totalMinutes = calculateMinuteDifference(startTimeStr, finishTimeStr);
  return formatMinutesToHHMM(totalMinutes);
}

// Mengecek hari Minggu
export const isDateSunday = (dateStr) => {
  const date = new Date(dateStr.replace(/-/g, '/'));
  return date.getDay() === 0;
};

// Mengubah detik ke MM:SS
export const formatTimer = (seconds) => {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

// Memformat tanggal panjang
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

// Mengecek nilai kosong
export function isEmpty(value) {
  if (Array.isArray(value)) return value.length === 0;
  return (
    !value ||
    value === undefined ||
    value === null ||
    value === '' ||
    value === false ||
    value === 0 ||
    value === '0' ||
    value === '-'
  );
}

// Mengubah Date ke format API
export function toApiDateString(dateInput) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

// Mengubah teks ke Title Case
export const capitalizeText = (text = '') =>
  text.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

// Menghasilkan tanggal besok atau minggu depan
export const tomorrowDate = (isTomorrow = true) => {
  const date = new Date();
  const day = isTomorrow ? 1 : 7;
  date.setDate(date.getDate() + day);
  if (date.getDay() === 0) {
    date.setDate(date.getDate() + 1);
  }

  if (!isTomorrow && new Date().getDay() === 6) {
    date.setDate(date.getDate() + 1);
  }

  return date;
};

// Mengambil plat utama
export function getBasePlate(plat) {
  if (!plat) return '';
  const platStr = String(plat).trim();
  const parts = platStr.split(/\s+/);
  return parts.length > 3 ? parts.slice(0, 3).join(' ') : platStr;
}

// Menghitung tanggal delivery berdasarkan tanggal routing
export function getDeliveryDateFromRouting(isoString) {
  if (!isoString) return null;
  try {
    const date = new Date(isoString);
    const wibMs = date.getTime() + 7 * 60 * 60 * 1000;
    const wibDate = new Date(wibMs);
    const routingDay = wibDate.getUTCDay();

    let offsetDays = 1;
    if (routingDay === 6) offsetDays = 2; // Sabtu -> Senin

    const deliveryMs = wibMs + offsetDays * 24 * 60 * 60 * 1000;
    return new Date(deliveryMs).toISOString().split('T')[0];
  } catch (e) {
    return null;
  }
}

// Mengubah nilai persentase menjadi warna heatmap pastel dalam format HEX
export function heatMap(pctInput) {
  if (pctInput === null || pctInput === undefined || pctInput === '') return null;
  let val = parseFloat(pctInput);
  if (isNaN(val)) return null;
  if (val > 0 && val <= 1) val = val * 100;
  const ratio = Math.max(0, Math.min(100, val)) / 100;
  let r, g, b;
  if (ratio <= 0.5) {
    const t = ratio / 0.5;
    r = 255;
    g = Math.round(255 * t);
    b = 0;
  } else {
    const t = (ratio - 0.5) / 0.5;
    r = Math.round(255 * (1 - t));
    g = Math.round(176 + (255 - 176) * (1 - t));
    b = 0;
  }
  return [r, g, b]
    .map((v) =>
      Math.round(v * 0.45 + 255 * 0.55)
        .toString(16)
        .padStart(2, '0')
    )
    .join('')
    .toUpperCase();
}

// Mengecek apakah tanggal lebih kecil dari hari ini
export function isPastDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(y, m - 1, d) < today;
}

// Mengubah datetime API menjadi Date
export function parseApiDateString(dateStr) {
  if (!dateStr) return null;
  let isoStr = dateStr.toString().replace(' ', 'T');
  if (!isoStr.endsWith('Z') && !isoStr.includes('+')) isoStr += 'Z';
  const d = new Date(isoStr);
  return isNaN(d.getTime()) ? null : d;
}

// Menentukan grup urutan plat
function getSortGroup(plat) {
  if (!plat) return 1;
  const platUpper = plat.toUpperCase();
  if (platUpper.includes('DM')) return 3;
  if (platUpper.includes('SEWA')) return 2;
  return 1;
}

// Mengurutkan data kendaraan
export function sortRows(rows, platKey, driverKey) {
  return rows.sort((a, b) => {
    const rankA = getSortGroup(a[platKey]);
    const rankB = getSortGroup(b[platKey]);
    if (rankA !== rankB) return rankA - rankB;
    return (a[driverKey] || '').localeCompare(b[driverKey] || '');
  });
}
