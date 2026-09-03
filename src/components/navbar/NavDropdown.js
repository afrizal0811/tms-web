'use client';

import { useLanguage } from '@/context/LanguageContext';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

const DROPDOWN_LINK_CLASS =
  'block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-slate-700 hover:text-sky-600 dark:hover:text-sky-400';

export default function NavDropdown({ label, links, isSuperadmin, isAdmin }) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredLinks = (links || []).filter(
    (link) => !link.superadminOnly || isSuperadmin || (link.adminAllowed && isAdmin)
  );

  if (filteredLinks.length === 0) return null;

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((s) => !s)}
        className={`flex items-center gap-1 text-sm font-medium transition-colors px-1 py-2 rounded-md cursor-pointer ${
          isOpen
            ? 'text-sky-600 dark:text-sky-400 font-semibold'
            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
        }`}
      >
        <span>{label}</span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 8l4 4 4-4" />
        </svg>
      </button>

      <div
        className={`absolute left-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md shadow-lg z-50 overflow-hidden transition-all duration-200 origin-top ${
          isOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible'
        }`}
      >
        <div>
          {filteredLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={DROPDOWN_LINK_CLASS}
              onClick={() => setIsOpen(false)}
            >
              {t(link.labelKey)}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
