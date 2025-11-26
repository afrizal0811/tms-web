// File: features/rangkuman/tabs/TruckUsageTab.js
import TruckUsageTable from './components/TruckUsageTable';
import TruckUsageSummaryTable from './components/TruckUsageSummaryTable';

export default function TruckUsageTab({ data }) {
  const { dateMap, summaryData, vehicleTypes } = data || {};

  if (!dateMap) {
    return <div className="p-6 text-center text-gray-400">Tidak ada data untuk ditampilkan.</div>;
  }

  return (
    <div className="w-full h-full flex flex-col gap-8 pb-10 overflow-auto">
      {/* BLOCK 1: SUMMARY COUNT */}
      <div className="flex flex-col gap-2 min-w-max">
        <h3 className="font-bold text-slate-700 px-1 sticky left-0">Truck Usage Summary (Count)</h3>
        <div className="border rounded-lg shadow-sm bg-white p-1">
          <TruckUsageSummaryTable
            summaryData={summaryData}
            vehicleTypes={vehicleTypes}
            isPercentage={false} // <-- Count Mode
          />
        </div>
      </div>

      {/* BLOCK 2: SUMMARY PERCENTAGE (NEW) */}
      <div className="flex flex-col gap-2 min-w-max">
        <h3 className="font-bold text-slate-700 px-1 sticky left-0">
          Truck Usage Summary (Percentage)
        </h3>
        <div className="border rounded-lg shadow-sm bg-white p-1">
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
        <div className="border rounded-lg shadow-sm bg-white">
          <TruckUsageTable {...data} isPercentage={false} />
        </div>
      </div>

      {/* BLOCK 4: DAILY PERCENTAGE */}
      <div className="flex flex-col gap-2 min-w-max">
        <h3 className="font-bold text-slate-700 px-1 sticky left-0">
          Daily Vehicle Usage (Percentage)
        </h3>
        <div className="border rounded-lg shadow-sm bg-white">
          <TruckUsageTable {...data} isPercentage={true} />
        </div>
      </div>
    </div>
  );
}
