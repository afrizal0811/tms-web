'use client';

import { useEffect, useRef, useState } from 'react';

export default function Accordion({
  title,
  children,
  defaultOpen = false,
  isOpen: controlledIsOpen,
  onToggle,
  isFloating = false,
  className = '',
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalOpen;
  const containerRef = useRef(null);

  const handleToggle = () => {
    if (onToggle) onToggle(!isOpen);
    else setInternalOpen(!isOpen);
  };

  useEffect(() => {
    if (!isFloating || !isOpen) return;

    function handleClickOutside(event) {
      if (
        event.target.closest('[role="dialog"]') ||
        event.target.closest('.swal2-container') ||
        event.target.closest('.toast')
      ) {
        return;
      }
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        if (onToggle) onToggle(false);
        else setInternalOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        if (onToggle) onToggle(false);
        else setInternalOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFloating, isOpen, onToggle]);

  if (isFloating) {
    return (
      <div className={`relative ${className}`} ref={containerRef}>
        <button
          type="button"
          onClick={handleToggle}
          className={`w-full flex justify-between items-center px-4 py-2.5 sm:py-3 bg-gray-50/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-sky-50/60 dark:hover:bg-slate-700/60 transition-colors cursor-pointer outline-none border border-gray-200 dark:border-slate-700 rounded-lg ${
            isOpen ? 'border-sky-500/50 ring-2 ring-sky-500/10' : ''
          }`}
        >
          <div className="font-semibold text-sm flex items-center">{title}</div>
          <svg
            className={`w-4 h-4 transition-transform duration-300 text-slate-500 shrink-0 ml-2 ${
              isOpen ? 'rotate-180 text-sky-600 dark:text-sky-400' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute left-0 right-0 top-full mt-1.5 z-40 p-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl animate-in fade-in slide-in-from-top-1 duration-200">
            {children}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 transition-colors ${
        isOpen ? 'overflow-visible' : 'overflow-hidden'
      } ${className}`}
    >
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex justify-between items-center px-4 py-2.5 sm:py-3 bg-gray-50/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-sky-50/60 dark:hover:bg-slate-700/60 transition-colors cursor-pointer outline-none"
      >
        <div className="font-semibold text-sm flex items-center">{title}</div>
        <svg
          className={`w-4 h-4 transition-transform duration-300 text-slate-500 shrink-0 ml-2 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`transition-all duration-300 ease-in-out origin-top ${
          isOpen
            ? 'max-h-[1000px] opacity-100 overflow-visible'
            : 'max-h-0 opacity-0 overflow-hidden'
        }`}
      >
        <div className="p-4 border-t border-gray-200 dark:border-slate-700">{children}</div>
      </div>
    </div>
  );
}
