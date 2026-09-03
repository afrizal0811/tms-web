// File: src/app/task/page.js
import AppLayout from '@/components/page/AppLayout';
import TrackingPage from '@/features/tracking/TrackingPage';

export default function Page() {
  return (
    <AppLayout mainClassName="items-center px-4">
      <TrackingPage />
    </AppLayout>
  );
}
