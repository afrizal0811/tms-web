'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';

export default function Carousel({ items = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoomedImage, setZoomedImage] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!items || items.length === 0) return null;

  const handleNext = () => setCurrentIndex((prev) => (prev === items.length - 1 ? 0 : prev + 1));
  const handlePrev = () => setCurrentIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1));

  return (
    <div className="flex flex-col w-full">
      <div className="relative w-full h-48 sm:h-56 bg-slate-100 dark:bg-slate-800 rounded-md overflow-hidden flex items-center justify-center group border border-gray-200 dark:border-slate-700">
        <Image
          src={items[currentIndex].image}
          alt={`Slide ${currentIndex}`}
          width={800}
          height={600}
          className="w-full h-full object-contain cursor-zoom-in transition-transform duration-300 hover:scale-105"
          onClick={() => setZoomedImage(items[currentIndex].image)}
        />

        <button
          onClick={handlePrev}
          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <button
          onClick={handleNext}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {items.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all ${idx === currentIndex ? 'w-4 bg-sky-500' : 'w-1.5 bg-gray-300/50'}`}
            />
          ))}
        </div>
      </div>

      <div className="mt-3 text-sm text-center text-slate-700 dark:text-slate-300 min-h-10 px-2 font-medium">
        {items[currentIndex].text}
      </div>

      {mounted &&
        zoomedImage &&
        createPortal(
          <div
            className="fixed inset-0 z-9999 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setZoomedImage(null)}
          >
            <Image
              src={zoomedImage}
              alt="Zoomed"
              width={1200}
              height={800}
              className="w-full h-full object-contain cursor-zoom-out scale-100 animate-in zoom-in-95 duration-200 p-4"
            />
            <button className="absolute top-4 right-4 text-white hover:text-gray-300 p-2 cursor-pointer">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}
