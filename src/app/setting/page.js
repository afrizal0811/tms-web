// File: src/app/settings/page.js
'use client';

import SelectionLayout from '@/components/page/SelectionLayout';
import SettingPage from '@/features/setting/SettingPage';

export default function Page() {
  return (
    <SelectionLayout>
      <SettingPage />
    </SelectionLayout>
  );
}
