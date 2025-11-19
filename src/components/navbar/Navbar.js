// File: src/components/Navbar.js
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import HelpDropdown from './HelpDropdown';
import LocationSwitcher from './LocationSwitcher';
import UserDisplay from './UserDisplay';
import LaporanDropdown from './LaporanDropdown';

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
  const pathname = usePathname();
  const navRef = useRef(null);

  useEffect(() => {
    //eslint-disable-next-line
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    }
    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  const plannerUrl = process.env.NEXT_PUBLIC_HELP_URL_PLANNER || '#';
  const driverUrl = process.env.NEXT_PUBLIC_HELP_URL_DRIVER || '#';

  return (
    <nav
      ref={navRef}
      className="w-full bg-white border-b border-gray-200 px-4 sm:px-6 py-4 sticky top-0 z-50 shadow-sm"
    >
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-4 sm:space-x-6">
          <Link href="/" className="text-slate-900 font-bold text-lg sm:text-xl">
            TMS
          </Link>

          {/* Navigasi Desktop */}
          <div className="hidden md:flex items-center space-x-4 sm:space-x-6">
            <LaporanDropdown />
            {/* MENU BARU: Rangkuman */}
            <NavLink href="/rangkuman">Rangkuman</NavLink>

            <NavLink href="/estimasi">Estimasi Delivery</NavLink>
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
            <MobileNavLink href="/laporan">Laporan (Satuan)</MobileNavLink>
            <MobileNavLink href="/rangkuman">Rangkuman</MobileNavLink>
            <MobileNavLink href="/laporan/bulk">Laporan (Bulk)</MobileNavLink>
            <MobileNavLink href="/estimasi">Estimasi Delivery</MobileNavLink>
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
