// File: app/layout.js

import './globals.css';
import { Inter } from 'next/font/google'; // 1. Impor font dari Google

// 2. Konfigurasi font
// Kita ambil beberapa ketebalan: 400 (normal), 500 (medium), 600 (semibold), 700 (bold)
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap', // Pastikan font tetap terlihat saat loading
});

export const metadata = {
  title: 'TMS-WEB',
  description: 'TMS Processing Summary',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      {/* 3. Terapkan className font ke <body> */}
      <body className={`${inter.className} bg-white text-slate-900`}>{children}</body>
    </html>
  );
}
