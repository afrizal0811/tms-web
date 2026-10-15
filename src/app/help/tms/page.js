// File: src/app/help/tms/page.js
'use client';

import SelectionLayout from '@/components/page/SelectionLayout';
import HelpPage from '@/features/help/HelpPage';

export default function TmsHelpPage() {
  return (
    <SelectionLayout>
      <HelpPage system="tms" />
    </SelectionLayout>
  );
}
