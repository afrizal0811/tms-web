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
  footer = null,
  isScroll = true,
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
          className={`flex-1 p-0 flex flex-col relative bg-white dark:bg-slate-800 overflow-hidden ${!footer && 'rounded-b-xl'}`}
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

        {!isLoading && !isEmpty && showScrollHint && isScroll && (
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
        {!isLoading && footer && (
          <div className="px-4 py-3 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 shadow-sm shrink-0">
            <div
              className={`${footer.text && footer.title ? 'flex flex-col justify-between gap-2 pb-1' : ''}`}
            >
              {footer.text && (
                <div className="text-xs text-slate-500 dark:text-slate-400 italic">
                  *{footer.text}
                </div>
              )}
              {footer.title && (
                <h4 className="text-xs font-bold mb-3 text-slate-700 dark:text-slate-200">
                  {footer.title}
                </h4>
              )}
            </div>
            {footer.data &&
              (footer.isColorLegend ? (
                <div className="flex flex-col lg:flex-row lg:justify-start gap-x-6 gap-y-2 text-xs mt-3 text-slate-600 dark:text-slate-300">
                  {footer.data.map((color, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span
                        className={`w-4 h-4 border border-gray-400 dark:border-slate-600 rounded-sm ${color.colors}`}
                      />
                      <span>{`${t(color.text)}`}</span>
                    </div>
                  ))}
                </div>
              ) : (
                footer.data
              ))}
          </div>
        )}
      </div>
      {routingData && <RouteInfoButton resultsData={routingData} />}
    </div>
  );
}
