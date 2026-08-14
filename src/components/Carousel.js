'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';

export default function Carousel({ items = [], noLoop = false }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoomedIndex, setZoomedIndex] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!items || items.length === 0) return null;

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === items.length - 1;

  const handleNext = () => {
    if (noLoop && isLast) return;
    setCurrentIndex((prev) => (prev === items.length - 1 ? 0 : prev + 1));
  };

  const handlePrev = () => {
    if (noLoop && isFirst) return;
    setCurrentIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1));
  };

  const isZoomFirst = zoomedIndex === 0;
  const isZoomLast = zoomedIndex === items.length - 1;

  const handleZoomNext = (e) => {
    e.stopPropagation();
    if (noLoop && isZoomLast) return;
    setZoomedIndex((prev) => (prev === items.length - 1 ? 0 : prev + 1));
  };

  const handleZoomPrev = (e) => {
    e.stopPropagation();
    if (noLoop && isZoomFirst) return;
    setZoomedIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1));
  };

  return (
    <div className="flex flex-col w-full">
      <div className="relative w-full h-48 sm:h-56 bg-slate-100 dark:bg-slate-800 rounded-md overflow-hidden flex items-center justify-center group border border-gray-200 dark:border-slate-700">
        <Image
          src={items[currentIndex].image}
          alt={`Slide ${currentIndex}`}
          width={800}
          height={600}
          className="w-full h-full object-contain cursor-zoom-in transition-transform duration-300 hover:scale-105"
          onClick={() => setZoomedIndex(currentIndex)}
        />

        <button
          onClick={handlePrev}
          disabled={noLoop && isFirst}
          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
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
          disabled={noLoop && isLast}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
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
        zoomedIndex !== null &&
        createPortal(
          <div
            className="fixed inset-0 z-9999 bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setZoomedIndex(null)}
          >
            <div className="relative w-full h-[85vh] flex items-center justify-center">
              <Image
                src={items[zoomedIndex].image}
                alt="Zoomed"
                width={1200}
                height={800}
                className="w-full h-full object-contain cursor-zoom-out scale-100 animate-in zoom-in-95 duration-200 p-4"
              />
              <button
                onClick={handleZoomPrev}
                disabled={noLoop && isZoomFirst}
                className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-2 md:p-3 rounded-full backdrop-blur-md transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg
                  className="w-6 h-6 md:w-8 md:h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <button
                onClick={handleZoomNext}
                disabled={noLoop && isZoomLast}
                className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-2 md:p-3 rounded-full backdrop-blur-md transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg
                  className="w-6 h-6 md:w-8 md:h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>

            <div
              className="mt-4 text-white text-base md:text-lg text-center max-w-3xl px-6 py-3 bg-black/50 rounded-lg backdrop-blur-sm"
              onClick={(e) => e.stopPropagation()}
            >
              {items[zoomedIndex].text}
            </div>

            <button className="absolute top-4 right-4 text-white hover:text-gray-300 p-2 cursor-pointer bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-all">
              <svg
                className="w-6 h-6 md:w-8 md:h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
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
