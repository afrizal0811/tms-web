// File: src/components/BodyCard.js
'use client';

import Spinner from '@/components/Spinner';
import TabButton from '@/components/table/TabButton';

export default function BodyCard({
  children,
  className = 'h-[600px]', // Default height
  isLoading = false,
  loadingText = 'Sedang memuat data...',
  isEmpty = false,
  emptyMessage = 'Tidak ada data ditemukan.',
  // Tab Props
  tabs = [],
  activeTabId,
  onTabClick,
}) {
  const renderHeader = () => {
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
      className={`bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col w-full ${className}`}
    >
      {renderHeader()}
      <div className="flex-1 p-0 overflow-hidden flex flex-col relative rounded-b-xl bg-white">
        {isLoading ? (
          <div className="absolute inset-0 z-0 flex flex-col items-center justify-center bg-white/80 space-y-4">
            <Spinner />
            {loadingText && (
              <p className="text-lg font-medium text-slate-700 animate-pulse">{loadingText}</p>
            )}
          </div>
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
