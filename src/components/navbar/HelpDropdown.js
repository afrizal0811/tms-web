// File: src/components/HelpDropdown.js
'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function HelpDropdown() {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Hook untuk menutup dropdown saat klik di luarnya
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownRef]);

  // Ambil URL dari environment variables
  const plannerUrl = process.env.NEXT_PUBLIC_HELP_URL_PLANNER || '#';
  const driverUrl = process.env.NEXT_PUBLIC_HELP_URL_DRIVER || '#';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Tombol Pemicu Dropdown */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`text-sm font-mediumtransition-colors flex items-center cursor-pointer gap-1 ${
          isOpen ? 'text-sky-600 font-semibold' : 'text-slate-600 hover:text-slate-900'
        }`}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {t('navbar.help')}
        {/* Ikon panah bawah (chevron-down) */}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : 'rotate-0'}`}
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 8l4 4 4-4" />
        </svg>
      </button>

      {/* Menu Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-20">
          <div className="py-1">
            <a
              href={plannerUrl}
              target="_blank" // Buka di tab baru
              rel="noopener noreferrer"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-sky-50 hover:text-sky-600"
            >
              {t('navbar.planner_guide')}
            </a>
            <a
              href={driverUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-sky-50 hover:text-sky-600"
            >
              {t('navbar.driver_guide')}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
