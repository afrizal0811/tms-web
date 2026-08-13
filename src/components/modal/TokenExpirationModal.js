'use client';

import Modal from '@/components/Modal';
import { useLanguage } from '@/context/LanguageContext';
import { toastError } from '@/lib/toast';
import { formatLongDate } from '@/lib/utils';
import { useEffect, useState } from 'react';

export default function TokenExpirationModal() {
  const { t, localeCode } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [targetDateObj, setTargetDateObj] = useState(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const checkTokenExpiration = () => {
      const envDate = process.env.NEXT_PUBLIC_TOKEN_EXPIRE;
      if (!envDate) return;

      try {
        const [day, month, year] = envDate.split('/').map(Number);
        const targetDate = new Date(year, month - 1, day);
        const today = new Date();

        targetDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        const diffTime = targetDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setIsExpired(diffDays < 0);
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

  const getMessage = () => {
    const formattedDate = targetDateObj ? formatLongDate(targetDateObj, localeCode) : '-';
    const contact = (
      <p className="font-bold text-red-600 text-center w-full">{t('home.contact_edp')}</p>
    );
    const absDaysRemaining = Math.abs(daysRemaining);

    return (
      <span className="text-slate-700 flex flex-col text-center">
        {isExpired
          ? t('home.already_exp', { remaining: absDaysRemaining })
          : t('home.exp_remaining', { remaining: absDaysRemaining })}
        <br />
        <strong>({formattedDate})</strong>
        <br />
        {contact}
      </span>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => (!isExpired ? setIsOpen(false) : null)}
      noClose={isExpired}
      title={t('common.warning')}
      maxWidth="max-w-lg"
    >
      <div className="flex flex-col gap-4">{getMessage()}</div>
    </Modal>
  );
}
