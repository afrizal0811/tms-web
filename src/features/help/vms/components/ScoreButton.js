// File: src/features/help/vms/components/DriverScoreActionButtons.js
'use client';

import Button from '@/components/button/Button';
import { useState } from 'react';
import ManualScoreModal from './ManualScoreModal';
import UploadScoreModal from './UploadScoreModal';

export default function ScoreButton() {
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mt-3">
        <Button
          text="Hitung Manual"
          width="w-auto"
          size="md"
          onClick={() => {
            setIsManualModalOpen(true);
          }}
          className="bg-emerald-600 text-white border border-emerald-700 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
        />
        <Button
          text="Unggah File"
          width="w-auto"
          size="md"
          onClick={() => {
            setIsUploadModalOpen(true);
          }}
        />
      </div>

      <ManualScoreModal isOpen={isManualModalOpen} onClose={() => setIsManualModalOpen(false)} />

      <UploadScoreModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} />
    </>
  );
}
