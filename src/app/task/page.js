// File: src/app/task/page.js
import AppLayout from '@/components/page/AppLayout';
import TaskPage from '@/features/task/TaskPage';

export default function Page() {
  return (
    <AppLayout mainClassName="items-center px-4">
      <TaskPage />
    </AppLayout>
  );
}
