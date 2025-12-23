// File: src/components/BaseModal.js
'use client';

export default function BaseModal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'max-w-4xl',
  headerClassName = 'bg-slate-800 text-white',
  bodyClassName = 'p-6 overflow-y-auto',
  // UPDATE: Prop baru untuk override class container utama (untuk tinggi fix)
  contentClassName = '',
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-xl shadow-2xl w-full flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 ${maxWidth} ${contentClassName || 'max-h-[90vh]'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`px-6 py-4 flex justify-between items-center shrink-0 border-b border-transparent ${headerClassName}`}
        >
          <div className="text-lg font-bold truncate flex-1">{title}</div>
          <button
            onClick={onClose}
            className="ml-4 text-inherit opacity-70 hover:opacity-100 text-2xl leading-none transition-opacity cursor-pointer"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className={`flex-1 ${bodyClassName}`}>{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 shrink-0">{footer}</div>
        )}
      </div>
    </div>
  );
}
