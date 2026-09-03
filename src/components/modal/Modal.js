'use client';

export default function Modal({
  bodyClassName = 'm-6 overflow-y-auto',
  children,
  contentClassName = '',
  footer,
  headerClassName = '',
  headerContent = '',
  isOpen,
  maxWidth = 'max-w-4xl',
  noClose = false,
  onClose,
  title,
  subtitle,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-999 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 transition-colors ${maxWidth} ${contentClassName || 'max-h-[90vh]'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`px-6 py-4 flex justify-between shrink-0 border-b border-gray-200 dark:border-slate-900 bg-gray-100 dark:bg-slate-900/80 transition-colors ${headerClassName}`}
        >
          <div className="flex-column lg:flex items-center gap-4 justify-between w-full">
            <div>
              <h2 className="text-lg font-bold truncate flex-1">{title}</h2>
              <p className="text-sm mt-0.5 font-normal text-slate-500 dark:text-slate-400">{subtitle}</p>
            </div>
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
        <div className={`flex-1 text-slate-800 dark:text-slate-100 ${bodyClassName}`}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-3 bg-white dark:bg-slate-800/80 shrink-0 transition-colors">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
