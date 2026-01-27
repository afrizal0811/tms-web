// File: src/components/Footer.js
import { useLanguage } from '@/context/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();
  const startYear = 2025;
  const endYear = new Date().getFullYear();

  return (
    <footer className="w-full text-center text-slate-500 text-xs mt-auto py-2">
      <span suppressHydrationWarning>{t('common.copyright')}</span>: Afi - EDP © {startYear} -{' '}
      {endYear}
    </footer>
  );
}
