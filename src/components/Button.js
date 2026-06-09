'use client';

import { formatTimer } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';
import Spinner from './Spinner';

export default function Button({
  onClick,
  isLoading = false,
  disabled = false,
  width = 'w-full',
  text = 'Button',
  icon = null,
  type = 'button',
  className = '',
  hasOptions = false,
  options = [],
  ...rest
}) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [prevLoading, setPrevLoading] = useState(isLoading);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

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
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const isDisabled = disabled || isLoading;

  if (hasOptions) {
    return (
      <div ref={menuRef} className={`relative flex items-center ${width}`}>
        <button
          type={type}
          onClick={onClick}
          disabled={isDisabled}
          {...rest}
          className={`
            flex-1 cursor-pointer px-4 h-[42px] flex items-center justify-center gap-2 whitespace-nowrap rounded-l-md font-semibold shadow-sm transition-all bg-sky-600 text-white border border-r-0 border-sky-800/60 hover:bg-sky-700 dark:text-white dark:hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:border-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:border-slate-700 dark:disabled:text-slate-500 ${className}
          `}
        >
          {isLoading ? (
            <>
              <Spinner
                addClass="inline-block"
                border="border-2 border-sky-200 border-t-white dark:border-sky-200 dark:border-t-white"
                size="w-5 h-5"
              />
              <span>{formatTimer(elapsedTime)}</span>
            </>
          ) : (
            <>
              {icon && <span className="flex items-center justify-center">{icon}</span>}
              <span>{text}</span>
            </>
          )}
        </button>

        <button
          type="button"
          disabled={isDisabled}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="h-[42px] px-2.5 flex items-center justify-center bg-sky-600 text-white border border-sky-800/60 hover:bg-sky-700 rounded-r-md disabled:cursor-not-allowed disabled:bg-slate-300 disabled:border-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:border-slate-700 dark:disabled:text-slate-500 transition-colors cursor-pointer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className={`w-4 h-4 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {isMenuOpen && options.length > 0 && (
          <div className="absolute right-0 top-[46px] z-50 min-w-[120px] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md shadow-lg py-1 animate-in fade-in zoom-in-95 duration-100">
            {options.map((option, index) => (
              <button
                key={index}
                type="button"
                onClick={() => {
                  option.onClick();
                  setIsMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      {...rest}
      className={`
        ${width} cursor-pointer px-6 h-[42px] flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-semibold shadow-sm transition-all bg-sky-600 text-white border border-sky-800/60 hover:bg-sky-700 dark:text-white dark:hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:border-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:border-slate-700 dark:disabled:text-slate-500 ${className}
      `}
    >
      {isLoading ? (
        <>
          <Spinner
            addClass="inline-block"
            border="border-2 border-sky-200 border-t-white dark:border-sky-200 dark:border-t-white"
            size="w-5 h-5"
          />
          <span>{formatTimer(elapsedTime)}</span>
        </>
      ) : (
        <>
          {icon && <span className="flex items-center justify-center">{icon}</span>}
          <span>{text}</span>
        </>
      )}
    </button>
  );
}
