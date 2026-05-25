// File: src/app/rangkuman/page.js
import AppLayout from '@/components/AppLayout'; // Import AppLayout
import SummaryPage from '@/features/summary/SummaryPage';

export default function RangkumanPage() {
  return (
    // --- PERUBAHAN 3: Bungkus dengan AppLayout agar Navbar muncul ---
    <AppLayout mainClassName="items-center px-4">
      <SummaryPage />
    </AppLayout>
  );
}
