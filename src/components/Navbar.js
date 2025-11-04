// File: src/components/Navbar.js
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

function NavLink({ href, children }) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`text-sm font-medium transition-colors ${
        isActive
          ? // PERUBAHAN: Warna aktif
            'text-blue-600 font-semibold'
          : // PERUBAHAN: Warna tidak aktif
            'text-slate-600 hover:text-slate-900'
      }`}
    >
      {children}
    </Link>
  );
}

export default function Navbar() {
  return (
    <nav className="w-full bg-white border-b border-gray-200 px-4 sm:px-6 py-4 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        {/* PERUBAHAN: Pastikan teks logo terlihat */}
        <Link href="/" className="text-slate-900 font-bold text-lg sm:text-xl">
          TMS-WEB
        </Link>

        {/* Nav Links */}
        <div className="flex space-x-4 sm:space-x-6">
          <NavLink href="/">Home</NavLink>
          <NavLink href="/vehicles">Data Kendaraan</NavLink>
        </div>
      </div>
    </nav>
  );
}
