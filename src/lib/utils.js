// File: src/lib/utils.js

/**
 * Memformat tanggal menjadi YYYY-MM-DD
 * @param {Date} date - Objek Date
 * @returns {string} - Tanggal dalam format YYYY-MM-DD
 */
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Bulan dimulai dari 0
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Menghitung tanggal target (kemarin atau H-2 jika kemarin Minggu).
 * @param {string} selectedDateStr - Tanggal dipilih dari datepicker (YYYY-MM-DD)
 * @returns {{ dateFrom: string, dateTo: string }} - Objek berisi dateFrom dan dateTo
 */
export function calculateTargetDates(selectedDateStr) {
    if (!selectedDateStr) {
        const today = new Date();
        selectedDateStr = formatDate(today);
    }

    const selectedDate = new Date(selectedDateStr);

    // Kurangi 1 hari
    selectedDate.setDate(selectedDate.getDate() - 1);

    // Cek apakah hasilnya hari Minggu (getDay() 0)
    if (selectedDate.getDay() === 0) {
        // Jika Minggu, kurangi 1 hari lagi (jadi Sabtu)
        selectedDate.setDate(selectedDate.getDate() - 1);
    }

    const targetDateStr = formatDate(selectedDate);

    return {
        dateFrom: targetDateStr,
        dateTo: targetDateStr,
    };
}


/**
 * Helper function untuk memicu download file JSON di browser
 * @param {object} data - Objek data JSON yang ingin disimpan
 * @param {string} filename - Nama file yang akan di-download (misal: "results.json")
 */
export function saveJSON(data, filename = 'results.json') {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], {
        type: 'application/json'
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

/**
 * Mendapatkan tanggal hari ini dalam format YYYY-MM-DD
 * @returns {string}
 */
export function getTodayDateString() {
    return formatDate(new Date());
}

/**
 * Mengubah total menit menjadi format 'HH:mm
 * @param {number} totalMinutes - Jumlah total menit
 * @returns {string} - String dalam format 'HH:mm
 */
export function formatMinutesToHHMM(totalMinutes) {
    if (totalMinutes == null || isNaN(totalMinutes) || totalMinutes < 0) {
        return "'-'"; // Atau kembalikan null atau string kosong sesuai kebutuhan
    }
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60); // Bulatkan menit
    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    return `'${formattedHours}:${formattedMinutes}`; // Tambahkan tanda petik di awal
}

/**
 * Membulatkan nilai persentase dari string "X%" menjadi 1 angka desimal
 * @param {string} percentageString - String persentase (misal: "7%", "40.34%")
 * @returns {number | null} - Angka yang sudah dibulatkan atau null jika input tidak valid
 */
export function parseAndRoundPercentage(percentageString) {
    if (typeof percentageString !== 'string' || !percentageString.includes('%')) {
        return null;
    }
    const numericValue = parseFloat(percentageString.replace('%', ''));
    if (isNaN(numericValue)) {
        return null;
    }
    // Bulatkan ke 1 angka desimal
    return Math.round(numericValue * 10) / 10;
}

// File: src/lib/utils.js
// ... (semua fungsi lama seperti formatDate, calculateTargetDates, dll. biarkan di atas) ...

/**
 * Memformat string timestamp (misal: "2025-10-28T03:01:00Z") menjadi "HH:mm"
 * @param {string | null | undefined} timestamp - String timestamp ISO
 * @returns {string | null} - String dalam format HH:mm atau null
 */
export function formatTimestampToHHMM(timestamp) {
    if (!timestamp) return null;
    try {
        // Buat objek Date. 'Z' di akhir (UTC) akan otomatis dikonversi ke timezone lokal
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return null; // Cek jika tanggal tidak valid

        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    } catch (e) {
        return null; // Jika format timestamp tidak terduga
    }
}

/**
 * Menghitung selisih antara dua timestamp dalam hitungan MENIT
 * @param {string | null} time1 - Timestamp ISO (misal: page3DoneTime)
 * @param {string | null} time2 - Timestamp ISO (misal: klikJikaSudahSampai)
 * @returns {number | null} - Selisih dalam menit
 */
export function calculateMinuteDifference(time1, time2) {
    if (!time1 || !time2) return null;
    try {
        const date1 = new Date(time1);
        const date2 = new Date(time2);
        if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return null;

        const diffMs = Math.abs(date1.getTime() - date2.getTime());
        return Math.round(diffMs / 60000); // Konversi milidetik ke menit
    } catch (e) {
        return null;
    }
}

/**
 * Mengekstrak Customer ID (string yg diawali "C0") dari string
 * @param {string} customerName - misal: "Mamdibakes - C0204437 - MAIN"
 * @returns {string | null}
 */
export function extractCustomerId(customerName) {
    if (typeof customerName !== 'string') return null;
    // Gunakan regex untuk mencari kata yg diawali 'C0'
    const match = customerName.match(/\b(C0\w+)\b/);
    // \b = batas kata (word boundary), (C0\w+) = grup yg diawali C0 diikuti huruf/angka
    return match ? match[1] : null; // Kembalikan grup yg ditemukan (C0204437)
}

/**
 * Memformat string "HH:mm:ss" (atau "HH:mm") menjadi "HH:mm"
 * @param {string | null | undefined} timeString - String "HH:mm:ss" atau "HH:mm"
 * @returns {string | null} - String dalam format "HH:mm"
 */
export function formatSimpleTime(timeString) {
    if (typeof timeString !== 'string' || !timeString.includes(':')) {
        return null; // Bukan string waktu yang valid
    }
    const parts = timeString.split(':');
    if (parts.length < 2) {
        return null; // Format tidak valid
    }
    return `${parts[0]}:${parts[1]}`; // Ambil "HH" dan "mm"
}

/**
 * Mengekstrak tipe temperatur ('FRZ' atau 'DRY') dari nama driver
 * @param {string | null} driverName - misal: "'FRZ' MAZHAR"
 * @returns {string | null} - "FRZ", "DRY", atau null
 */
export function extractTempFromDriverName(driverName) {
    if (typeof driverName !== 'string' || !driverName) {
        return null;
    }

    const trimmedName = driverName.trim().toUpperCase(); // Normalisasi nama

    if (trimmedName.startsWith("'FRZ'")) {
        return "FRZ";
    }
    if (trimmedName.startsWith("'DRY'")) {
        return "DRY";
    }

    return null; // Default jika tidak ada yg cocok
}

/**
 * Mengekstrak Location ID (kata terakhir) dari string " - "
 * @param {string} customerName - misal: "Mamdibakes - C0204437 - MAIN"
 * @returns {string | null}
 */
export function extractLocationId(customerName) {
    if (typeof customerName !== 'string') return null;
    const parts = customerName.split(' - ');
    if (parts.length > 0) {
        return parts[parts.length - 1].trim(); // Ambil bagian terakhir
    }
    return null;
}

/**
 * Memformat objek koordinat {lat, long} menjadi string
 * @param {object | null} coords - { lat: ..., long: ... }
 * @returns {string | null}
 */
/**
 * Memformat string koordinat "lat,long" menjadi string "lat, long" (dibulatkan)
 * @param {string | null} coordsString - String "lat,long"
 * @returns {string | null}
 */
export function formatCoordinates(coordsString) {
    if (typeof coordsString !== 'string' || !coordsString.includes(',')) {
        return null;
    }
    try {
        const parts = coordsString.split(',');
        const lat = parseFloat(parts[0]).toFixed(6); // 6 angka desimal
        const long = parseFloat(parts[1]).toFixed(6);
        if (isNaN(lat) || isNaN(long)) return null;
        return `${lat}, ${long}`; // Format baru "lat, long"
    } catch (e) {
        return null;
    }
}

/**
 * Menghitung jarak Haversine antara dua string koordinat.
 * @param {string | null} coordsString1 - "lat,long"
 * @param {string | null} coordsString2 - "lat,long"
 * @returns {number | null} - Jarak dalam METER
 */
export function calculateHaversineDistance(coordsString1, coordsString2) {
    if (typeof coordsString1 !== 'string' || !coordsString1.includes(',') ||
        typeof coordsString2 !== 'string' || !coordsString2.includes(',')) {
        return null;
    }

    const toRad = (value) => (Number(value) * Math.PI) / 180;
    const R = 6371000; // Radius Bumi dalam meter

    try {
        // Urai string "lat,long"
        const parts1 = coordsString1.split(',');
        const lat1 = parseFloat(parts1[0]);
        const lon1 = parseFloat(parts1[1]);

        const parts2 = coordsString2.split(',');
        const lat2 = parseFloat(parts2[0]);
        const lon2 = parseFloat(parts2[1]);

        if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
            return null;
        }

        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const rLat1 = toRad(lat1);
        const rLat2 = toRad(lat2);

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(rLat1) * Math.cos(rLat2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        return Math.round(distance); // Bulatkan ke meter terdekat
    } catch (e) {
        return null;
    }
}

/**
 * Fungsi helper untuk membersihkan/menormalisasi email
 * @param {string} email
 * @returns {string | null}
 */
export const normalizeEmail = (email) => {
    if (typeof email !== 'string' || !email) {
        return null;
    }
    return email.toLowerCase().trim();
};

/**
 * Helper untuk menambah jam ke Date object
 * @param {Date} date
 * @param {number} hours
 * @returns {Date}
 */
function addHours(date, hours) {
    const newDate = new Date(date);
    newDate.setTime(newDate.getTime() + hours * 60 * 60 * 1000);
    return newDate;
}

/**
 * Helper untuk memformat Date object ke "YYYY-MM-DD HH:mm:ss"
 * @param {Date} date
 * @returns {string}
 */
function formatFullDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Menghitung rentang tanggal untuk Start-Finish Summary.
 * timeFrom = H-1 (atau H-2 jika Senin) @ 00:00:00
 * timeTo = H @ 23:59:59
 * @param {string} selectedDateStr - "YYYY-MM-DD"
 * @returns {{ timeFrom: string, timeTo: string }}
 */
export function calculateStartFinishDates(selectedDateStr) {
    const selectedDate = new Date(selectedDateStr + "T12:00:00"); // Gunakan siang hari

    // 1. Hitung timeTo (Akhir hari yang dipilih)
    const timeToEnd = new Date(selectedDate);
    timeToEnd.setHours(23, 59, 59, 999);
    const timeTo = formatFullDateTime(timeToEnd);

    // 2. Hitung timeFrom (Awal H-1 atau H-2)
    const timeFromStart = new Date(selectedDate);
    timeFromStart.setDate(timeFromStart.getDate() - 1); // H-1
    if (timeFromStart.getDay() === 0) { // Cek jika H-1 adalah Minggu
        timeFromStart.setDate(timeFromStart.getDate() - 2); // Mundur ke Sabtu (H-2 dari Senin)
    }
    timeFromStart.setHours(0, 0, 0, 0);
    const timeFrom = formatFullDateTime(timeFromStart);

    return {
        timeFrom,
        timeTo
    };
}

/**
 * Mem-parsing string "YYYY-MM-DD HH:mm:ss" (diasumsikan UTC) dan geser ke UTC+7
 * @param {string} timestampStr 
 * @returns {Date | null} Objek Date dalam UTC+7
 */
function parseAndShiftToUTC7(timestampStr) {
    if (!timestampStr) return null;
    try {
        // 1. Paksa parsing sebagai UTC
        const utcTimestamp = timestampStr.replace(" ", "T") + "Z";
        const utcDate = new Date(utcTimestamp);
        if (isNaN(utcDate.getTime())) return null;

        // 2. Tambah 7 jam untuk konversi ke UTC+7
        return addHours(utcDate, 7);
    } catch (e) {
        return null;
    }
}

/**
 * Format "YYYY-MM-DD HH:mm:ss" (UTC) -> "DD-MM-YYYY" (UTC+7)
 * @param {string} timestampStr 
 * @returns {string | null}
 */
export function formatTimestampToDDMMYYYY_UTC7(timestampStr) {
    const date = parseAndShiftToUTC7(timestampStr); // Ini masih benar (menghasilkan Date object +7 jam)
    if (!date) return null;

    // --- PERBAIKAN DI SINI ---
    // Gunakan getUTC... untuk membaca tanggal apa adanya (yang sudah +7 jam)
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // getUTCMonth() juga 0-11
    const year = date.getUTCFullYear();
    // --- SELESAI PERBAIKAN ---

    return `${day}-${month}-${year}`;
}

/**
 * Format "YYYY-MM-DD HH:mm:ss" (UTC) -> "'HH:mm" (UTC+7)
 * @param {string} timestampStr 
 * @returns {string | null}
 */
export function formatTimestampToQuotedHHMM_UTC7(timestampStr) {
    const date = parseAndShiftToUTC7(timestampStr); // Ini masih benar
    if (!date) return null;

    // --- PERBAIKAN DI SINI ---
    // Gunakan getUTC... untuk membaca waktu apa adanya (yang sudah +7 jam)
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    // --- SELESAI PERBAIKAN ---

    return `'${hours}:${minutes}`;
}

/**
 * Menghitung durasi antara 2 timestamp (UTC) dan format ke 'HH:mm
 * @param {string} startTimeStr 
 * @param {string} finishTimeStr 
 * @returns {string | null}
 */
export function calculateDurationAsQuotedHHMM(startTimeStr, finishTimeStr) {
    if (!startTimeStr || !finishTimeStr) return null;
    try {
        // Tidak perlu geser UTC+7, karena kita hanya butuh selisihnya
        const startDate = new Date(startTimeStr.replace(" ", "T") + "Z");
        const finishDate = new Date(finishTimeStr.replace(" ", "T") + "Z");
        if (isNaN(startDate.getTime()) || isNaN(finishDate.getTime())) return null;

        let diffMs = finishDate.getTime() - startDate.getTime();
        if (diffMs < 0) diffMs = 0; // Durasi tidak bisa negatif

        const totalMinutes = Math.round(diffMs / 60000);

        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        const formattedHours = String(hours).padStart(2, '0');
        const formattedMinutes = String(minutes).padStart(2, '0');
        return `'${formattedHours}:${formattedMinutes}`;

    } catch (e) {
        return null;
    }
}