'use client';

import BaseModal from '@/components/BaseModal';
import Button from '@/components/Button';

export default function PartialRoutingModal({
  isOpen,
  onClose,
  onPartial,
  onFull,
  translate,
  title,
}) {
  const titleLowercase = title?.toLowerCase();
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title || 'Download Options'}
      maxWidth="max-w-md"
    >
      <div className="p-4 flex flex-col gap-6">
        <p className="text-lg font-bold text-center text-slate-700 dark:text-slate-300">
          {translate('delivery.modal.choose_type')}
        </p>

        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
          <p>
            <b>{translate('delivery.partial')}</b>:{' '}
            {translate('delivery.modal.partial', { type: titleLowercase })}
          </p>
          <p className="mt-1">
            <b>{translate('delivery.full')}</b>:{' '}
            {translate('delivery.modal.full', { type: titleLowercase })}
          </p>
        </div>

        <div className="flex justify-center gap-4">
          <Button text={translate('delivery.partial')} onClick={onPartial} width="w-28" />
          <Button text={translate('delivery.full')} onClick={onFull} width="w-28" />
        </div>
      </div>
    </BaseModal>
  );
}
