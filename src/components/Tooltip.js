'use client';

// 1. Impor 'cloneElement' dan 'Children' dari React
import { Children, cloneElement, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// 'children' sekarang kembali menjadi elemen JSX (bukan fungsi)
export default function Tooltip({ children, tooltipContent }) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null); // Ref ini akan kita "suntikkan"
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
      // Mengakses .current di dalam event handler (SETELAH render)
      // ini 100% aman dan tidak akan menyebabkan error
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
      });
      setIsVisible(true);
    }, 150);
  };

  const handleMouseLeave = () => {
    clearTimer();
    setIsVisible(false);
  };

  // useEffect untuk scroll/resize (tidak berubah)
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

  // 2. Siapkan props yang akan "disuntikkan"
  const triggerProps = {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    ref: triggerRef, // Teruskan ref
  };

  // 3. Render
  return (
    <>
      {/* cloneElement mengambil 'children' (hanya 1) 
        dan menambahkan 'triggerProps' ke dalamnya.
        Ini akan berhasil untuk <tr>, <div>, <button>, dll.
      */}
      {cloneElement(Children.only(children), triggerProps)}

      {/* Portal (tidak berubah) */}
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
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            {tooltipContent}
            {/* Segitiga */}
            <div
              className="
              absolute left-1/2 top-full -translate-x-1/2 
              w-0 h-0 
              border-x-4 border-x-transparent 
              border-t-4 border-t-slate-800
            "
            />
          </div>,
          document.body
        )}
    </>
  );
}
