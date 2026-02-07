# 🚛 Logistics Operation Dashboard & Fleet Management

Aplikasi manajemen operasional logistik berbasis web yang komprehensif, dirancang untuk membantu Planner dan Admin dalam memonitor pergerakan armada, menganalisis performa pengiriman, memvalidasi koordinat pelanggan, hingga pelaporan mendalam mengenai penggunaan truk dan kinerja driver.

![Next.js](https://img.shields.io/badge/Next.js-14-black) ![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0-38B2AC) ![Leaflet](https://img.shields.io/badge/Maps-Leaflet-green)

## 🌟 Fitur Utama

### 1. 🔐 Manajemen Akses & Lokasi (Multi-Hub)

- **Hub Selection:** Pengguna wajib memilih lokasi operasional (Cabang) saat masuk. Data lokasi disinkronkan dengan API vendor.
- **Role-Based Login:** Sistem login berbasis email dengan validasi role yang ketat (User dengan role _Driver_ diblokir dari akses web).
- **Session Guard:** Proteksi rute otomatis untuk memastikan pengguna memiliki sesi lokasi yang valid.

### 2. 📊 Dashboard Operasional (Real-time Analytics)

Visualisasi performa harian dan tahunan menggunakan grafik interaktif:

- **Service Level:** Memantau status pengiriman (Sukses, Batal, Pending, Partial).
- **Sequence Accuracy:** Mengukur kepatuhan driver terhadap urutan rute yang direncanakan.
- **Load Capacity:** Analisis keterisian truk (Full, Optimal, Overload) dengan filter spesifik untuk tipe storage **Dry** dan **Frozen**.

### 3. 🚚 Estimasi Delivery & Tracking

- **Routing vs Actual:** Tabel komparasi antara rencana sistem (TMS) dengan eksekusi lapangan.
- **Smart Filtering:** Filter data berdasarkan pencarian teks dan Tipe Storage (Dry/Frozen).
- **Document Generation:**
  - **PDF Generator:** Membuat Surat Jalan/Tanda Terima Faktur siap cetak (satuan atau _Batch Zip_).
  - **Excel Export:** Mengunduh data rekapitulasi pengiriman.

### 4. 📍 Pembaruan Koordinat (Update Longlat)

Fitur untuk memvalidasi dan memperbaiki data lokasi pelanggan:

- **Interactive Map:** Visualisasi peta (Leaflet) yang menampilkan pergeseran dari titik lama ke titik baru.
- **Distance Calculation:** Perhitungan otomatis selisih jarak (dalam meter) antara koordinat lama dan baru.
- **History Log:** Melihat riwayat perubahan titik koordinat pelanggan.

### 5. 📈 Rangkuman & Laporan (Summary Reports)

Menu pelaporan mendalam untuk analisis efisiensi armada:

- **Truck Usage:** Analisis penggunaan truk (TMS vs Non-TMS, TVU, Interbranch).
- **Average KM:** Laporan rata-rata kilometer tempuh armada per hari.
- **Time Analysis:**
  - **Time Driver:** Durasi kerja driver (Jam Berangkat vs Jam Pulang).
  - **Time RO:** Analisis waktu pembuatan Release Order.
- **Bulk Downloader:** Fitur unduh laporan bulanan/harian secara massal untuk kebutuhan audit.

### 6. 🚛 Manajemen Data Kendaraan (Vehicle Master)

- **Master Data:** Daftar lengkap kendaraan beserta driver utama (_assignee_).
- **Tag Mapping System:** Fitur untuk memetakan tag kendaraan dari vendor (misal: `BOX-BESAR`) ke standar internal (misal: `CDD-LONG`).
- **Conditional Data:** Menangani data kendaraan dengan kondisi operasional khusus.

### 7. 🌐 Fitur Pendukung

- **Multi-Language (i18n):** Dukungan Bahasa Indonesia & Inggris.
- **Token Expiry Alert:** Notifikasi otomatis jika sesi API token akan segera habis.

---

## 🛠️ Teknologi Utama

- **Frontend:** [Next.js 14](https://nextjs.org/) (App Router), [React](https://react.dev/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Visualization:** [Recharts](https://recharts.org/) (Grafik), [React Leaflet](https://react-leaflet.js.org/) (Peta)
- **Documents:** `@react-pdf/renderer` (PDF), `xlsx-js-style` (Excel), `jszip` (Kompresi)
- **State Management:** React Context API & LocalStorage Strategy

Copyright © 2025 EDP - Afi. All rights reserved.
