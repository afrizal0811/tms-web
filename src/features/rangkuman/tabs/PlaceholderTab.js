// File: src/features/rangkuman/tabs/PlaceholderTab.js
export default function PlaceholderTab({ tabName }) {
  return (
    <div className="w-full border border-gray-200 rounded-lg overflow-hidden bg-white p-8 text-center">
      <p className="text-gray-500 italic">
        Tampilan web untuk <strong>{tabName}</strong> sedang dalam pengembangan.
      </p>
      <p className="text-gray-400 text-sm mt-2">
        Silakan gunakan tombol `Download Excel` untuk melihat data lengkap.
      </p>
    </div>
  );
}
