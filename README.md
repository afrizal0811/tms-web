# 🚛 Logistics Operation Dashboard

Sistem manajemen operasional logistik berbasis web yang dirancang untuk memantau pergerakan armada, performa pengiriman, dan manajemen data kendaraan secara *real-time*. Aplikasi ini memfasilitasi Planner dan Admin dalam mengelola berbagai Cabang (Hub) dengan fitur analisis mendalam (Dry vs Frozen).

![Next.js](https://img.shields.io/badge/Next.js-14-black) ![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0-38B2AC) ![Status](https://img.shields.io/badge/Status-Active-green)

## 🌟 Fitur Utama

### 1. 🔐 Manajemen Akses & Lokasi
* **Multi-Hub Selection:** Pengguna memilih lokasi operasional (Hub) saat pertama kali masuk.
* **Login by Email:** Autentikasi cepat menggunakan email terdaftar.
* **Role Validation:** Pembatasan akses (misal: akun tipe *Driver* tidak diizinkan login ke dashboard web).

### 2. 📊 Dashboard Analitik
Visualisasi data performa operasional menggunakan grafik interaktif:
* **Service Level:** Memantau status pengiriman (Sukses, Batal, Pending, Partial).
* **Sequence Accuracy:** Membandingkan urutan rute rencana (Routing) vs aktual lapangan.
* **Load Capacity:** Analisis keterisian truk (Full, Optimal, Overload) yang dipisahkan berdasarkan tipe storage (**Dry** vs **Frozen**).

### 3. 🚚 Estimasi Delivery (Tracking)
* **Routing vs Actual:** Tabel komparasi detail antara rencana planner dengan eksekusi driver.
* **Storage Filter:** Filter data berdasarkan kategori muatan (Dry/Frozen).
* **Export Data:**
    * **PDF/Zip:** Generate surat jalan atau tanda terima faktur secara massal.
    * **Excel:** Unduh rekapitulasi data pengiriman.

### 4. 🚛 Manajemen Data Kendaraan (Vehicle Master)
* **Master Data:** Daftar lengkap kendaraan beserta driver utama (assignee).
* **Smart Filtering:** Pencarian cepat dan filter berdasarkan tipe storage.
* **Vehicle Tag Mapping:** Fitur untuk memetakan tag kendaraan yang belum terdaftar (misal: mapping `L300` atau `CDE-LONG` secara manual).

### 5. 🌐 Internalisasi (i18n)
* Mendukung dua bahasa (**Bahasa Indonesia** & **English**) yang dapat diganti secara instan melalui *Language Floater*.

---

## 🛠️ Teknologi yang Digunakan

* **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
* **Language:** JavaScript (ES6+)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/)
* **State Management:** React Context API & LocalStorage
* **Charts:** [Recharts](https://recharts.org/)
* **Maps:** [React Leaflet](https://react-leaflet.js.org/)
* **PDF Generation:** `@react-pdf/renderer`
* **Excel Processing:** `xlsx-js-style`

---

## 📂 Struktur Project

```bash
├── app/
│   ├── api/                  # API Routes (Proxy ke Backend Eksternal)
│   ├── estimasi/             # Halaman Estimasi Delivery
│   ├── vehicles/             # Halaman Master Data Kendaraan
│   ├── page.js               # Halaman Utama (Login & Pilih Lokasi)
│   └── layout.js             # Root Layout
├── components/               # Komponen UI Reusable (Cards, Modals, Inputs)
├── context/                  # Context Provider (LanguageContext)
├── features/                 # Logika Bisnis per Modul
│   ├── dashboard/            # Komponen Grafik & Tab Dashboard
│   ├── estimasiDelivery/     # Logika Tracking & Generate PDF
│   ├── userLogin/            # Logika Login User
│   └── vehicleData/          # Logika Table Data Kendaraan
└── lib/                      # Helper Functions, Constants, API Service