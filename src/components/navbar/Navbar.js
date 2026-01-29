// File: src/components/navbar/Navbar.js
'use client';

import { useLanguage } from '@/context/LanguageContext';
import { ROLE_ID } from '@/lib/constants';
import { getLocalStorage } from '@/lib/localStorageHandler';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import LanguageSwitcher from './LanguageSwitcher';
import LocationSwitcher from './LocationSwitcher';
import UserDisplay from './UserDisplay';
function NavLink({ href, children, className }) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`text-sm font-medium transition-colors ${className} ${
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
  const { t, lang } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLaporanOpen, setIsLaporanOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const isIndo = lang === 'id';
  const pathname = usePathname();
  const navRef = useRef(null);
  const laporanRef = useRef(null);
  const hiddenTextClassName = 'hidden [@media(min-width:1164px)]:inline';

  const [isSuperadmin] = useState(() => {
    if (typeof window === 'undefined') return false;

    try {
      const { storedUser: raw } = getLocalStorage();
      if (!raw) return false;
      const user = JSON.parse(raw);
      setIsLoggedIn(!!user);
      return user?.roleId === ROLE_ID.superadmin;
    } catch {
      return false;
    }
  });

  // FIX: Gunakan setTimeout agar update state tidak sinkron (menghindari warning React)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMobileMenuOpen(false);
      setIsLaporanOpen(false);
    }, 0);
    return () => clearTimeout(timer);
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

  const toggleLaporan = () => setIsLaporanOpen((s) => !s);
  const primaryEstimate = isIndo ? t('navbar.estimate') : t('navbar.deliveries');
  const secondaryEstimate = isIndo ? t('navbar.deliveries') : t('navbar.estimate');
  const primaryDeliveries = isIndo ? 'Data' : t('navbar.vehicle');
  const secondaryDeliveries = isIndo ? t('navbar.vehicle') : 'Data';

  const navLinkEstimate = (
    <NavLink href="/estimasi">
      <span className={!isIndo ? hiddenTextClassName : ''}> {primaryEstimate} </span>
      <span className={isIndo ? hiddenTextClassName : ''}> {secondaryEstimate}</span>
    </NavLink>
  );

  const navLinkDelivery = (
    <NavLink href="/vehicles">
      <span className={isIndo ? hiddenTextClassName : ''}> {primaryDeliveries} </span>
      <span className={!isIndo ? hiddenTextClassName : ''}> {secondaryDeliveries}</span>
    </NavLink>
  );

  const mobileLinkEstimate = (
    <MobileNavLink href="/estimasi">
      {primaryEstimate} {secondaryEstimate}
    </MobileNavLink>
  );

  const mobileLinkDelivery = (
    <MobileNavLink href="/vehicles">
      {primaryDeliveries} {secondaryDeliveries}
    </MobileNavLink>
  );

  const navLinkReport = (
    <div ref={laporanRef} className="relative">
      <button
        type="button"
        aria-expanded={isLaporanOpen}
        onClick={toggleLaporan}
        className={`flex items-center gap-1 text-sm font-medium transition-colors px-1 py-2 rounded-md cursor-pointer ${
          isLaporanOpen ? 'text-sky-600 font-semibold' : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        <span>{t('navbar.report')}</span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isLaporanOpen ? 'rotate-180' : 'rotate-0'}`}
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 8l4 4 4-4" />
        </svg>
      </button>

      <div
        className={`absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50 overflow-hidden transition-all duration-200 origin-top ${
          isLaporanOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible'
        }`}
      >
        <div className="py-1">
          <Link
            href="/laporan"
            className="block px-4 py-2 text-sm text-slate-700 hover:bg-sky-50 hover:text-sky-600"
            onClick={() => setIsLaporanOpen(false)}
          >
            {t('navbar.daily_report')}
          </Link>
          <Link
            href="/laporan/bulk"
            className="block px-4 py-2 text-sm text-slate-700 hover:bg-sky-50 hover:text-sky-600"
            onClick={() => setIsLaporanOpen(false)}
          >
            {t('navbar.period_report')}
          </Link>
        </div>
      </div>
    </div>
  );

  const LoggedInComps = (
    <>
      {navLinkReport}
      {isSuperadmin && <NavLink href="/rangkuman">{t('navbar.summary')}</NavLink>}
      <NavLink href="/update-longlat">
        <span className={hiddenTextClassName}>{t('navbar.update')}</span> {t('navbar.coordinate')}
      </NavLink>
      {navLinkEstimate}
      {navLinkDelivery}
      <NavLink href="/help">{t('navbar.help')}</NavLink>
    </>
  );

  const userComps = (
    <div className="hidden lg:flex items-center space-x-4 sm:space-x-6">
      <LocationSwitcher />
      <div className="h-4 w-px bg-gray-300" aria-hidden="true"></div>
      <UserDisplay />
    </div>
  );

  const hamburger = (
    <div className="lg:hidden">
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Toggle menu"
        className="p-2 rounded-md text-slate-700 hover:bg-gray-100 cursor-pointer transition-colors duration-200"
      >
        <div
          className={`transition-transform duration-300 ${isMobileMenuOpen ? 'rotate-90' : 'rotate-0'}`}
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
        </div>
      </button>
    </div>
  );

  return (
    <nav
      ref={navRef}
      className="w-full bg-white border-b border-gray-200 px-4 sm:px-6 py-4 sticky top-0 z-100 shadow-sm"
    >
      <div className="max-w-8xl mx-auto flex justify-between items-center px-4">
        {/* SECTION KIRI (Logo & Navigation Links) */}
        <div
          className={`flex items-center space-x-4 sm:space-x-6 ${isLoggedIn ? 'w-auto' : 'w-full lg:w-auto'}`}
        >
          <Link href="/" className="flex flex-col leading-tight">
            <span className="hidden lg:block text-slate-900 font-bold text-lg sm:text-xl">TMS</span>
            <span className="block lg:hidden text-slate-900 font-bold text-lg sm:text-xl">
              TMS Data Processing
            </span>
          </Link>

          {/* Navigasi Desktop: Jika Login muncul Menu Lengkap, Jika Tidak muncul Help saja */}
          <div className="hidden lg:flex items-center space-x-4 sm:space-x-6">
            {isLoggedIn ? (
              LoggedInComps
            ) : (
              // PINDAH KE SINI: Tombol Help di sebelah Logo (Layout Kiri)
              <NavLink href="/help">{t('navbar.help')}</NavLink>
            )}
          </div>
        </div>

        {/* SECTION KANAN (User Data / Language Switcher) */}
        {isLoggedIn ? (
          <>
            {userComps}
            {hamburger}
          </>
        ) : (
          // HANYA Language Switcher di pojok kanan
          <div className="flex items-center">
            <LanguageSwitcher />

            {/* Hamburger untuk Mobile (jika layar kecil) agar Help tetap bisa diakses */}
            <div className="lg:hidden ml-2">{hamburger}</div>
          </div>
        )}
      </div>

      {/* Mobile Menu Content (Render untuk LoggedIn maupun NotLoggedIn agar responsif) */}
      <div
        className={`lg:hidden absolute top-full left-0 right-0 bg-white shadow-lg border-t border-gray-200 overflow-hidden transition-all duration-300 ease-in-out ${
          isMobileMenuOpen ? 'max-h-[90vh] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="flex flex-col pt-2 pb-4 space-y-1">
          {isLoggedIn ? (
            <>
              <MobileNavLink href="/laporan">{t('navbar.daily_report')}</MobileNavLink>
              <MobileNavLink href="/laporan/bulk">{t('navbar.period_report')}</MobileNavLink>
              {isSuperadmin && (
                <MobileNavLink href="/rangkuman">{t('navbar.summary')}</MobileNavLink>
              )}
              <MobileNavLink href="/update-longlat">
                {t('navbar.update')} {t('navbar.coordinate')}
              </MobileNavLink>
              {mobileLinkEstimate}
              {mobileLinkDelivery}

              <div className="pt-2 pb-1 px-3">
                <div className="border-t border-gray-200"></div>
              </div>
            </>
          ) : null}

          {/* Help selalu muncul di Mobile Menu */}
          <MobileNavLink href="/help">{t('navbar.help')}</MobileNavLink>

          {isLoggedIn && (
            <>
              {/* Link Manual */}
              <a
                href={plannerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full p-3 text-base font-medium text-slate-700 hover:bg-gray-100"
              >
                {t('navbar.planner_guide')}
              </a>
              <a
                href={driverUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full p-3 text-base font-medium text-slate-700 hover:bg-gray-100"
              >
                {t('navbar.driver_guide')}
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
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
