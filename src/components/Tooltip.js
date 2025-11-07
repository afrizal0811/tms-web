'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function Tooltip({ children, tooltipContent }) {
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
    timeoutRef.current = setTimeout(() => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();

      // --- PERUBAHAN LOGIKA POSISI ---
      setPosition({
        // Posisikan 8px di ATAS elemen
        top: rect.top - 8,
        // Posisikan di TENGAH horizontal elemen
        left: rect.left + rect.width / 2,
      });
      // --- AKHIR PERUBAHAN ---

      setIsVisible(true);
    }, 150);
  };

  const handleMouseLeave = () => {
    clearTimer();
    setIsVisible(false);
  };

  useEffect(() => {
    const hideTooltip = () => setIsVisible(false);
    window.addEventListener('scroll', hideTooltip, true);
    window.addEventListener('resize', hideTooltip, true);

    return () => {
      window.removeEventListener('scroll', hideTooltip, true);
      window.removeEventListener('resize', hideTooltip, true);
      clearTimer();
    };
  }, []);

  return (
    <div
      ref={triggerRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {isVisible &&
        createPortal(
          <div
            className="
            fixed z-50 
            w-48 
            whitespace-pre-line 
            px-3 py-1.5 
            text-xs font-medium text-white 
            bg-sky-800 
            rounded-md shadow-lg
          "
            // --- PERUBAHAN STYLE POSISI ---
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
              // Trik CSS:
              // 1. Geser ke kiri 50% dari LEBAR TOOLTIP (untuk center)
              // 2. Geser ke atas 100% dari TINGGI TOOLTIP (untuk menempatkan di atas)
              transform: 'translate(-50%, -100%)',
            }}
            // --- AKHIR PERUBAHAN ---
          >
            {tooltipContent}

            {/* --- PERUBAHAN SEGITIGA (Arrow) --- */}
            {/* Sekarang di bawah, menunjuk ke bawah */}
            <div
              className="
              absolute left-1/2 top-full -translate-x-1/2 
              w-0 h-0 
              border-x-4 border-x-transparent 
              border-t-4 border-t-sky-800
            "
            />
            {/* --- AKHIR PERUBAHAN --- */}
          </div>,
          document.body
        )}
    </div>
  );
}
