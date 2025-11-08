// File: app/layout.js

import { Inter } from 'next/font/google'; // 1. Impor font dari Google
import { Toaster } from 'react-hot-toast';
import './globals.css';

// 2. Konfigurasi font
// Kita ambil beberapa ketebalan: 400 (normal), 500 (medium), 600 (semibold), 700 (bold)
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap', // Pastikan font tetap terlihat saat loading
});

export const metadata = {
  title: 'TMS Processing',
  description: 'TMS Processing'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-white text-slate-900`}>
        <Toaster
          position="top-right" 
          toastOptions={{
            duration: 3000, 
          }}
        />
        {children}
      </body>
    </html>
  );
}
