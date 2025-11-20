// File: src/app/rangkuman/page.js
import RangkumanSummary from '@/features/rangkuman/RangkumanSummary';
import AppLayout from '@/components/AppLayout'; // Import AppLayout

export const metadata = {
  title: 'Rangkuman Laporan | TMS',
};

export default function RangkumanPage() {
  return (
    // --- PERUBAHAN 3: Bungkus dengan AppLayout agar Navbar muncul ---
    <AppLayout mainClassName="bg-gray-50">
      <div className="w-full">
        <RangkumanSummary />
      </div>
    </AppLayout>
  );
}
