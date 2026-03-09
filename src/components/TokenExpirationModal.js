'use client';

import { useLanguage } from '@/context/LanguageContext';
import { toastError } from '@/lib/toastHelper';
import { formatLongDate } from '@/lib/utils';
import { useEffect, useState } from 'react';
import BaseModal from './BaseModal';

export default function TokenExpirationModal() {
  const { t, lang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [targetDateObj, setTargetDateObj] = useState(null);

  useEffect(() => {
    const checkTokenExpiration = () => {
      const envDate = process.env.NEXT_PUBLIC_TOKEN_EXPIRE; // Format: DD/MM/YYYY
      if (!envDate) return;

      try {
        const [day, month, year] = envDate.split('/').map(Number);
        // Note: Month di JS Date dimulai dari 0 (Januari = 0)
        const targetDate = new Date(year, month - 1, day);
        const today = new Date();

        // Set jam ke 00:00:00 untuk perbandingan hari yang akurat
        targetDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        const diffTime = targetDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Munculkan jika kurang dari 14 hari (termasuk jika sudah minus/expired)
        if (diffDays < 14) {
          setDaysRemaining(diffDays);
          setTargetDateObj(targetDate);
          setIsOpen(true);
        }
      } catch (error) {
        toastError(t('common.toast.error', { err: error.message }));
      }
    };

    checkTokenExpiration();
  }, [t]);

  // Konten pesan berdasarkan status hari
  const getMessage = () => {
    const formattedDate = targetDateObj ? formatLongDate(targetDateObj, lang) : '-';
    const contact = <span className="font-bold text-red-600">{t('common.modal.contact_edp')}</span>;
    const absDaysRemaining = Math.abs(daysRemaining);

    if (daysRemaining < 0) {
      return (
        <div className="text-red-600 font-medium">
          {t('common.modal.already_exp', { remaining: absDaysRemaining })} ({formattedDate})
          <br />
          <br />
          {contact}
        </div>
      );
    }
    return (
      <div className="text-slate-700">
        {t('common.modal.exp_remaining')}{' '}
        <span className="font-bold text-red-600">
          {t('common.modal.exp_remaining_days', { remaining: absDaysRemaining })}{' '}
        </span>
        ({formattedDate})
        <br />
        <br />
        {contact}
      </div>
    );
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title={t('common.warning')}
      maxWidth="max-w-lg"
    >
      <div className="flex flex-col gap-4">{getMessage()}</div>
    </BaseModal>
  );
}
