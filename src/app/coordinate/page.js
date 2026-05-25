import AppLayout from '@/components/AppLayout';
import UpdateCoordinatePage from '@/features/updateCoordinate/UpdateCoordinatePage';


export default function Page() {
  return (
    <AppLayout mainClassName="items-center px-4">
      <UpdateCoordinatePage />
    </AppLayout>
  );
}
