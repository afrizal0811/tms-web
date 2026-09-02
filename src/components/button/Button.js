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
  className = '',
  options = [],
  size = 'lg',
  ...rest
}) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [prevLoading, setPrevLoading] = useState(isLoading);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const sizeClasses = {
    sm: 'px-3 text-xs',
    md: 'px-4 text-sm',
    lg: 'px-6 text-base',
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

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      {...rest}
      className={`${width} cursor-pointer py-2 ${sizeClasses[size]} flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-semibold shadow-sm transition-all bg-sky-600 text-white border border-sky-800/60 hover:bg-sky-700 dark:bg-sky-500 dark:border-sky-400/40 dark:hover:bg-sky-400 dark:shadow-sky-950/40 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:border-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:border-slate-700 dark:disabled:text-slate-500 ${className}`}
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
          {icon && <span className="flex items-center justify-center">{icon}</span>}
          <span>{text}</span>
        </>
      )}
    </button>
  );
}
