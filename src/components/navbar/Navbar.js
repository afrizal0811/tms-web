// File: src/components/Navbar.js
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import HelpDropdown from './HelpDropdown';
import LocationSwitcher from './LocationSwitcher';
import UserDisplay from './UserDisplay';

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
  const [isLaporanOpen, setIsLaporanOpen] = useState(false); // desktop laporan dropdown state
  const pathname = usePathname();
  const navRef = useRef(null);
  const laporanRef = useRef(null);

  useEffect(() => {
    // close mobile menu on route change
    //eslint-disable-next-line
    setIsMobileMenuOpen(false);
    // also close laporan dropdown on route change
    setIsLaporanOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
      if (laporanRef.current && !laporanRef.current.contains(event.target)) {
        setIsLaporanOpen(false);
      }
    }

    if (isMobileMenuOpen || isLaporanOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen, isLaporanOpen]);

  const plannerUrl = process.env.NEXT_PUBLIC_HELP_URL_PLANNER || '#';
  const driverUrl = process.env.NEXT_PUBLIC_HELP_URL_DRIVER || '#';

  // toggle handler (click) for laporan
  const toggleLaporan = () => setIsLaporanOpen((s) => !s);

  return (
    <nav
      ref={navRef}
      className="w-full bg-white border-b border-gray-200 px-4 sm:px-6 py-4 sticky top-0 z-100 shadow-sm"
    >
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-4 sm:space-x-6">
          <Link href="/" className="text-slate-900 font-bold text-lg sm:text-xl">
            TMS
          </Link>

          {/* Navigasi Desktop */}
          <div className="hidden md:flex items-center space-x-4 sm:space-x-6">
            {/* Laporan as a non-clickable parent (category) - Option A */}
            <div ref={laporanRef} className="relative">
              {/* header label - NOT a navigation link to page, only toggles dropdown on click */}
              <button
                type="button"
                aria-expanded={isLaporanOpen}
                onClick={toggleLaporan}
                className={`flex items-center gap-1 text-sm font-medium transition-colors px-1 py-2 rounded-md cursor-pointer ${
                  isLaporanOpen
                    ? 'text-sky-600 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Laporan</span>
                <svg
                  className={`w-4 h-4 transition-transform ${isLaporanOpen ? 'rotate-180' : 'rotate-0'}`}
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 8l4 4 4-4"
                  />
                </svg>
              </button>

              {/* dropdown (opens only by click toggle) */}
              {isLaporanOpen && (
                <div className="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                  <div className="py-1">
                    <Link
                      href="/laporan"
                      className="block px-4 py-2 text-sm text-slate-700 hover:bg-sky-50 hover:text-sky-600"
                      onClick={() => setIsLaporanOpen(false)}
                    >
                      Laporan Harian
                    </Link>
                    <Link
                      href="/laporan/bulk"
                      className="block px-4 py-2 text-sm text-slate-700 hover:bg-sky-50 hover:text-sky-600"
                      onClick={() => setIsLaporanOpen(false)}
                    >
                      Laporan Periode
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* MENU BARU: Rangkuman */}
            <NavLink href="/rangkuman">Rangkuman</NavLink>

            <NavLink href="/estimasi">Estimasi Pengantaran</NavLink>
            <NavLink href="/vehicles">Data Kendaraan</NavLink>
            <HelpDropdown />
          </div>
        </div>

        <div className="hidden md:flex items-center space-x-4 sm:space-x-6">
          <LocationSwitcher />
          <div className="h-4 w-px bg-gray-300" aria-hidden="true"></div>
          <UserDisplay />
        </div>

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

      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white shadow-lg border-t border-gray-200">
          <div className="flex flex-col pt-2 pb-4 space-y-1">
            <MobileNavLink href="/laporan">Laporan Harian</MobileNavLink>
            <MobileNavLink href="/laporan/bulk">Laporan Periode</MobileNavLink>
            <MobileNavLink href="/rangkuman">Rangkuman</MobileNavLink>
            <MobileNavLink href="/estimasi">Estimasi Pengantaran</MobileNavLink>
            <MobileNavLink href="/vehicles">Data Kendaraan</MobileNavLink>

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

            <div className="pt-2 pb-1 px-3">
              <div className="border-t border-gray-200"></div>
            </div>
            <div className="p-3">
              <UserDisplay />
            </div>
            <div className="p-3 pt-0">
              <LocationSwitcher />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
