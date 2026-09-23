// File: src/app/task/page.js
import SelectionLayout from '@/components/page/SelectionLayout';
import TaskPage from '@/features/task/TaskPage';

export default function Page() {
  return (
    <SelectionLayout>
      <TaskPage />
    </SelectionLayout>
  );
}
