import { calculateUsageSummary } from '@/lib/reportGenerators/rangkumanSheets/truckUsageSheet';
import { useEffect, useState } from 'react';
import TruckUsageSummaryTable from './components/TruckUsageSummaryTable';
import TruckUsageTable from './components/TruckUsageTable';
import TruckUsageModal from './modals/TruckUsageModal';

export default function TruckUsageTab({ data, translate, hubId }) {
  const [localData, setLocalData] = useState(data);
  const [modalConfig, setModalConfig] = useState({ isOpen: false, data: null });

  useEffect(() => {
    setLocalData(data);
  }, [data]);

  const { summaryData, vehicleTypes, dateMap, dateKeys, hubMasterData } = localData || {};

  const handleCellClick = (cellData) => {
    setModalConfig({ isOpen: true, data: cellData });
  };

  // LOCAL STATE UPDATE: Mengubah UI dalam millisecond tanpa membebani server
  const handleModalSuccess = (resData) => {
    const updatedCell = modalConfig.data;
    if (!updatedCell) return;

    const newDateMap = { ...dateMap };
    // Clone sedalam mungkin untuk memicu UI rerender
    const dayData = { ...newDateMap[updatedCell.date] };
    const manualKey = `${updatedCell.storage}Manual`;
    dayData[manualKey] = { ...dayData[manualKey] };

    const oldManualObj = dayData[manualKey][updatedCell.type] || {};
    const oldCount = oldManualObj.count || 0;

    let newCount = 0;
    if (!resData.isDelete) {
      newCount = parseInt(resData.count);
      dayData[manualKey][updatedCell.type] = {
        count: newCount,
        desc: resData.description,
        id: resData.id,
      };
    } else {
      dayData[manualKey][updatedCell.type] = { count: 0, desc: '', id: null };
    }

    const diff = newCount - oldCount;

    // Kalkulasi matematika real-time untuk Total Harian
    if (updatedCell.type === 'Interbranch') {
      dayData[`${updatedCell.storage}TotalManual`] -= diff;
      dayData.OTVManual -= diff;
    } else {
      dayData[`${updatedCell.storage}TotalManual`] += diff;
      dayData.OTVManual += diff;
    }

    newDateMap[updatedCell.date] = dayData;

    // Panggil ulang helper perhitungan Summary Bulanan dengan dateMap yang baru disuntik
    const newSummary = calculateUsageSummary(newDateMap, dateKeys, hubMasterData, vehicleTypes);

    setLocalData({
      ...localData,
      dateMap: newDateMap,
      summaryData: newSummary,
    });
  };

  if (!localData) return null;

  return (
    <div className="w-full h-full flex flex-col gap-8 overflow-y-auto p-0 pt-2 relative">
      <TruckUsageModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ isOpen: false, data: null })}
        data={modalConfig.data}
        hubId={hubId}
        onSuccess={handleModalSuccess}
      />

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

      <div className="flex flex-col gap-2 min-w-max">
        <h3 className="font-bold text-slate-700 px-1 sticky left-0">
          {translate('summary.tabs.truck_usage.subtitle_3')}
        </h3>
        <div className="border border-gray-300 overflow-hidden">
          <TruckUsageTable
            {...localData}
            isPercentage={false}
            translate={translate}
            onCellClick={handleCellClick}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 min-w-max">
        <h3 className="font-bold text-slate-700 px-1 sticky left-0">
          {translate('summary.tabs.truck_usage.subtitle_4')}
        </h3>
        <div className="border border-gray-300 rounded-b-xl overflow-hidden">
          <TruckUsageTable {...localData} isPercentage={true} translate={translate} />
        </div>
      </div>
    </div>
  );
}
