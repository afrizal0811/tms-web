// File: features/rangkuman/tabs/TruckUsageTab.js
import TruckUsageTable from './components/TruckUsageTable';
import TruckUsageSummaryTable from './components/TruckUsageSummaryTable';

export default function TruckUsageTab({ data }) {
  const { dateMap, summaryData, vehicleTypes } = data || {};

  const hasUsageData =
    dateMap &&
    Object.values(dateMap).some((dateObj) => {
      const dryCount = dateObj.DryTotal || 0;
      const frozenCount = dateObj.FrozenTotal || 0;
      const otvCount = dateObj.OTV || 0;

      // Return true jika ada data (jumlah > 0)
      return dryCount > 0 || frozenCount > 0 || otvCount > 0;
    });

  // Jika dateMap null/undefined ATAU tidak ada usage (semua 0)
  if (!dateMap || !hasUsageData) {
    return (
      <div className="h-full lg:col-span-2 flex items-center justify-center bg-gray-50 border border-dashed border-gray-300 rounded-xl text-gray-400 m-6">
        Tidak ada data yang ditemukan.
      </div>
    );
  }
  // --- SELESAI LOGIKA BARU ---

  return (
    <div className="w-full h-full flex flex-col gap-8 pb-10 overflow-auto p-6 ">
      {/* BLOCK 1: SUMMARY COUNT */}
      <div className="flex flex-col gap-2 min-w-max">
        <h3 className="font-bold text-slate-700 px-1 sticky left-0">Truck Usage Summary (Count)</h3>
        <div className="border border-gray-300 rounded-xl overflow-hidden">
          <TruckUsageSummaryTable
            summaryData={summaryData}
            vehicleTypes={vehicleTypes}
            isPercentage={false}
          />
        </div>
      </div>

      {/* BLOCK 2: SUMMARY PERCENTAGE (NEW) */}
      <div className="flex flex-col gap-2 min-w-max">
        <h3 className="font-bold text-slate-700 px-1 sticky left-0">
          Truck Usage Summary (Percentage)
        </h3>
        <div className="border border-gray-300 rounded-xl overflow-hidden">
          <TruckUsageSummaryTable
            summaryData={summaryData}
            vehicleTypes={vehicleTypes}
            isPercentage={true} // <-- Percentage Mode
          />
        </div>
      </div>

      {/* BLOCK 3: DAILY COUNT */}
      <div className="flex flex-col gap-2 min-w-max">
        <h3 className="font-bold text-slate-700 px-1 sticky left-0">Daily Vehicle Usage (Count)</h3>
        <div className="border border-gray-300 rounded-xl overflow-hidden">
          <TruckUsageTable {...data} isPercentage={false} />
        </div>
      </div>

      {/* BLOCK 4: DAILY PERCENTAGE */}
      <div className="flex flex-col gap-2 min-w-max">
        <h3 className="font-bold text-slate-700 px-1 sticky left-0">
          Daily Vehicle Usage (Percentage)
        </h3>
        <div className="border border-gray-300 rounded-xl overflow-hidden">
          <TruckUsageTable {...data} isPercentage={true} />
        </div>
      </div>
    </div>
  );
}
