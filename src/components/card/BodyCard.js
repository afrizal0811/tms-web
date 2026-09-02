'use client';

import Spinner from '@/components/Spinner';
import TabButton from '@/components/table/TabButton';
import { useLanguage } from '@/context/LanguageContext';
import { useCallback, useEffect, useRef, useState } from 'react';
import RouteInfoButton from '../button/RouteInfoButton';

export default function BodyCard({
  children,
  isLoading = false,
  isEmpty = false,
  emptyMessage,
  tabs = [],
  activeTabId,
  onTabClick,
  customHeader = null,
  longLoadingContent = null,
  routingData = null,
}) {
  const { t } = useLanguage();
  const [showScrollHint, setShowScrollHint] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prevIsLoading, setPrevIsLoading] = useState(isLoading);
  const cardWrapperRef = useRef(null);
  const isHintDismissedRef = useRef(false);

  if (isLoading !== prevIsLoading) {
    setPrevIsLoading(isLoading);
    if (!isLoading) {
      setLoading(false);
    }
  }

  const message = emptyMessage ? emptyMessage : t('common.no_data');
  const isHasTabs = tabs && tabs.length > 0;

  const checkScrollState = useCallback((target) => {
    if (!target) return;

    if (isHintDismissedRef.current) {
      setShowScrollHint(false);
      return;
    }

    const isScrollable =
      target.scrollHeight > target.clientHeight && target.scrollHeight - target.clientHeight > 50;
    const isAtBottom =
      Math.ceil(target.scrollTop + target.clientHeight) >= target.scrollHeight - 10;

    if (isAtBottom) {
      isHintDismissedRef.current = true;
      setShowScrollHint(false);
    } else {
      setShowScrollHint(isScrollable);
    }
  }, []);

  const scanForScrollableChild = useCallback(() => {
    const wrapper = cardWrapperRef.current;
    if (!wrapper) return;

    const scrollableChild = Array.from(wrapper.querySelectorAll('*')).find(
      (el) => el.scrollHeight > el.clientHeight && getComputedStyle(el).overflowY !== 'hidden'
    );

    if (scrollableChild) {
      checkScrollState(scrollableChild);
    } else {
      setShowScrollHint(false);
    }
  }, [checkScrollState]);

  useEffect(() => {
    isHintDismissedRef.current = false;
    scanForScrollableChild();
  }, [activeTabId, scanForScrollableChild]);

  useEffect(() => {
    const wrapper = cardWrapperRef.current;
    if (!wrapper) return;

    const handleCaptureScroll = (e) => {
      checkScrollState(e.target);
    };
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

  useEffect(() => {
    if (!isLoading || !longLoadingContent) return;

    const timeout = setTimeout(() => {
      setLoading(true);
    }, 120000);

    return () => clearTimeout(timeout);
  }, [isLoading, longLoadingContent]);

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
        <div className="flex overflow-x-auto border-b border-gray-200 dark:border-slate-700 px-2 scrollbar-hide relative bg-white dark:bg-slate-900 rounded-t-xl shrink-0 transition-colors">
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
    <div>
      <div
        className={`bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 flex flex-col w-full h-[600px] relative group transition-colors duration-200 overflow-hidden`}
      >
        {renderHeader()}

        <div
          ref={cardWrapperRef}
          className="flex-1 p-0 flex flex-col relative rounded-b-xl bg-white dark:bg-slate-800 overflow-hidden"
        >
          {isLoading ? (
            <>
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-800 dark:border-slate-700 space-y-4 animate-in fade-in duration-200">
                <Spinner />
              </div>
              {loading && longLoadingContent && (
                <div className="absolute top-30 left-0 right-0 z-50 flex justify-center pointer-events-none">
                  <div className="pointer-events-auto">{longLoadingContent}</div>
                </div>
              )}
            </>
          ) : isEmpty ? (
            <div
              className={`flex-1 flex items-center justify-center bg-gray-50 border border-gray-300 text-gray-400 m-0 dark:bg-slate-800 dark:border-slate-700 ${isHasTabs ? 'rounded-b-xl' : 'rounded-xl'}`}
            >
              <p>{message}</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 w-full">{children}</div>
          )}
        </div>

        {!isLoading && !isEmpty && showScrollHint && (
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
      {routingData && <RouteInfoButton resultsData={routingData} />}
    </div>
  );
}
