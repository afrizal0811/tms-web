// File: src/components/HelpDropdown.js
'use client';

import { useEffect, useRef, useState } from 'react';

export default function HelpDropdown() {
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
        className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors flex items-center cursor-pointer"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        Help
        {/* Ikon panah bawah (chevron-down) */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={3}
          stroke="currentColor"
          className={`w-4 h-4 ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
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
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Panduan - Planner
            </a>
            <a
              href={driverUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Panduan - Driver
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
