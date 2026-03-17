import { calculateUsageSummary } from '@/lib/reportGenerators/rangkumanSheets/truckUsageSheet';
import { useEffect, useState } from 'react';
import TruckUsageSummaryTable from './components/TruckUsageSummaryTable';
import TruckUsageTable from './components/TruckUsageTable';
import TruckUsageModal from './modals/TruckUsageModal';

export default function TruckUsageTab({ data, translate, hubId, driverData, language }) {
  const [localData, setLocalData] = useState(data);
  const [modalConfig, setModalConfig] = useState({ isOpen: false, data: null });

  useEffect(() => {
    setLocalData(data);
  }, [data]);

  const { summaryData, vehicleTypes, dateMap, dateKeys, hubMasterData } = localData || {};

  const handleCellClick = (cellData) => {
    setModalConfig({ isOpen: true, data: cellData });
  };

  const handleModalSuccess = (resData) => {
    const updatedCell = modalConfig.data;
    if (!updatedCell) return;

    const newDateMap = { ...dateMap };
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

    if (updatedCell.type === 'Interbranch') {
      dayData[`${updatedCell.storage}TotalManual`] -= diff;
      dayData.OTVManual -= diff;
    } else {
      dayData[`${updatedCell.storage}TotalManual`] += diff;
      dayData.OTVManual += diff;
    }

    newDateMap[updatedCell.date] = dayData;

    const newSummary = calculateUsageSummary(newDateMap, dateKeys, hubMasterData, vehicleTypes);

    setLocalData({
      ...localData,
      dateMap: newDateMap,
      summaryData: newSummary,
    });
  };

  if (!localData) return null;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden relative">
      <TruckUsageModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ isOpen: false, data: null })}
        data={modalConfig.data}
        hubId={hubId}
        onSuccess={handleModalSuccess}
        driverData={driverData}
        vehicleTypes={vehicleTypes}
        translate={translate}
        language={language}
      />

      <div className="flex-1 flex flex-col gap-8 overflow-y-auto p-0 pt-2 pb-6 relative">
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

      <div className="px-4 py-3 bg-white border-t border-gray-200 rounded-b-lg shadow-sm shrink-0 z-10">
        <div className="text-xs text-slate-500 italic">
          *
          {translate('summary.tabs.task_summary.click_box_hint') ||
            'Klik pada baris/kolom dengan angka untuk melihat detail kendaraan'}
        </div>
      </div>
    </div>
  );
}
