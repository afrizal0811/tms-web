'use client';

import { useLanguage } from '@/context/LanguageContext';
import { useSuperadmin } from '@/lib/hooks/useSuperadmin';
import { getLocalStorage, removeLocalStorage } from '@/lib/localStorageHandler';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import LanguageToggle from '../LanguageToggle';
import ThemeToggle from '../ThemeToggle';
import { LocationSwitcher } from '../dropdown/LocationDropdown';
import MobileMenu from './MobileMenu';
import NavDropdown from './NavDropdown';
import UserDropdown from './UserDropdown';

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

const REPORT_LINKS = [
  { href: '/report/daily', labelKey: 'navbar.daily_report', superadminOnly: false },
  { href: '/report/kpi', labelKey: 'navbar.kpi', superadminOnly: false },
  { href: '/report/bread', labelKey: 'navbar.bread_report', superadminOnly: false },
  {
    href: '/report/custom',
    labelKey: 'navbar.custom_report',
    superadminOnly: true,
    adminAllowed: true,
  },
  { href: '/report/counter', labelKey: 'navbar.task_counter_report', superadminOnly: true },
];

export default function Navbar() {
  const { t, isIndonesian } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSecret, setIsSecret] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  const isDarkMode = mounted && (theme === 'dark' || resolvedTheme === 'dark');
  const hiddenTextClassName = 'hidden [@media(min-width:1164px)]:inline';

  const { storedUser } = getLocalStorage();
  const userName = storedUser ? JSON.parse(storedUser).name : '';
  const userEmail = storedUser ? JSON.parse(storedUser).email : 'email@example.com';

  const { isSuperadmin, isAdmin } = useSuperadmin();

  const handleLogout = () => {
    removeLocalStorage('data');
    window.location.href = '/';
  };

  useEffect(() => {
    const checkSecret = () => setIsSecret(window.SECRET_MODE_ACTIVE === true);
    checkSecret();
    window.addEventListener('secret_update', checkSecret);
    return () => window.removeEventListener('secret_update', checkSecret);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
      setIsLoggedIn(!!storedUser);
    }, 0);
    return () => clearTimeout(timer);
  }, [storedUser]);

  const primaryVehicle = isIndonesian ? 'Data' : t('common.vehicle');
  const secondaryVehicle = isIndonesian ? t('common.vehicle') : 'Data';

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

  const LoggedInComps = (
    <>
      <NavDropdown
        label={t('navbar.report')}
        links={REPORT_LINKS}
        isSuperadmin={isSuperadmin}
        isAdmin={isAdmin}
      />
      <NavLink href="/task">{t('navbar.task')}</NavLink>
      {isSuperadmin && <NavLink href="/summary">{t('navbar.summary')}</NavLink>}
      <NavLink href="/coordinate">
        <span className={hiddenTextClassName}>{t('navbar.update')}</span> {t('navbar.coordinate')}
      </NavLink>
      <NavLink href="/delivery">{t('navbar.delivery')}</NavLink>
      <NavLink href="/vehicles">
        <span className={isIndonesian ? hiddenTextClassName : ''}> {primaryVehicle} </span>
        <span className={!isIndonesian ? hiddenTextClassName : ''}> {secondaryVehicle}</span>
      </NavLink>
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

  const mobileMenu = (
    <MobileMenu
      isLoggedIn={isLoggedIn}
      userName={userName}
      userEmail={userEmail}
      isSuperadmin={isSuperadmin}
      isAdmin={isAdmin}
      handleLogout={handleLogout}
      reportLinks={REPORT_LINKS}
    />
  );

  return (
    <nav className="sticky top-0 z-100 w-full px-4 py-4 sm:px-6 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 shadow-md dark:shadow-slate-700/40 transition-colors duration-200">
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
            {isLoggedIn ? (
              LoggedInComps
            ) : (
              <>
                {isSecret && <NavLink href="/setting">{t('setting.title')}</NavLink>}
                <NavLink href="/help">{t('navbar.help')}</NavLink>
              </>
            )}
          </div>
        </div>

        {isLoggedIn ? (
          <>
            {userComps}
            {mobileMenu}
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
            {mobileMenu}
          </div>
        )}
      </div>
    </nav>
  );
}
