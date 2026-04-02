// File: src/app/help/page.js
'use client';

import AppLayout from '@/components/AppLayout';
import HelpPage from '@/features/help/HelpPage';

export default function Page() {
  return (
    <AppLayout mainClassName="items-center px-4">
      <HelpPage />
    </AppLayout>
  );
}
