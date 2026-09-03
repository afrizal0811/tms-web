'use client';

import { useLanguage } from '@/context/LanguageContext';
import { formatTimer } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';

export default function Spinner({
  addClass = '',
  border = 'border-4 border-gray-200 dark:border-gray-400',
  colorClass = 'border-t-sky-600 dark:border-t-slate-700',
  size = 'w-16 h-16',
  showTimer = true,
  timerStyle = 'text-sm font-mono font-bold text-sky-600',
}) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(null);
  const { t } = useLanguage();
  useEffect(() => {
    if (!showTimer) return;

    startRef.current = Date.now();
    setElapsed(Math.floor((Date.now() - startRef.current) / 1000));

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [showTimer]);

  return (
    <div
      className={`relative flex items-center justify-center ${size} animate-in fade-in duration-200`}
    >
      <div
        className={`
          absolute
          ${addClass}
          ${border}
          ${colorClass} 
          ${size} 
          animate-spin
          rounded-full 
        `}
      />
      {showTimer && <span className={timerStyle}>{formatTimer(elapsed)}</span>}
    </div>
  );
}
