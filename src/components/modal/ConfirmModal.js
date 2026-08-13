'use client';

import Button from '@/components/Button';
import Modal from '@/components/Modal';
import { useLanguage } from '@/context/LanguageContext';
import { useEffect, useState } from 'react';

export default function ConfirmModal({
  cancelText,
  confirmText,
  isOpen,
  message,
  onCancel,
  onConfirm,
  title,
  loading = false,
}) {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted || !isOpen) return null;

  const resolvedCancel = cancelText ?? t('common.button.btn_no');
  const resolvedConfirm = confirmText ?? t('common.button.btn_yes');

  const footer = (
    <div className="flex justify-center gap-4 w-full">
      <Button
        text={resolvedCancel}
        onClick={onCancel}
        className="bg-gray-600! hover:bg-gray-700! border-gray-700!"
      />
      <Button text={resolvedConfirm} onClick={onConfirm} isLoading={loading} />
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} maxWidth="max-w-sm" footer={footer}>
      <div className="flex justify-center mb-4">
        <div className="flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-slate-900/30 rounded-full">
          <svg
            className="w-10 h-10 text-sky-400"
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
      <div className="text-sm text-center text-slate-800 dark:text-gray-400">{message}</div>
    </Modal>
  );
}
