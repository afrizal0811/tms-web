// File: src/app/settings/page.js
'use client';

import AppLayout from '@/components/AppLayout';
import SettingsPage from '@/features/settings/SettingsPage';

export default function Page() {
  return (
    <AppLayout mainClassName="items-center px-4">
      <SettingsPage />
    </AppLayout>
  );
}
