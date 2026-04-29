'use client';

import { useEffect, useRef, useState } from 'react';

export default function ImageLightbox({ src, alt, onClose }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const dragStart = useRef({ x: 0, y: 0 });
  const isMoved = useRef(false);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'auto';
    };
  }, [onClose]);

  // Zoom via Scroll
  const handleWheel = (e) => {
    e.stopPropagation();
    const zoomIntensity = 0.1;
    const direction = e.deltaY < 0 ? 1 : -1;
    let newScale = scale + direction * zoomIntensity * scale;
    newScale = Math.min(Math.max(1, newScale), 5); // Batas 1x - 5x

    setScale(newScale);

    if (newScale === 1) {
      setPosition({ x: 0, y: 0 });
    }
  };

  // Zoom via Klik
  const handleImageClick = (e) => {
    e.stopPropagation();
    if (isMoved.current) return;

    if (scale === 1) {
      setScale(2.5);
    } else {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  };

  // Drag Logic
  const onMouseDown = (e) => {
    if (scale <= 1) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    isMoved.current = false;
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const onMouseMove = (e) => {
    if (!isDragging || scale <= 1) return;
    e.preventDefault();
    isMoved.current = true;
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const onMouseUp = () => {
    setIsDragging(false);
  };

  if (!src) return null;

  return (
    <div
      style={{ zIndex: 9999 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center overflow-hidden animate-in fade-in duration-200"
      onClick={onClose}
      onWheel={handleWheel}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onMouseMove={onMouseMove}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-4 right-4 z-50 text-white/80 hover:text-white bg-black/40 hover:bg-black/60 rounded-full p-2 transition-colors cursor-pointer"
        title="Close (Esc)"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
          className="w-8 h-8"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="relative w-full h-full flex items-center justify-center p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          onMouseDown={onMouseDown}
          onClick={handleImageClick}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            cursor: scale === 1 ? 'zoom-in' : isDragging ? 'grabbing' : 'grab',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
          className="max-w-full max-h-screen object-contain shadow-2xl rounded-md select-none"
          draggable={false}
        />
      </div>

      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black/60 text-white px-4 py-1.5 rounded-full text-sm pointer-events-none backdrop-blur-md select-none border border-white/10">
        {scale === 1 ? 'Scroll or Click to Zoom' : 'Drag to Move • Click to Reset'}
      </div>
    </div>
  );
}
