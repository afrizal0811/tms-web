// File: src/components/Navbar.js
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
// --- (PERUBAHAN 1): Impor 'useRef' ---
import { useEffect, useRef, useState } from 'react';
import HelpDropdown from './HelpDropdown';

// ... (Komponen NavLink - TIDAK BERUBAH) ...
function NavLink({ href, children }) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`text-sm font-medium transition-colors ${
        isActive ? 'text-sky-600 font-semibold' : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      {children}
    </Link>
  );
}

// ... (Komponen MobileNavLink - TIDAK BERUBAH) ...
function MobileNavLink({ href, children }) {
  const pathname = usePathname();
  const isActive = pathname === href;
  return (
    <Link
      href={href}
      className={`block w-full p-3 text-base font-medium ${
        isActive ? 'text-sky-600 bg-sky-50' : 'text-slate-700 hover:bg-gray-100'
      }`}
    >
      {children}
    </Link>
  );
}

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // --- (PERUBAHAN 2): Buat 'ref' untuk <nav> ---
  const navRef = useRef(null);

  // Efek untuk menutup saat ganti link/halaman (Tidak Berubah)
  useEffect(() => {
    //eslint-disable-next-line
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // --- (PERUBAHAN 3): 'useEffect' baru untuk 'Click Outside' ---
  useEffect(() => {
    // Fungsi yang akan dijalankan saat ada klik
    function handleClickOutside(event) {
      // Cek jika 'ref' ada DAN 'event.target' (tempat klik)
      // BUKANLAH turunan (contains) dari 'ref'
      if (navRef.current && !navRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false); // Tutup menu
      }
    }

    // Hanya tambahkan listener jika menu terbuka
    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // Cleanup: Hapus listener saat komponen unmount ATAU
    // saat 'isMobileMenuOpen' berubah (menjadi false)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]); // <-- Jalankan ulang efek ini saat 'isMobileMenuOpen' berubah
  // --- SELESAI PERUBAHAN 3 ---

  // Ambil URL (untuk menu mobile)
  const plannerUrl = process.env.NEXT_PUBLIC_HELP_URL_PLANNER || '#';
  const driverUrl = process.env.NEXT_PUBLIC_HELP_URL_DRIVER || '#';

  return (
    // --- (PERUBAHAN 2): Terapkan 'ref' ke <nav> ---
    <nav
      ref={navRef}
      className="w-full bg-white border-b border-gray-200 px-4 sm:px-6 py-4 sticky top-0 z-50 shadow-sm"
    >
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link href="/" className="text-slate-900 font-bold text-lg sm:text-xl">
          TMS PROCESSING
        </Link>

        {/* Link Desktop (Tidak Berubah) */}
        <div className="hidden md:flex items-center space-x-4 sm:space-x-6">
          <NavLink href="/">Home</NavLink>
          <NavLink href="/vehicles">Data Kendaraan</NavLink>
          <NavLink href="/estimasi">Estimasi Delivery</NavLink>
          <div className="h-4 w-px bg-gray-300" aria-hidden="true"></div>
          <HelpDropdown />
        </div>

        {/* Tombol Burger (Tidak Berubah) */}
        <div className="md:hidden">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
            className="p-2 rounded-md text-slate-700 hover:bg-gray-100"
          >
            {isMobileMenuOpen ? (
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
      </div>

      {/* Menu Dropdown Mobile (Tidak Berubah) */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white shadow-lg border-t border-gray-200">
          <div className="flex flex-col pt-2 pb-4 space-y-1">
            <MobileNavLink href="/">Home</MobileNavLink>
            <MobileNavLink href="/vehicles">Data Kendaraan</MobileNavLink>
            <MobileNavLink href="/estimasi">Estimasi Delivery</MobileNavLink>
            <div className="pt-2 pb-1 px-3">
              <div className="border-t border-gray-200"></div>
            </div>
            <a
              href={plannerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full p-3 text-base font-medium text-slate-700 hover:bg-gray-100"
            >
              Panduan - Planner
            </a>
            <a
              href={driverUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full p-3 text-base font-medium text-slate-700 hover:bg-gray-100"
            >
              Panduan - Driver
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
