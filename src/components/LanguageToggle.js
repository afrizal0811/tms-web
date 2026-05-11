// File: src/components/LanguageToggle.js
'use client';

import { useLanguage } from '@/context/LanguageContext';

export default function LanguageToggle({ className = '', showLabel = false, isLargeIcon = false }) {
  const { lang, switchLanguage, t } = useLanguage();
  const isIndo = lang === 'id';
  const toggleBgSize = isLargeIcon ? 'h-7 w-15' : 'h-6 w-11';
  const buttonSize = isLargeIcon ? 'h-6 w-7' : 'h-5 w-5';
  const buttonMove = isLargeIcon ? 'translate-x-7' : 'translate-x-5';
  const textSize = isLargeIcon ? 'text-sm' : 'text-[10px]';

  const handleToggle = () => {
    switchLanguage(isIndo ? 'en' : 'id');
    window.location.reload();
  };

  return (
    <div
      className={`flex items-center justify-between text-slate-700 dark:text-slate-300 ${className}`}
    >
      {showLabel && <span className="font-medium">{t('common.language')}</span>}

      <button
        onClick={handleToggle}
        className={`relative inline-flex ${toggleBgSize} shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          isIndo ? 'bg-amber-600' : 'bg-sky-600'
        }`}
      >
        <span
          className={`pointer-events-none relative flex ${buttonSize} items-center justify-center rounded-full bg-white shadow ring-0 transform transition duration-200 ease-in-out ${
            isIndo ? 'translate-x-0' : buttonMove
          }`}
        >
          <span className={`${textSize} font-bold text-slate-700`}>{isIndo ? 'ID' : 'EN'}</span>
        </span>
      </button>
    </div>
  );
}
