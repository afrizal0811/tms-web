// File: src/app/settings/page.js
'use client';

import AppLayout from '@/components/page/AppLayout';
import SettingPage from '@/features/setting/SettingPage';

export default function Page() {
  return (
    <AppLayout mainClassName="items-center px-4">
      <SettingPage />
    </AppLayout>
  );
}
