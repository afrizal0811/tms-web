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