'use client';

import { useLanguage } from '@/context/LanguageContext';
import { useEffect, useRef, useState } from 'react';

export default function LanguageSwitcher() {
  const { lang, switchLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const languages = [
    { code: 'id', label: 'Indonesia', flag: '🇮🇩' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
  ];

  // Tutup dropdown jika klik di luar
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 transition-all text-sm font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
      >
        <span>{lang === 'id' ? '🇮🇩' : '🇬🇧'}</span>
        <span className="hidden sm:inline">{lang === 'id' ? 'Indonesia' : 'English'}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 animate-in fade-in zoom-in-95 duration-100 overflow-hidden z-50">
          {languages.map((item) => (
            <button
              key={item.code}
              onClick={() => {
                switchLanguage(item.code);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-sky-50 transition-colors cursor-pointer ${
                lang === item.code ? 'text-sky-700 font-semibold bg-sky-50/50' : 'text-slate-600'
              }`}
            >
              <span className="text-lg">{item.flag}</span>
              <span>{item.label}</span>
              {lang === item.code && <span className="ml-auto text-sky-600">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
