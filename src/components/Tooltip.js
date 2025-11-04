// File: src/components/Tooltip.js
'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom'; // 1. Impor createPortal

export default function Tooltip({ children, tooltipContent }) {
  const [isVisible, setIsVisible] = useState(false);
  // State baru untuk menyimpan posisi X dan Y
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null); // Ref untuk elemen pemicu
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
      // 2. Ambil posisi elemen pemicu di layar
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();

      // 3. Atur posisi tooltip
      setPosition({
        // Pusatkan secara vertikal: posisi atas + setengah tinggi elemen
        top: rect.top + rect.height / 2,
        // Posisikan di kanan: posisi kanan + 8px margin
        left: rect.right + 8,
      });

      setIsVisible(true);
    }, 150); // Delay 150ms
  };

  const handleMouseLeave = () => {
    clearTimer();
    setIsVisible(false);
  };

  // 4. Sembunyikan tooltip jika pengguna scroll atau resize
  useEffect(() => {
    const hideTooltip = () => setIsVisible(false);
    // 'true' (mode capture) penting untuk mendeteksi scroll di dalam container
    window.addEventListener('scroll', hideTooltip, true);
    window.addEventListener('resize', hideTooltip, true);

    // Cleanup
    return () => {
      window.removeEventListener('scroll', hideTooltip, true);
      window.removeEventListener('resize', hideTooltip, true);
      clearTimer(); // Hapus timer saat komponen unmount
    };
  }, []);

  return (
    // 5. Elemen pemicu (span, div, dll.) sekarang mendapat ref
    <div
      ref={triggerRef}
      className="relative inline-block" // 'relative' tidak lagi wajib, tapi tidak masalah
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Ini adalah elemen pemicu Anda (misal: "FROZEN-CDE...") */}
      {children}

      {/* 6. Gunakan Portal untuk merender tooltip di <body> */}
      {isVisible &&
        createPortal(
          <div
            className="
            fixed z-50 
            w-48 
            whitespace-pre-line 
            px-3 py-1.5 
            text-xs font-medium text-white 
            bg-slate-800 
            rounded-md shadow-lg
          "
            // 7. Terapkan posisi dari state menggunakan 'style'
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
              transform: 'translateY(-50%)', // Trik CSS untuk memusatkan vertikal
            }}
          >
            {tooltipContent}
            {/* Segitiga kecil di kiri (tetap sama) */}
            <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-y-4 border-y-transparent border-r-4 border-r-slate-800" />
          </div>,
          document.body // Teleportasi ke <body>
        )}
    </div>
  );
}
