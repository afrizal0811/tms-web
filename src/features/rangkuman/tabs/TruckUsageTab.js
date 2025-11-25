// File: features/rangkuman/tabs/TruckUsageTab.js
import TruckUsageTable from './components/TruckUsageTable';

export default function TruckUsageTab({ data }) {
  const { dateMap } = data || {};

  if (!dateMap) {
    return <div className="p-6 text-center text-gray-400">Tidak ada data untuk ditampilkan.</div>;
  }

  return (
    // UPDATE 1: Pindahkan scroll ke sini (Parent Container)
    // Gunakan h-full, overflow-auto agar scrollbar muncul di sini
    <div className="w-full h-full flex flex-col gap-8 pb-10 overflow-auto">
      {/* TABEL 1: COUNT */}
      <div className="flex flex-col gap-2 min-w-max">
        {' '}
        {/* min-w-max agar konten tidak terpotong saat scroll horizontal */}
        <h3 className="font-bold text-slate-700 px-1 sticky left-0">Daily Vehicle Usage (Count)</h3>
        {/* UPDATE 2: Hapus max-h dan overflow dari wrapper ini */}
        <div className="border rounded-lg shadow-sm bg-white">
          <TruckUsageTable {...data} isPercentage={false} />
        </div>
      </div>

      {/* TABEL 2: PERCENTAGE */}
      <div className="flex flex-col gap-2 min-w-max">
        <h3 className="font-bold text-slate-700 px-1 sticky left-0">
          Daily Vehicle Usage (Percentage)
        </h3>

        {/* UPDATE 3: Hapus max-h dan overflow dari wrapper ini */}
        <div className="border rounded-lg shadow-sm bg-white">
          <TruckUsageTable {...data} isPercentage={true} />
        </div>
      </div>
    </div>
  );
}
