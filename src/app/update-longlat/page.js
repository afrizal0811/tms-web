import AppLayout from '@/components/AppLayout';
import UpdateLonglatPage from '@/features/updateLonglat/UpdateLonglatPage';


export default function Page() {
  return (
    <AppLayout mainClassName="items-center px-4">
      <UpdateLonglatPage />
    </AppLayout>
  );
}
