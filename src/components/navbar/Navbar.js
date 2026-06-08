'use client';

import { useLanguage } from '@/context/LanguageContext';
import { getRoles } from '@/lib/api';
import {
  getLocalStorage,
  getSuperadminRoleId,
  removeLocalStorage,
  setSuperadminRoleId,
} from '@/lib/localStorageHandler';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import LanguageToggle from '../LanguageToggle';
import ThemeToggle from '../ThemeToggle';
import LocationSwitcher from './LocationSwitcher';
import UserDropdown from './UserDropdown';

export default function Navbar() {
  const { t, isIndonesian } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLaporanOpen, setIsLaporanOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  const isDarkMode = mounted && (theme === 'dark' || resolvedTheme === 'dark');
  const pathname = usePathname();
  const navRef = useRef(null);
  const laporanRef = useRef(null);
  const hiddenTextClassName = 'hidden [@media(min-width:1164px)]:inline';
  const { storedUser } = getLocalStorage();
  const userName = storedUser ? JSON.parse(storedUser).name : '';

  const handleLogout = () => {
    removeLocalStorage('data');
    window.location.href = '/';
  };

  useEffect(() => {
    const checkUserAndRole = async () => {
      try {
        if (typeof window !== 'undefined') {
          if (storedUser) {
            const user = JSON.parse(storedUser);
            setIsLoggedIn(!!user);

            const cachedSuperadminId = getSuperadminRoleId();

            if (cachedSuperadminId) {
              setIsSuperadmin(user?.roleId === cachedSuperadminId);
            } else {
              const roles = await getRoles();
              const superadminRole = roles.find((r) => r.name.toLowerCase() === 'superadmin');

              if (superadminRole) {
                setSuperadminRoleId(superadminRole._id);
                setIsSuperadmin(user?.roleId === superadminRole._id);
              }
            }
          }
        }
      } catch (e) {
        setIsLoggedIn(false);
        setIsSuperadmin(false);
      }
    };
    const timer = setTimeout(() => {
      setMounted(true);
      checkUserAndRole();
    }, 0);

    return () => clearTimeout(timer);
  }, [storedUser]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMobileMenuOpen(false);
      setIsLaporanOpen(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [pathname]);

  // Efek baru: Mengunci scroll body saat menu mobile terbuka
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

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

  const toggleLaporan = () => setIsLaporanOpen((s) => !s);
  const primaryEstimate = isIndonesian ? t('navbar.estimate') : t('navbar.deliveries');
  const secondaryEstimate = isIndonesian ? t('navbar.deliveries') : t('navbar.estimate');
  const primaryDeliveries = isIndonesian ? 'Data' : t('common.vehicle');
  const secondaryDeliveries = isIndonesian ? t('common.vehicle') : 'Data';

  function NavLink({ href, children, className }) {
    const pathname = usePathname();
    const isActive = pathname === href;

    return (
      <Link
        href={href}
        className={`text-sm font-medium transition-colors ${className} ${
          isActive
            ? 'text-sky-600 dark:text-sky-400 font-semibold'
            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
        }`}
      >
        {children}
      </Link>
    );
  }

  function MobileNavLink({ href, children, target = '', rel = '' }) {
    const pathname = usePathname();
    const isActive = pathname === href;
    const isExternal = target === '_blank';
    const baseClassName = `block w-full p-3 text-base font-medium ${
      isActive
        ? 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30'
        : 'text-slate-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
    }`;

    if (isExternal) {
      return (
        <a href={href} target={target} rel={rel} className={baseClassName}>
          {children}
        </a>
      );
    }

    return (
      <Link href={href} className={baseClassName}>
        {children}
      </Link>
    );
  }

  if (!mounted) {
    return (
      <nav className="w-full bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-4 sm:px-6 py-4 sticky top-0 z-100 shadow-sm transition-colors duration-200">
        <div className="max-w-8xl mx-auto flex justify-between items-center px-4">
          <div className="flex items-center space-x-4 sm:space-x-6 w-full lg:w-auto">
            <Link href="/" className="flex flex-col leading-tight">
              <span className="hidden lg:block text-slate-900 dark:text-slate-100 font-bold text-lg sm:text-xl">
                TMS
              </span>
              <span className="block lg:hidden text-slate-900 dark:text-slate-100 font-bold text-lg sm:text-xl">
                TMS Data Processing
              </span>
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  const navLinkEstimate = (
    <NavLink href="/estimate">
      <span className={!isIndonesian ? hiddenTextClassName : ''}> {primaryEstimate} </span>
      <span className={isIndonesian ? hiddenTextClassName : ''}> {secondaryEstimate}</span>
    </NavLink>
  );

  const navLinkDelivery = (
    <NavLink href="/vehicles">
      <span className={isIndonesian ? hiddenTextClassName : ''}> {primaryDeliveries} </span>
      <span className={!isIndonesian ? hiddenTextClassName : ''}> {secondaryDeliveries}</span>
    </NavLink>
  );

  const mobileLinkEstimate = (
    <MobileNavLink href="/estimate">
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
          isLaporanOpen
            ? 'text-sky-600 dark:text-sky-400 font-semibold'
            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
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
        className={`absolute left-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md shadow-lg z-50 overflow-hidden transition-all duration-200 origin-top ${
          isLaporanOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible'
        }`}
      >
        <div className="py-1">
          <Link
            href="/report/single"
            className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-slate-700 hover:text-sky-600 dark:hover:text-sky-400"
            onClick={() => setIsLaporanOpen(false)}
          >
            {t('navbar.daily_report')}
          </Link>
          <Link
            href="/report/bulk"
            className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-slate-700 hover:text-sky-600 dark:hover:text-sky-400"
            onClick={() => setIsLaporanOpen(false)}
          >
            {t('navbar.period_report')}
          </Link>
          {isSuperadmin && (
            <>
              <Link
                href="/report/detail"
                className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-slate-700 hover:text-sky-600 dark:hover:text-sky-400"
                onClick={() => setIsLaporanOpen(false)}
              >
                {t('navbar.task_detail_report')}
              </Link>
              <Link
                href="/report/counter"
                className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-slate-700 hover:text-sky-600 dark:hover:text-sky-400"
                onClick={() => setIsLaporanOpen(false)}
              >
                {t('navbar.task_counter_report')}
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const LoggedInComps = (
    <>
      {navLinkReport}
      {isSuperadmin && <NavLink href="/summary">{t('navbar.summary')}</NavLink>}
      <NavLink href="/coordinate">
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
      <div className="h-4 w-px bg-gray-300 dark:bg-slate-700" aria-hidden="true"></div>
      <UserDropdown isDarkMode={isDarkMode} />
    </div>
  );

  const hamburger = (
    <div className="lg:hidden">
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Toggle menu"
        className="p-2 rounded-md text-slate-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer transition-colors duration-200"
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
      className="sticky top-0 z-100 w-full px-4 py-4 sm:px-6 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 shadow-md dark:shadow-slate-700/40 transition-colors duration-200"
    >
      <div className="max-w-8xl mx-auto flex justify-between items-center px-4">
        <div
          className={`flex items-center space-x-4 sm:space-x-6 ${isLoggedIn ? 'w-auto' : 'w-full lg:w-auto'}`}
        >
          <Link href="/" className="flex flex-col leading-tight">
            <span className="hidden lg:block text-slate-900 dark:text-slate-100 font-bold text-lg sm:text-xl">
              TMS
            </span>
            <span className="block lg:hidden text-slate-900 dark:text-slate-100 font-bold text-lg sm:text-xl">
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
          <div className="flex items-center gap-3">
            <ThemeToggle
              isActive={isDarkMode}
              onToggle={() => setTheme(isDarkMode ? 'light' : 'dark')}
              className="text-md px-3 hidden lg:block"
              isLargeIcon={true}
            />
            <LanguageToggle isLargeIcon={true} className="hidden lg:block" />
            <div className="lg:hidden">{hamburger}</div>
          </div>
        )}
      </div>

      <div
        className={`lg:hidden absolute top-full left-0 right-0 bg-white dark:bg-slate-900 shadow-lg border-t border-gray-200 dark:border-slate-800 transition-all duration-200 ease-in-out ${
          isMobileMenuOpen
            ? 'max-h-[80vh] opacity-100 overflow-y-auto'
            : 'max-h-0 opacity-0 overflow-hidden'
        }`}
      >
        <div className="flex flex-col pb-4 ">
          {isLoggedIn ? (
            <>
              <div className=" px-4 py-5 flex items-center justify-between text-slate-800 dark:text-slate-200 gap-3">
                <div className="flex items-center gap-3 overflow-hidden min-w-0">
                  <div className="flex flex-col overflow-hidden min-w-0">
                    <span className="text-sm font-bold truncate tracking-wide">{userName}</span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                      {storedUser ? JSON.parse(storedUser).email : 'email@example.com'}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 w-32">
                  <LocationSwitcher />
                </div>
              </div>
              <div className="pt-1 pb-1 px-3">
                <div className="border-t border-gray-200 dark:border-slate-800"></div>
              </div>
              <MobileNavLink href="/report/single">{t('navbar.daily_report')}</MobileNavLink>
              <MobileNavLink href="/report/bulk">{t('navbar.period_report')}</MobileNavLink>
              <MobileNavLink href="/report/detail">{t('navbar.task_detail_report')}</MobileNavLink>
              <MobileNavLink href="/report/counter">
                {t('navbar.task_counter_report')}
              </MobileNavLink>
              {isSuperadmin && <MobileNavLink href="/summary">{t('navbar.summary')}</MobileNavLink>}
              <MobileNavLink href="/coordinate">
                {t('navbar.update')} {t('navbar.coordinate')}
              </MobileNavLink>
              {mobileLinkEstimate}
              {mobileLinkDelivery}
              <div className="pt-2 pb-1 px-3">
                <div className="border-t border-gray-200 dark:border-slate-800"></div>
              </div>
            </>
          ) : null}
          <ThemeToggle
            isActive={isDarkMode}
            onToggle={() => setTheme(isDarkMode ? 'light' : 'dark')}
            darkLabel={t('common.dark_mode')}
            lightLabel={t('common.light_mode')}
            className="text-md px-3"
          />
          <LanguageToggle showLabel={true} className="text-base px-3 py-2.5 mb-1 " />
          <MobileNavLink href="/help">{t('navbar.help')}</MobileNavLink>
          {isLoggedIn && (
            <>
              <MobileNavLink href="/setting">{t('setting.title')}</MobileNavLink>
              <button
                onClick={handleLogout}
                className="block w-full text-left px-3 py-3 text-base font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-300 transition-colors cursor-pointer"
              >
                {t('navbar.logout')}
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
