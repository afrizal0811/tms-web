import AppLayout from '@/components/AppLayout';
import UpdateLonglatPage from '@/features/updateLonglat/UpdateLonglatPage';

export const metadata = {
  title: 'Update Longlat - TMS Data Processing',
};

export default function Page() {
  return (
    <AppLayout mainClassName="items-center px-4">
      <UpdateLonglatPage />
    </AppLayout>
  );
}
