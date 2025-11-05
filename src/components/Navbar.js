// File: src/components/Navbar.js
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
// --- (PERUBAHAN 1): Impor useState dan useEffect ---
import { useState, useEffect } from 'react';

// NavLink untuk Desktop (Tidak Berubah)
function NavLink({ href, children }) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`text-sm font-medium transition-colors ${
        isActive ? 'text-blue-600 font-semibold' : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      {children}
    </Link>
  );
}

// --- (PERUBAHAN 2): Komponen NavLink baru untuk Mobile ---
// Dibuat terpisah karena styling-nya berbeda (full-width, padding lebih besar)
function MobileNavLink({ href, children }) {
  const pathname = usePathname();
  const isActive = pathname === href;
  return (
    <Link
      href={href}
      className={`block w-full p-3 text-base font-medium ${
        isActive ? 'text-blue-600 bg-blue-50' : 'text-slate-700 hover:bg-gray-100'
      }`}
    >
      {children}
    </Link>
  );
}
// --- SELESAI PERUBAHAN 2 ---

export default function Navbar() {
  // --- (PERUBAHAN 3): State untuk menu mobile ---
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // (Bonus UX) Tutup menu mobile saat link diklik/navigasi
  const pathname = usePathname();
  useEffect(() => {
    //eslint-disable-next-line
    setIsMobileMenuOpen(false);
  }, [pathname]);
  // --- SELESAI PERUBAHAN 3 ---

  return (
    // 'relative' diperlukan untuk memposisikan dropdown menu mobile
    <nav className="w-full bg-white border-b border-gray-200 px-4 sm:px-6 py-4 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        {/* Logo (Tidak Berubah) */}
        <Link href="/" className="text-slate-900 font-bold text-lg sm:text-xl">
          TMS-WEB
        </Link>

        {/* --- (PERUBAHAN 4): Tautan Navigasi Desktop --- */}
        {/* 'hidden' di mobile, 'flex' (terlihat) di 'md' (medium screen) ke atas */}
        <div className="hidden md:flex space-x-4 sm:space-x-6">
          <NavLink href="/">Home</NavLink>
          <NavLink href="/vehicles">Data Kendaraan</NavLink>
          <NavLink href="/estimasi">Estimasi Delivery</NavLink>
        </div>
        {/* --- SELESAI PERUBAHAN 4 --- */}

        {/* --- (PERUBAHAN 5): Tombol Burger (Hanya Mobile) --- */}
        {/* 'md:hidden' berarti tombol ini akan disembunyikan di 'md' ke atas */}
        <div className="md:hidden">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
            className="p-2 rounded-md text-slate-700 hover:bg-gray-100"
          >
            {isMobileMenuOpen ? (
              // Ikon 'X' (Close)
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              // Ikon 'Burger' (Menu)
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            )}
          </button>
        </div>
        {/* --- SELESAI PERUBAHAN 5 --- */}
      </div>

      {/* --- (PERUBAHAN 6): Menu Dropdown Mobile --- */}
      {/* Tampil/Sembunyi berdasarkan state 'isMobileMenuOpen' */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white shadow-lg border-t border-gray-200">
          <div className="flex flex-col pt-2 pb-4 space-y-1">
            <MobileNavLink href="/">Home</MobileNavLink>
            <MobileNavLink href="/vehicles">Data Kendaraan</MobileNavLink>
            <MobileNavLink href="/estimasi">Estimasi Delivery</MobileNavLink>
          </div>
        </div>
      )}
      {/* --- SELESAI PERUBAHAN 6 --- */}
    </nav>
  );
}
