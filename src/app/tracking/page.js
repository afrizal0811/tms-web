// File: src/app/task/page.js
import SelectionLayout from '@/components/page/SelectionLayout';
import TrackingPage from '@/features/tracking/TrackingPage';

export default function Page() {
  return (
    <SelectionLayout>
      <TrackingPage />
    </SelectionLayout>
  );
}
