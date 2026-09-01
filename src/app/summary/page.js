// File: src/app/summary/page.js
import AppLayout from '@/components/page/AppLayout'; // Import AppLayout
import SummaryPage from '@/features/summary/SummaryPage';

export default function Page() {
  return (
    // --- PERUBAHAN 3: Bungkus dengan AppLayout agar Navbar muncul ---
    <AppLayout mainClassName="items-center px-4">
      <SummaryPage />
    </AppLayout>
  );
}
