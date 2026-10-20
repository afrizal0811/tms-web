// File: src/features/help/vms/components/DriverScoreActionButtons.js
'use client';

import Button from '@/components/button/Button';
import { useState } from 'react';
import ManualScoreModal from './ManualScoreModal';

export default function ScoreButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mt-3">
        <Button
          text="Unggah File"
          width="w-auto"
          size="md"
          onClick={() => {
            alert('Tombol Unggah File berhasil diklik!');
          }}
        />
        <Button
          text="Hitung Manual"
          width="w-auto"
          size="md"
          onClick={() => {
            setIsModalOpen(true);
          }}
          className="bg-emerald-600 text-white border border-emerald-700 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
        />
      </div>

      <ManualScoreModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
