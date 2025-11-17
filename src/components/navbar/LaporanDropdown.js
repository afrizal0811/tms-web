'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';

// Komponen internal untuk Link
function DropdownLink({ href, children }) {
  return (
    <Link
      href={href}
      className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
    >
      {children}
    </Link>
  );
}

export default function LaporanDropdown() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Cek apakah link utama "/laporan" aktif
  const isLaporanActive = pathname === '/laporan';
  // Cek apakah SALAH SATU link di dropdown aktif
  const isDropdownActive = pathname.startsWith('/laporan/'); // misal /laporan/bulk

  // Menutup dropdown jika klik di luar
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownRef]);

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center">
        {/* Link Utama (Klik "Laporan") */}
        <Link
          href="/laporan"
          className={`text-sm font-medium transition-colors ${
            isLaporanActive
              ? 'text-sky-600 font-semibold' // Aktif jika TEPAT di /laporan
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Laporan
        </Link>

        {/* Tombol Panah (Klik Panah) */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`p-1 ml-1 rounded-md ${
            isDropdownActive
              ? 'text-sky-600' // Panah ikut biru jika /laporan/bulk aktif
              : 'text-slate-400 hover:text-slate-600'
          }`}
          aria-label="Buka menu laporan"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {/* Menu Dropdown */}
      {isOpen && (
        <div
          className="absolute left-0 mt-2 w-48 origin-top-left rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-20"
          onClick={() => setIsOpen(false)} // Tutup saat item diklik
        >
          <div className="py-1">
            <DropdownLink href="/laporan/bulk">Laporan Bulk</DropdownLink>
            {/* Tambahkan link bulk lain di sini jika perlu */}
          </div>
        </div>
      )}
    </div>
  );
}
