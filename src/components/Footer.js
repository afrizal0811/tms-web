'use client';

import { useLanguage } from '@/context/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();
  const startYear = 2025;
  const endYear = new Date().getFullYear();

  return (
    <footer className="w-full text-center text-slate-500 dark:text-slate-400 text-xs mt-auto py-2 transition-colors">
      <span suppressHydrationWarning>{t('common.created_by')}</span>: Afi - EDP © {startYear} -{' '}
      {endYear}
    </footer>
  );
}
