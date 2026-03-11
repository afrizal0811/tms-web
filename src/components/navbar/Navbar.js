// File: src/components/navbar/Navbar.js
'use client';

import { useLanguage } from '@/context/LanguageContext';
import { getRoles } from '@/lib/api';
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
  const { t, lang, switchLanguage } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLaporanOpen, setIsLaporanOpen] = useState(false);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSuperadmin, setIsSuperadmin] = useState(false);

  const isIndo = lang === 'id';
  const pathname = usePathname();
  const navRef = useRef(null);
  const laporanRef = useRef(null);
  const hiddenTextClassName = 'hidden [@media(min-width:1164px)]:inline';

  useEffect(() => {
    const checkUserAndRole = async () => {
      try {
        if (typeof window !== 'undefined') {
          const { storedUser: raw } = getLocalStorage();
          if (raw) {
            const user = JSON.parse(raw);
            setIsLoggedIn(!!user);
            const roles = await getRoles();
            const superadminRole = roles.find((r) => r.name.toLowerCase() === 'superadmin');

            setIsSuperadmin(user?.roleId === superadminRole?._id);
          }
        }
      } catch (e) {
        setIsLoggedIn(false);
        setIsSuperadmin(false);
      }
    };

    // KUNCI PERBAIKAN: Memindahkan setMounted(true) ke dalam setTimeout agar bersifat asinkronus (menghindari error cascading renders)
    const timer = setTimeout(() => {
      setMounted(true);
      checkUserAndRole();
    }, 0);

    return () => clearTimeout(timer);
  }, []);

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

  if (!mounted) {
    return (
      <nav className="w-full bg-white border-b border-gray-200 px-4 sm:px-6 py-4 sticky top-0 z-100 shadow-sm">
        <div className="max-w-8xl mx-auto flex justify-between items-center px-4">
          <div className="flex items-center space-x-4 sm:space-x-6 w-full lg:w-auto">
            <Link href="/" className="flex flex-col leading-tight">
              <span className="hidden lg:block text-slate-900 font-bold text-lg sm:text-xl">
                TMS
              </span>
              <span className="block lg:hidden text-slate-900 font-bold text-lg sm:text-xl">
                TMS Data Processing
              </span>
            </Link>
          </div>
        </div>
      </nav>
    );
  }

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
        <div
          className={`flex items-center space-x-4 sm:space-x-6 ${isLoggedIn ? 'w-auto' : 'w-full lg:w-auto'}`}
        >
          <Link href="/" className="flex flex-col leading-tight">
            <span className="hidden lg:block text-slate-900 font-bold text-lg sm:text-xl">TMS</span>
            <span className="block lg:hidden text-slate-900 font-bold text-lg sm:text-xl">
              TMS Data Processing
            </span>
          </Link>

          <div className="hidden lg:flex items-center space-x-4 sm:space-x-6">
            {isLoggedIn ? LoggedInComps : <NavLink href="/help">{t('navbar.help')}</NavLink>}
          </div>
        </div>

        {isLoggedIn ? (
          <>
            {userComps}
            {hamburger}
          </>
        ) : (
          <div className="flex items-center">
            <LanguageSwitcher />
            <div className="lg:hidden ml-2">{hamburger}</div>
          </div>
        )}
      </div>

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

          <MobileNavLink href="/help">{t('navbar.help')}</MobileNavLink>

          {isLoggedIn && (
            <>
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

              <MobileNavLink href="/settings">
                <div className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  {t('navbar.settings') || 'Pengaturan'}
                </div>
              </MobileNavLink>

              <button
                onClick={() => {
                  switchLanguage(lang === 'id' ? 'en' : 'id');
                  window.location.reload();
                }}
                className="block w-full text-left px-3 py-3 text-base font-medium text-slate-700 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
                    />
                  </svg>
                  {t('common.language') || 'Bahasa'} :{' '}
                  {lang === 'id' ? '🇮🇩 Indonesia' : '🇬🇧 English'}
                </div>
              </button>

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
