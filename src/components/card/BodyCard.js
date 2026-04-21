// File: src/components/card/BodyCard.js
'use client';

import Spinner from '@/components/Spinner';
import TabButton from '@/components/table/TabButton';
import { useLanguage } from '@/context/LanguageContext';
import { formatTimer } from '@/lib/utils';
import { useCallback, useEffect, useRef, useState } from 'react';
const LoadingState = ({ elapsed, text }) => (
  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-900/80 space-y-4 animate-in fade-in duration-200">
    <Spinner />
    <div className="text-center space-y-1">
      <p className="text-lg font-medium text-slate-700 dark:text-slate-300">{text}</p>
      <p className="text-2xl font-mono font-bold text-sky-600">{formatTimer(elapsed)}</p>
    </div>
  </div>
);

export default function BodyCard({
  children,
  isLoading = false,
  loadingText = '',
  isEmpty = false,
  emptyMessage,
  tabs = [],
  activeTabId,
  onTabClick,
  customHeader = null,
  longLoadingContent = null,
  timerStartTime = null,
}) {
  const { t } = useLanguage();
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const startTimeRef = useRef(null);
  const cardWrapperRef = useRef(null);
  const isHintDismissedRef = useRef(false);

  const message = emptyMessage ? emptyMessage : t('common.no_data');
  const isHasTabs = tabs && tabs.length > 0;

  const checkScrollState = useCallback((target) => {
    if (!target) return;

    // Jika user sudah pernah mentok bawah, jangan munculkan lagi
    if (isHintDismissedRef.current) {
      setShowScrollHint(false);
      return;
    }

    const isScrollable =
      target.scrollHeight > target.clientHeight && target.scrollHeight - target.clientHeight > 50;
    const isAtBottom =
      Math.ceil(target.scrollTop + target.clientHeight) >= target.scrollHeight - 10;

    if (isAtBottom) {
      isHintDismissedRef.current = true; // Tandai sudah dibaca
      setShowScrollHint(false);
    } else {
      setShowScrollHint(isScrollable);
    }
  }, []);

  const scanForScrollableChild = useCallback(() => {
    const wrapper = cardWrapperRef.current;
    if (!wrapper) return;

    // Cari anak elemen yang punya overflow dan isinya kepanjangan
    const scrollableChild = Array.from(wrapper.querySelectorAll('*')).find(
      (el) => el.scrollHeight > el.clientHeight && getComputedStyle(el).overflowY !== 'hidden'
    );

    if (scrollableChild) {
      checkScrollState(scrollableChild);
    } else {
      setShowScrollHint(false);
    }
  }, [checkScrollState]);

  // --- 2. EFFECT UTAMA (Baru dipanggil setelah fungsi didefinisikan) ---

  // Effect: Reset ingatan saat ganti Tab
  useEffect(() => {
    isHintDismissedRef.current = false;
    scanForScrollableChild();
  }, [activeTabId, scanForScrollableChild]); // <-- Dependency sudah lengkap

  // Effect: Event Listener & Resize Observer
  useEffect(() => {
    const wrapper = cardWrapperRef.current;
    if (!wrapper) return;

    const handleCaptureScroll = (e) => {
      checkScrollState(e.target);
    };
    // Capture phase = true agar bisa deteksi scroll anak
    wrapper.addEventListener('scroll', handleCaptureScroll, true);

    const resizeObserver = new ResizeObserver(() => {
      scanForScrollableChild();
    });

    resizeObserver.observe(wrapper);
    if (wrapper.firstElementChild) {
      resizeObserver.observe(wrapper.firstElementChild);
    }

    const t = setTimeout(scanForScrollableChild, 500);

    return () => {
      wrapper.removeEventListener('scroll', handleCaptureScroll, true);
      resizeObserver.disconnect();
      clearTimeout(t);
    };
  }, [children, isLoading, checkScrollState, scanForScrollableChild]);

  // --- 3. LOGIC TIMER ---
  useEffect(() => {
    let interval = null;
    if (isLoading) {
      if (timerStartTime) {
        startTimeRef.current = timerStartTime;
      } else if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
      }
      setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
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
  }, [isLoading, timerStartTime]);

  const renderHeader = () => {
    if (customHeader) {
      return (
        <div className="flex items-center border-b border-gray-200 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-800 rounded-t-xl transition-colors">
          {customHeader}
        </div>
      );
    }
    if (isHasTabs) {
      return (
        <div className="flex overflow-x-auto border-b border-gray-200 dark:border-slate-700 px-2 scrollbar-hide relative bg-white dark:bg-slate-800 rounded-t-xl shrink-0 transition-colors">
          {tabs.map((tab) => (
            <TabButton
              isActive={activeTabId === tab.id}
              key={tab.id}
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
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col w-full h-[600px] relative group transition-colors duration-200">
      {renderHeader()}

      <div
        ref={cardWrapperRef}
        className="flex-1 p-0 flex flex-col relative rounded-b-xl bg-white overflow-hidden"
      >
        {isLoading ? (
          <>
            <LoadingState elapsed={elapsedTime} text={loadingText || t('common.loading')} />
            {longLoadingContent && elapsedTime > 120 && (
              <div className="absolute top-36 left-0 right-0 z-50 flex justify-center pointer-events-none">
                <div className="pointer-events-auto">{longLoadingContent}</div>
              </div>
            )}
          </>
        ) : isEmpty ? (
          <div
            className={`flex-1 flex items-center justify-center bg-gray-50 border border-gray-300 text-gray-400 m-0 ${isHasTabs ? 'rounded-b-xl' : 'rounded-xl'}`}
          >
            <p>{message}</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 w-full">{children}</div>
        )}
      </div>

      {/* --- SCROLL HINT OVERLAY --- */}
      {!isLoading && !isEmpty && showScrollHint && (
        // Menggunakan bg-linear-to-t sesuai warning linter terbaru
        <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none z-20 flex flex-col justify-end items-center pb-4 rounded-b-xl transition-opacity duration-300 animate-in fade-in">
          <div className="flex flex-col items-center animate-bounce">
            <span className="text-[10px] uppercase font-bold tracking-widest text-sky-600 dark:text-sky-400 mb-1 bg-white/50 dark:bg-slate-800/80 px-2 rounded backdrop-blur-sm">
              {t('common.scroll_down')}
            </span>
            <div className="bg-white dark:bg-slate-800 rounded-full p-1.5 shadow-sm border border-slate-100 dark:border-slate-700">
              <svg
                className="h-4 w-4 text-sky-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M19 9l-7 7-7-7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                />
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
