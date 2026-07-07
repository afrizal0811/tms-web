import { calculateUsageSummary } from '@/lib/reportGenerators/summary/sheets/truckUsageSheet';
import { toastError, toastSuccess } from '@/lib/toast';
import { useEffect, useState } from 'react';
import TruckUsageSummaryTable from './components/TruckUsageSummaryTable';
import TruckUsageTable from './components/TruckUsageTable';
import TruckUsageModal from './modals/TruckUsageModal';
export default function TruckUsageTab({ data, translate, hubId, driverData, localeCode }) {
  const [localData, setLocalData] = useState(data);
  const [modalConfig, setModalConfig] = useState({ isOpen: false, data: null });

  useEffect(() => {
    setLocalData(data);
  }, [data]);

  const { summaryData, vehicleTypes, dateMap, dateKeys, hubMasterData, masterVehicleList } =
    localData || {};

  const handleCellClick = (cellData) => {
    setModalConfig({ isOpen: true, data: cellData });
  };

  const handleCopyRoutingName = async (routingName) => {
    if (!routingName) return;
    try {
      await navigator.clipboard.writeText(routingName);
      toastSuccess(`${translate('common.copied')}: ${routingName}`);
    } catch (err) {
      toastError(`${translate('common.toast.error')}: ${err.message}`);
    }
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

    const newCount = resData.isDelete ? 0 : parseInt(resData.count) || 0;
    dayData[manualKey][updatedCell.type] = {
      count: newCount,
      desc: resData.isDelete ? '' : resData.description,
      id: resData.isDelete ? null : resData.id,
    };

    const diff = newCount - oldCount;
    const multiplier = updatedCell.type === 'Interbranch' ? -1 : 1;

    dayData[`${updatedCell.storage}TotalManual`] += diff * multiplier;
    dayData.OTVManual += diff * multiplier;

    newDateMap[updatedCell.date] = dayData;

    const newSummary = calculateUsageSummary(newDateMap, dateKeys, hubMasterData, vehicleTypes);

    setLocalData({
      ...localData,
      dateMap: newDateMap,
      summaryData: newSummary,
    });
  };

  if (!localData) return null;

  const tableSections = [
    {
      title: 'summary.tabs.truck_usage.subtitle_1',
      Component: TruckUsageSummaryTable,
      props: { summaryData, vehicleTypes, isPercentage: false },
    },
    {
      title: 'summary.tabs.truck_usage.subtitle_2',
      Component: TruckUsageSummaryTable,
      props: { summaryData, vehicleTypes, isPercentage: true },
    },
    {
      title: 'summary.tabs.truck_usage.subtitle_3',
      Component: TruckUsageTable,
      props: {
        ...localData,
        isPercentage: false,
        onCellClick: handleCellClick,
      },
    },
    {
      title: 'summary.tabs.truck_usage.subtitle_4',
      Component: TruckUsageTable,
      props: {
        ...localData,
        isPercentage: true,
      },
    },
  ];

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
        localeCode={localeCode}
        masterVehicleList={masterVehicleList}
      />

      <div className="flex-1 flex flex-col gap-8 overflow-y-auto p-0 pt-2 pb-6 relative">
        {tableSections.map(({ title, Component, props }, index) => (
          <div key={index} className="flex flex-col gap-2 w-full">
            <h3 className="font-bold text-slate-700 dark:text-slate-200 px-1 sticky left-0">
              {translate(title)}
            </h3>
            <div className="w-full overflow-x-auto relative">
              <Component translate={translate} {...props} />
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 py-3 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 rounded-b-lg shadow-sm shrink-0 z-10">
        <div className="text-xs text-slate-500 dark:text-slate-400 italic">
          *
          {translate('common.click_for_detail_param', {
            parameter: translate('summary.underline'),
          })}
        </div>
      </div>
    </div>
  );
}
