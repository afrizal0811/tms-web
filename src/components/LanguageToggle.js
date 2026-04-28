// File: src/components/LanguageToggle.js
'use client';

import { useLanguage } from '@/context/LanguageContext';

export default function LanguageToggle({ className = '', showLabel = false }) {
  const { lang, switchLanguage, t } = useLanguage();
  const isIndo = lang === 'id';

  const handleToggle = () => {
    switchLanguage(isIndo ? 'en' : 'id');
    window.location.reload();
  };

  return (
    <div
      className={`flex items-center justify-between text-slate-700 dark:text-slate-300 ${className}`}
    >
      {showLabel && (
        <span className="font-medium">
          {t('common.language')}
        </span>
      )}

      <button
        onClick={handleToggle}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          isIndo ? 'bg-amber-600' : 'bg-sky-600'
        }`}
      >
        <span
          className={`pointer-events-none relative flex h-5 w-5 items-center justify-center rounded-full bg-white shadow ring-0 transform transition duration-200 ease-in-out ${
            isIndo ? 'translate-x-0' : 'translate-x-5'
          }`}
        >
          <span className="text-[10px] font-bold text-slate-700">{isIndo ? 'ID' : 'EN'}</span>
        </span>
      </button>
    </div>
  );
}
