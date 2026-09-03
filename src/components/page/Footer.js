'use client';

import { useLanguage } from '@/context/LanguageContext';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { useEffect, useState } from 'react';

export default function Footer() {
  const { t } = useLanguage();
  const startYear = 2025;
  const endYear = new Date().getFullYear();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const { appVersion } = getLocalStorage();

  return (
    <footer className="w-full text-center text-slate-500 dark:text-slate-400 text-xs mt-auto py-2 transition-colors">
      {mounted && appVersion && ` v${appVersion}`}
      <br />
      <span suppressHydrationWarning>{t('common.created_by')}</span>: Afi - EDP © {startYear} -{' '}
      {endYear}
    </footer>
  );
}
