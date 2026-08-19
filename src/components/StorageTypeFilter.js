'use client';

import { useLanguage } from '@/context/LanguageContext';
import { useEffect, useRef, useState } from 'react';

export default function StorageTypeFilter({
  selectedTypes = [],
  onApply,
  disabled = false,
  className = 'w-full xl:w-40',
}) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (val) => {
    if (val === 'ALL') onApply(['DRY', 'FROZEN']);
    else if (val === 'DRY') onApply(['DRY']);
    else if (val === 'FROZEN') onApply(['FROZEN']);
    setIsOpen(false);
  };

  const getLabel = () => {
    if (selectedTypes.includes('DRY') && selectedTypes.includes('FROZEN')) return t('common.all');
    if (selectedTypes.includes('DRY')) return 'Dry';
    if (selectedTypes.includes('FROZEN')) return 'Frozen';
    return t('common.all');
  };

  const isAll = selectedTypes.includes('DRY') && selectedTypes.includes('FROZEN');
  const isDry = selectedTypes.includes('DRY') && !selectedTypes.includes('FROZEN');
  const isFrozen = selectedTypes.includes('FROZEN') && !selectedTypes.includes('DRY');

  return (
    <div className={`relative min-w-40 ${className}`} ref={dropdownRef}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full h-[42px] pl-4 pr-10 flex items-center bg-white dark:bg-slate-800 border ${isOpen ? 'border-sky-500 ring-2 ring-sky-500/20' : 'border-gray-300 dark:border-slate-600'} rounded-lg shadow-sm text-slate-700 dark:text-slate-200 text-sm font-medium hover:border-sky-400 dark:hover:border-sky-500 transition-all ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-slate-900/50' : 'cursor-pointer'}`}
      >
        <span className="truncate block">{getLabel()}</span>
        <div className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 dark:text-slate-400 pointer-events-none">
          <svg
            className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden py-1 max-h-60 overflow-y-auto">
          <div
            onClick={() => handleSelect('ALL')}
            className={`px-4 py-2 text-sm cursor-pointer transition-colors ${isAll ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 font-bold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
          >
            {t('common.all')}
          </div>
          <div
            onClick={() => handleSelect('DRY')}
            className={`px-4 py-2 text-sm cursor-pointer transition-colors ${isDry ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 font-bold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
          >
            Dry
          </div>
          <div
            onClick={() => handleSelect('FROZEN')}
            className={`px-4 py-2 text-sm cursor-pointer transition-colors ${isFrozen ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 font-bold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
          >
            Frozen
          </div>
        </div>
      )}
    </div>
  );
}
