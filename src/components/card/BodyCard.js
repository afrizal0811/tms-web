// File: src/components/Card.js
'use client';

import Spinner from '@/components/Spinner';
import TabButton from '@/components/table/TabButton';
import { formatTimer } from '@/lib/utils'; // Pastikan import formatTimer
import { useEffect, useRef, useState } from 'react';

const LoadingState = ({ elapsed, text }) => (
  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 space-y-4 animate-in fade-in duration-200">
    <Spinner />
    <div className="text-center space-y-1">
      <p className="text-lg font-medium text-slate-700">{text}</p>
      <p className="text-2xl font-mono font-bold text-sky-600">{formatTimer(elapsed)}</p>
    </div>
  </div>
);

export default function Card({
  children,
  isLoading = false,
  loadingText = 'Sedang memuat data...',
  isEmpty = false,
  emptyMessage = 'Tidak ada data ditemukan.',
  tabs = [],
  activeTabId,
  onTabClick,
  customHeader = null,
  // Prop baru untuk konten tambahan jika loading lama (misal: > 120s)
  longLoadingContent = null,
}) {
  // --- INTERNAL TIMER LOGIC ---
  const [elapsedTime, setElapsedTime] = useState(0);
  const startTimeRef = useRef(null);

  useEffect(() => {
    let interval = null;
    if (isLoading) {
      if (!startTimeRef.current) startTimeRef.current = Date.now();
      //eslint-disable-next-line
      setElapsedTime(0); // Reset visual awal

      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } else {
      setElapsedTime(0);
      startTimeRef.current = null;
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading]);
  // -----------------------------

  const renderHeader = () => {
    if (customHeader) {
      return (
        <div className="flex items-center border-b border-gray-200 shrink-0 bg-white rounded-t-xl">
          {customHeader}
        </div>
      );
    }

    if (tabs && tabs.length > 0) {
      return (
        <div className="flex overflow-x-auto border-b border-gray-200 px-2 scrollbar-hide relative bg-white rounded-t-xl shrink-0">
          {tabs.map((tab) => (
            <TabButton
              key={tab.id}
              isActive={activeTabId === tab.id}
              onClick={() => onTabClick && onTabClick(tab.id)}
            >
              <span>{tab.label}</span>
              {tab.extraContent}
            </TabButton>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col w-full h-[600px]`}
    >
      {renderHeader()}

      <div className="flex-1 p-0 overflow-hidden flex flex-col relative rounded-b-xl bg-white">
        {isLoading ? (
          <>
            <LoadingState elapsed={elapsedTime} text={loadingText} />

            {longLoadingContent && elapsedTime > 120 && (
              <div className="absolute top-36 left-0 right-0 z-50 flex justify-center pointer-events-none">
                <div className="pointer-events-auto">{longLoadingContent}</div>
              </div>
            )}
          </>
        ) : isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <p>{emptyMessage}</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full w-full overflow-hidden">{children}</div>
        )}
      </div>
    </div>
  );
}
