// File: src/app/summary/page.js
import SelectionLayout from '@/components/page/SelectionLayout';
import SummaryPage from '@/features/summary/SummaryPage';

export default function Page() {
  return (
    <SelectionLayout>
      <SummaryPage />
    </SelectionLayout>
  );
}
