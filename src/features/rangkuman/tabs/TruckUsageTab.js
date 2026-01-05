// File: features/rangkuman/tabs/TruckUsageTab.js
import TruckUsageSummaryTable from './components/TruckUsageSummaryTable';
import TruckUsageTable from './components/TruckUsageTable';

export default function TruckUsageTab({ data, translate }) {
  const { summaryData, vehicleTypes } = data || {};

  return (
    <div className="w-full h-full flex flex-col gap-8 overflow-y-auto p-0 pt-2">
      {/* BLOCK 1: SUMMARY COUNT */}
      <div className="flex flex-col gap-2 min-w-max">
        <h3 className="font-bold text-slate-700 px-1 sticky left-0">
          {translate('summary.tabs.truck_usage.subtitle_1')}
        </h3>
        <div className="border border-gray-300 overflow-hidden">
          <TruckUsageSummaryTable
            isPercentage={false}
            summaryData={summaryData}
            translate={translate}
            vehicleTypes={vehicleTypes}
          />
        </div>
      </div>

      {/* BLOCK 2: SUMMARY PERCENTAGE (NEW) */}
      <div className="flex flex-col gap-2 min-w-max">
        <h3 className="font-bold text-slate-700 px-1 sticky left-0">
          {translate('summary.tabs.truck_usage.subtitle_2')}
        </h3>
        <div className="border border-gray-300 overflow-hidden">
          <TruckUsageSummaryTable
            isPercentage={true}
            summaryData={summaryData}
            translate={translate}
            vehicleTypes={vehicleTypes}
          />
        </div>
      </div>

      {/* BLOCK 3: DAILY COUNT */}
      <div className="flex flex-col gap-2 min-w-max">
        <h3 className="font-bold text-slate-700 px-1 sticky left-0">
          {translate('summary.tabs.truck_usage.subtitle_3')}
        </h3>
        <div className="border border-gray-300 overflow-hidden">
          <TruckUsageTable {...data} isPercentage={false} translate={translate} />
        </div>
      </div>

      {/* BLOCK 4: DAILY PERCENTAGE */}
      <div className="flex flex-col gap-2 min-w-max">
        <h3 className="font-bold text-slate-700 px-1 sticky left-0">
          {translate('summary.tabs.truck_usage.subtitle_4')}
        </h3>
        <div className="border border-gray-300 rounded-b-xl overflow-hidden">
          <TruckUsageTable {...data} isPercentage={true} translate={translate} />
        </div>
      </div>
    </div>
  );
}
