// File: src/components/BaseModal.js
'use client';

export default function BaseModal({
  bodyClassName = 'p-6 overflow-y-auto',
  children,
  contentClassName = '',
  footer,
  headerClassName = 'bg-slate-800 dark:bg-slate-950 text-white',
  headerContent = '',
  isOpen,
  maxWidth = 'max-w-4xl',
  noClose = false,
  onClose,
  title,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-999 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-xl shadow-2xl w-full flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 transition-colors ${maxWidth} ${contentClassName || 'max-h-[90vh]'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`px-6 py-4 flex justify-between shrink-0 border-b border-transparent ${headerClassName}`}
        >
          <div className="flex-column lg:flex items-center gap-4 justify-between w-full">
            <div className="text-lg font-bold truncate flex-1">{title}</div>
            {headerContent && <div className="flex items-center py-3 ">{headerContent}</div>}
          </div>
          <div className="flex-column lg:flex items-start gap-4 justify-between">
            {!noClose && (
              <button
                onClick={onClose}
                className="ml-4 text-inherit opacity-70 hover:opacity-100 text-2xl leading-none transition-opacity cursor-pointer"
                aria-label="Close"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className={`flex-1 text-slate-800 dark:text-slate-200 ${bodyClassName}`}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-3 bg-gray-50 dark:bg-slate-800/80 border-t border-gray-100 dark:border-slate-700 shrink-0 transition-colors">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
