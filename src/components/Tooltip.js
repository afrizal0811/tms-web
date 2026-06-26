'use client';

import { isEmpty } from '@/lib/utils';
import { Children, cloneElement, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
export default function Tooltip({ children, tooltipContent, width = 'w-max' }) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const timeoutRef = useRef(null);

  const clearTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const handleMouseEnter = () => {
    clearTimer();
    // Delay sedikit agar tidak flicker
    timeoutRef.current = setTimeout(() => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();

      // Hitung posisi agar muncul di atas elemen
      setPosition({
        top: rect.top - 10, // Geser ke atas sedikit
        left: rect.left + rect.width / 2,
      });
      setIsVisible(true);
    }, 150);
  };

  const handleMouseLeave = () => {
    clearTimer();
    setIsVisible(false);
  };

  const hideTooltip = () => setIsVisible(false);

  useEffect(() => {
    window.addEventListener('scroll', hideTooltip, true);
    window.addEventListener('resize', hideTooltip, true);
    return () => {
      window.removeEventListener('scroll', hideTooltip, true);
      window.removeEventListener('resize', hideTooltip, true);
      clearTimer();
    };
  }, []);

  const triggerProps = {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    ref: triggerRef,
  };

  return (
    <>  
      {cloneElement(Children.only(children), triggerProps)}

      {isVisible && !isEmpty(tooltipContent)
        ? createPortal(
            <div
              className={`fixed z-99999 ${width} max-w-xs whitespace-pre-line px-3 py-2 text-xs font-medium text-white bg-slate-800 dark:bg-slate-700 rounded-md shadow-xl border border-slate-600 dark:border-slate-500 pointer-events-none transition-colors`}
              style={{
                top: `${position.top}px`,
                left: `${position.left}px`,
                transform: 'translate(-50%, -100%)', // Geser ke atas tengah
              }}
            >
              {tooltipContent}

              {/* Segitiga Kecil di Bawah Tooltip */}
              <div
                className="
              absolute left-1/2 top-full -translate-x-1/2 
              border-4 border-transparent border-t-slate-800 dark:border-t-slate-700
              transition-colors
            "
              />
            </div>,
            document.body
          )
        : null}
    </>
  );
}
