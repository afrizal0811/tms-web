// File: app/estimasi/page.js
'use client';

import AppLayout from '@/components/AppLayout';
import EstimasiDelivery from '@/features/estimasiDelivery/EstimasiDelivery';

export default function EstimasiPage() {
  return (
    // Layout ini akan otomatis memiliki Navbar dan Footer
    // 'flex flex-col h-full' akan membuat EstimasiDelivery mengisi sisa ruang
    <AppLayout mainClassName="flex flex-col h-full">
      <EstimasiDelivery />
    </AppLayout>
  );
}
