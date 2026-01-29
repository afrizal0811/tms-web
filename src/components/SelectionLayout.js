'use client';

import Footer from '@/components/Footer';
import Navbar from '@/components/navbar/Navbar'; // Pastikan path import sesuai struktur folder Anda

export default function SelectionLayout({ children }) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar ditambahkan di sini agar muncul di halaman login/seleksi lokasi */}
      <Navbar />

      <main className="grow flex flex-col justify-center items-center w-full p-6">{children}</main>

      <Footer />
    </div>
  );
}
