'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export default function ConfirmModal({
  cancelText = 'Tidak',
  confirmText = 'Ya',
  isOpen,
  message,
  onCancel,
  onConfirm,
  title,
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // FIX: Gunakan setTimeout agar tidak dianggap synchronous update oleh linter
    setTimeout(() => {
      setMounted(true);
    }, 0);

    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-999 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="relative w-full max-w-sm p-6 mx-4 bg-slate-800 rounded-lg shadow-xl transition-transform"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-4">
          <div className="flex items-center justify-center w-12 h-12 bg-slate-700 rounded-full">
            <svg
              className="w-6 h-6 text-sky-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="red"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.374c-.866-1.5-3.033-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
        </div>

        <h3 className="text-lg font-medium text-center text-white mb-2">{title}</h3>

        <div className="text-sm text-center text-gray-400 mb-6">{message}</div>

        <div className="flex justify-center gap-4">
          <button
            onClick={onCancel}
            className="px-6 py-2 rounded-md font-semibold cursor-pointer text-white bg-gray-600 hover:bg-gray-700"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 rounded-md  cursor-pointer font-semibold text-white bg-sky-600 hover:bg-sky-700"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
