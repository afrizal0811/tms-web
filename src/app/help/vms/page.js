// File: src/app/help/vms/page.js
'use client';

import SelectionLayout from '@/components/page/SelectionLayout';
import HelpPage from '@/features/help/HelpPage';

export default function VmsHelpPage() {
  return (
    <SelectionLayout>
      <HelpPage system="vms" />
    </SelectionLayout>
  );
}
