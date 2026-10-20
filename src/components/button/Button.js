'use client';

import { formatTimer } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';
import Spinner from '../Spinner';

export default function Button({
  onClick,
  isLoading = false,
  disabled = false,
  width = 'w-full',
  text = 'Button',
  icon = null,
  type = 'button',
  className = 'bg-sky-600 text-white border border-sky-800/60 hover:bg-sky-700 dark:bg-sky-500 dark:border-sky-400/40 dark:hover:bg-sky-400',
  size = 'lg',
  options = [],
  ...rest
}) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [prevLoading, setPrevLoading] = useState(isLoading);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const isSplit = type === 'split';

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-2.5 text-base',
  };

  const chevronPadding = {
    sm: 'px-2 py-1.5',
    md: 'px-2.5 py-2',
    lg: 'px-3 py-2.5',
  };

  if (isLoading !== prevLoading) {
    setPrevLoading(isLoading);
    if (!isLoading) setElapsedTime(0);
  }

  useEffect(() => {
    if (!isLoading) return;

    const start = Date.now();
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - start) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    if (!isSplit) return;

    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSplit, isMenuOpen]);

  const isDisabled = disabled || isLoading;

  // Render Split Button
  if (isSplit) {
    return (
      <div ref={menuRef} className={`relative inline-flex ${width} max-w-full rounded-md shadow-sm`}>
        <button
          type="button"
          onClick={onClick}
          disabled={isDisabled}
          title={typeof text === 'string' ? text : undefined}
          {...rest}
          className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 font-semibold rounded-l-md transition-all cursor-pointer whitespace-nowrap disabled:cursor-not-allowed disabled:bg-slate-300 disabled:border-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:border-slate-700 dark:disabled:text-slate-500 ${sizeClasses[size]} ${className}`}
        >
          {isLoading ? (
            <>
              <Spinner
                addClass="inline-block"
                border="border-2 border-sky-200 border-t-white"
                size="w-4 h-4"
                showTimer={false}
              />
              <span>{formatTimer(elapsedTime)}</span>
            </>
          ) : (
            <>
              {icon && <span className="shrink-0">{icon}</span>}
              <span className="truncate">{text}</span>
            </>
          )}
        </button>

        {/* Pemisah Vertikal */}
        <div className="w-px bg-white/25 dark:bg-white/15 shrink-0" />

        {/* Tombol Chevron Dropdown */}
        <button
          type="button"
          onClick={() => !isDisabled && setIsMenuOpen((prev) => !prev)}
          disabled={isDisabled}
          aria-expanded={isMenuOpen}
          aria-haspopup="true"
          aria-label="Opsi lainnya"
          className={`shrink-0 flex items-center justify-center rounded-r-md transition-all cursor-pointer disabled:cursor-not-allowed disabled:bg-slate-300 disabled:border-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:border-slate-700 dark:disabled:text-slate-500 ${chevronPadding[size]} ${className}`}
        >
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : 'rotate-0'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {/* Menu Dropdown */}
        {isMenuOpen && options.length > 0 && (
          <div className="absolute right-0 top-full mt-1.5 z-50 w-max max-w-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden py-1 transition-all animate-in fade-in zoom-in-95 duration-150">
            {options.map((option, idx) => (
              <button
                key={option.id || idx}
                type="button"
                disabled={option.disabled || isDisabled}
                onClick={() => {
                  setIsMenuOpen(false);
                  if (option.onClick) option.onClick();
                }}
                className={`w-full px-3.5 flex text-left hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap gap-2.5 ${
                  option.description ? 'items-start py-2.5' : 'items-center py-2'
                }`}
              >
                {option.icon && (
                  <div className="shrink-0 text-sky-600 dark:text-sky-400">{option.icon}</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                    {option.label}
                  </div>
                  {option.description && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {option.description}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Render Regular Button
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      title={typeof text === 'string' ? text : undefined}
      {...rest}
      className={`${width} max-w-full cursor-pointer ${sizeClasses[size]} flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-semibold shadow-sm transition-all dark:shadow-sky-950/40 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:border-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:border-slate-700 dark:disabled:text-slate-500 ${className}`}
    >
      {isLoading ? (
        <>
          <Spinner
            addClass="inline-block"
            border="border-2 border-sky-200 border-t-white"
            size="w-5 h-5"
            showTimer={false}
          />
          <span>{formatTimer(elapsedTime)}</span>
        </>
      ) : (
        <>
          {icon && <span className="flex items-center justify-center shrink-0">{icon}</span>}
          <span className="truncate">{text}</span>
        </>
      )}
    </button>
  );
}
