'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }) {
  // Efek untuk disable scroll di background saat modal terbuka
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    // Cleanup
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  // Jangan render apa-apa jika tidak 'isOpen'
  if (!isOpen) return null;

  // Render modal menggunakan Portal ke 'document.body'
  return createPortal(
    <div
      // Backdrop (Overlay)
      className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-50 backdrop-blur-sm transition-opacity"
      onClick={onCancel}
    >
      <div
        // Kontainer Modal
        className="relative w-full max-w-sm p-6 mx-4 bg-slate-800 rounded-lg shadow-xl transition-transform"
        onClick={(e) => e.stopPropagation()} // Mencegah klik di dalam modal menutup modal
      >
        {/* Ikon Peringatan (Opsional, tapi bagus) */}
        <div className="flex justify-center mb-4">
          <div className="flex items-center justify-center w-12 h-12 bg-slate-700 rounded-full">
            <svg
              className="w-6 h-6 text-sky-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.374c-.866-1.5-3.033-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
        </div>

        {/* Judul (Title) */}
        <h3 className="text-lg font-medium text-center text-white mb-2">{title}</h3>

        {/* Pesan (Message) */}
        <p className="text-sm text-center text-gray-400 mb-6">{message}</p>

        {/* Tombol Aksi */}
        <div className="flex justify-center gap-4">
          <button
            onClick={onCancel}
            className="px-6 py-2 rounded-md font-semibold text-white bg-gray-600 hover:bg-gray-700"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 rounded-md font-semibold text-white bg-sky-600 hover:bg-sky-700"
          >
            Ya, Yakin
          </button>
        </div>
      </div>
    </div>,
    document.body // Target Portal
  );
}
