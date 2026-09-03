'use client';

import { useEffect, useRef, useState } from 'react';

export default function Dropdown({
  options = [],
  value,
  onChange,
  getLabel,
  disabled = false,
  className = 'w-full',
  placement = 'bottom',
  isAutocomplete = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  const filteredOptions = isAutocomplete
    ? options.filter((opt) => opt.label.toLowerCase().includes(searchTerm.toLowerCase()))
    : options;

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
    setSearchTerm('');
  };

  const displayValue = getLabel ? getLabel(value) : value;

  return (
    <div
      className={`relative ${className.includes('min-w') ? '' : 'min-w-40'} ${className}`}
      ref={dropdownRef}
    >
      <div
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            if (isOpen) setSearchTerm('');
          }
        }}
        className={`w-full h-[42px] pl-4 pr-10 flex items-center bg-white dark:bg-slate-800 border ${isOpen ? 'border-sky-500 ring-2 ring-sky-500/20' : 'border-gray-300 dark:border-slate-600'} rounded-lg shadow-sm text-slate-700 dark:text-slate-200 text-sm font-medium hover:border-sky-400 dark:hover:border-sky-500 transition-all ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-slate-900/50' : 'cursor-pointer'}`}
      >
        <span className="truncate block">{displayValue}</span>
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
        <div
          className={`absolute z-50 w-full flex flex-col ${placement === 'top' ? 'bottom-full mb-1' : 'mt-1'} bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg py-1 max-h-60`}
        >
          {isAutocomplete && (
            <div className="px-2 pb-2 pt-1 border-b border-gray-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10 shrink-0">
              <input
                type="text"
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500"
                placeholder="Cari..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
          <div className="overflow-y-auto flex-1 py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected =
                  value === opt.value ||
                  (Array.isArray(value) &&
                    value.join(',') ===
                      (Array.isArray(opt.value) ? opt.value.join(',') : opt.value));

                return (
                  <div
                    key={opt.value}
                    onClick={() => handleSelect(opt.value)}
                    className={`px-4 py-2 text-sm cursor-pointer transition-colors ${isSelected ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 font-bold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                  >
                    {opt.label}
                  </div>
                );
              })
            ) : (
              <div className="px-4 py-3 text-sm text-gray-400 dark:text-slate-500 text-center italic">
                Data tidak ditemukan
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
