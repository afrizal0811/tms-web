
# TMS Processing — Logistics Operation Dashboard & Fleet Management

Aplikasi manajemen operasional logistik berbasis web (`v6.0`) untuk memonitor pergerakan armada, mengelola sinkronisasi data TMS/VMS ke database lokal, menganalisis performa pengiriman & KPI, memvalidasi koordinat pelanggan, hingga menghasilkan berbagai laporan operasional dan audit.

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![React](https://img.shields.io/badge/React-19-61DAFB) ![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC) ![Prisma](https://img.shields.io/badge/Prisma-6-2D3748) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791) ![Leaflet](https://img.shields.io/badge/Maps-Leaflet-green)

  

## Fitur Utama


### 1. Manajemen Akses, Lokasi & Hak Akses

-  **Hub Selection & Switcher:** Pengguna memilih lokasi operasional (Cabang) saat masuk dan dapat berpindah cabang sesuai hak akses.
-  **Role-Based Login:** Sistem login berbasis email dengan validasi role yang ketat.
- 
### 2. Dashboard Operasional

-  **Detail & Routing vs Actual:** Memantau performa pengiriman harian serta membandingkan rencana rute sistem dengan realisasi di lapangan.
-  **Smart Filtering:** Filter data berdasarkan tanggal, tipe storage (**Dry** / **Frozen**), dan tipe kendaraan.
-  **Visualisasi Peta Rute:** Modal peta interaktif untuk melihat rencana rute pengiriman beserta fitur unduh gambar peta.

### 3. Manajemen Tugas (Task)

-  **Daftar Tugas :** Pemantauan tugas pengiriman harian maupun berdasarkan rentang tanggal terpilih serta filter yang tersedia.
-  **Detail & Alasan Pending:** Peninjauan detail tugas serta pengelolaan alasan pending dan penolakan pengiriman.

### 4. Rangkuman & Analisis Performa (Summary)
Ringkasan operasional mendalam dalam beberapa tab analisis terpadu:
-  **Diagram & Service Level:** Grafik visual dan persentase tingkat penyelesaian pengiriman.
-  **Task Summary & Pending Reasons:** Rekap tugas beserta fitur pengisian dan pembaruan alasan pending secara langsung.
-  **Routing Time & Time Driver:** Analisis waktu pembuatan routing dan durasi kerja driver
-  **Distance Summary, Truck Detail & Truck Usage:** Rekap jarak tempuh armada serta analisis penggunaan truk (TMS vs Non-TMS, TVU, dan Interbranch).

### 5. Pengiriman & Dokumen (Delivery)

-  **Manajemen Pengiriman:** Pengelolaan daftar pengiriman secara detail.
-  **Document Generation:** Pembuatan dan unduh dokumen pengiriman dalam format PDF maupun Excel, baik satuan maupun *Batch*.

### 6. Pembaruan Koordinat

-  **Interactive Map:** Validasi pergeseran titik lokasi pelanggan dalam rentang tanggal tertentu melalui peta interaktif.
-  **Distance Calculation:** Perhitungan otomatis selisih jarak antara titik koordinat lama dan baru.
-  **History Log:** Melihat riwayat perubahan titik koordinat pelanggan.

### 7. Manajemen Data Kendaraan

-  **Master Data:** Daftar lengkap kendaraan beserta data driver utama, tipe storage, tag kendaraan, dan pemeriksaan kelengkapan konfigurasi armada.
-  **Odometer & Template:** Integrasi pembacaan data **Odometer** dari McEasy VMS serta tab template data kendaraan.


### 8. Laporan Operasional (Reports)
-  **Daily Report:** Laporan ringkasan operasional harian.
-  **KPI Report:** Laporan indikator kinerja cabang yang telah terjadi
-  **Bread Report:** Laporan khusus operasional pengiriman roti.
-  **Custom Report:** Laporan kustom untuk dibuat untuk kebutuhan tertentu
-  **Counter Report:** Rekapitulasi jumlah tugas pengiriman.

### 9.  Pengaturan & Sinkronisasi Data

-  **Pengaturan:** Manajemen master cabang, kendaaran, serta data pendukung lain.
-  **Sinkronisasi Otomatis:** Sinkronisasi harian serta pembaruan yang terjadi di *background*.

### 10. Pusat Bantuan & Fitur Pendukung

-  **Panduan Interaktif:** Dokumentasi penggunaan sistem **TMS** dan **VMS** lengkap dengan pencarian topik, pratinjau gambar (*lightbox*), dan unduh panduan PDF.

-  **Multi-Language & Tema:** Dukungan Bahasa Indonesia & Inggris serta mode tampilan terang (*Light*) dan gelap (*Dark*).

---

## 🛠️ Teknologi Utama

-  **Framework & UI:** [Next.js 16](https://nextjs.org/) (App Router), [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/)

-  **Database & ORM:** [PostgreSQL](https://www.postgresql.org/)

-  **Integrasi Eksternal:** MileApp API & McEasy VMS API

-  **Visualisasi & Peta:** [Recharts](https://recharts.org/), [Leaflet](https://leafletjs.com/) & [React Leaflet](https://react-leaflet.js.org/)

-  **Dokumen & Utilitas:**  `@react-pdf/renderer` (PDF), `xlsx-js-style` (Excel), `jszip` (ZIP), `html-to-image`, `date-fns`, `next-themes`, `react-hot-toast`

---

## 🚀 Menjalankan Proyek
```bash

# Install dependencies
npm  install

# Generate Prisma Client
npx  prisma  generate

# Jalankan development server
npm  run  dev

# Build produksi
npm  run  build

```

Copyright © 2025 EDP - Afi. All rights reserved.