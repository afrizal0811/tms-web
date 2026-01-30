// File: src/app/help/page.js
'use client';

import SelectionLayout from '@/components/SelectionLayout';
import HelpPage from '@/features/help/HelpPage';

export default function Page() {
  return (
    <SelectionLayout>
      <HelpPage />
    </SelectionLayout>
  );
}
