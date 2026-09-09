'use client';

import { formatTimer } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';

export default function Spinner({ size = 'w-16 h-16', showTimer = true, startTime }) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(null);
  useEffect(() => {
    if (!showTimer) return;

    startRef.current = startTime || Date.now();
    setElapsed(Math.floor((Date.now() - startRef.current) / 1000));

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [showTimer, startTime]);

  return (
    <div
      className={`relative flex items-center justify-center ${size} animate-in fade-in duration-200`}
    >
      <div
        className={`absolute border-4 border-gray-200 dark:border-slate-400 border-t-sky-600 dark:border-t-sky-700 ${size} animate-spin rounded-full `}
      />
      {showTimer && (
        <span className="text-sm font-mono font-bold text-sky-600 dark:text-slate-300">
          {formatTimer(elapsed)}
        </span>
      )}
    </div>
  );
}
