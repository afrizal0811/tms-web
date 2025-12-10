// File: src/app/rangkuman/page.js
import AppLayout from '@/components/AppLayout'; // Import AppLayout
import RangkumanSummary from '@/features/rangkuman/RangkumanSummary';

export default function RangkumanPage() {
  return (
    // --- PERUBAHAN 3: Bungkus dengan AppLayout agar Navbar muncul ---
    <AppLayout mainClassName="items-center px-4">
      <RangkumanSummary />
    </AppLayout>
  );
}
