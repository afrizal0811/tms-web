// File: features/rangkuman/tabs/components/TruckUsageSummaryTable.js
import Tooltip from '@/components/Tooltip';
import { isEmpty } from '@/lib/utils';

export default function TruckUsageSummaryTable({
  isPercentage = false,
  summaryData,
  translate,
  vehicleTypes,
}) {
  if (!summaryData) return null;

  const thClass =
    'border border-gray-400 px-2 py-2 text-center text-xs font-bold text-slate-700 bg-[#d9d2e9]';
  const thClassTooltip = `${thClass} cursor-help`;
  const tdClass = 'border border-gray-200 px-2 py-1 text-center text-xs text-slate-700';

  const dryBg = 'bg-[#fae2d5]';
  const frzBg = 'bg-[#dbe9f7]';
  const dryTotBg = 'bg-[#f9cb9c]';
  const frzTotBg = 'bg-[#c9daf8]';
  const otvBg = 'bg-[#d9f2d0]';

  const headerTooltip = (tootltip, text, className, addClass = '') => {
    return (
      <Tooltip tooltipContent={tootltip}>
        <td
          className={`${!isEmpty(className) ? thClassTooltip : className} ${addClass && `${addClass} cursor-help`}`}
        >
          <span className="border-b-[1.5px] border-dashed border-gray-600 pb-px">{text}</span>
        </td>
      </Tooltip>
    );
  };
  // Color helper for percentage
  const getPctClass = (val) => {
    if (val > 1) return 'bg-[#ff0000] text-white font-bold';
    if (val >= 0.75) return 'bg-[#b7e1cd]';
    if (val >= 0.5) return 'bg-[#f1c232]';
    return 'bg-[#f4cccc]';
  };

  const renderRows = (cat, bgColor, totalBg) => {
    const rows = vehicleTypes.map((type) => {
      const d = summaryData[cat].types[type];

      if (isPercentage) {
        return (
          <tr key={`${cat}-${type}`} className="hover:opacity-90">
            <td className={`${tdClass} text-left font-medium ${bgColor}`}>{type}</td>
            <td className={`${tdClass} ${getPctClass(d.PctTMS)}`}>
              {d.PctTMS ? (d.PctTMS * 100).toFixed(2) + '%' : '0.00%'}
            </td>
            <td className={`${tdClass} ${getPctClass(d.PctNonTMS)}`}>
              {d.PctNonTMS ? (d.PctNonTMS * 100).toFixed(2) + '%' : '0.00%'}
            </td>
            <td className={`${tdClass} ${getPctClass(d.PctTVU)}`}>
              {d.PctTVU ? (d.PctTVU * 100).toFixed(2) + '%' : '0.00%'}
            </td>
          </tr>
        );
      }

      // Count Table
      return (
        <tr key={`${cat}-${type}`} className="hover:opacity-90">
          <td className={`${tdClass} text-left font-medium ${bgColor}`}>{type}</td>
          <td className={`${tdClass} ${bgColor}`}>{d.TMS || 0}</td>
          <td className={`${tdClass} ${bgColor}`}>{d.NonTMS || 0}</td>
          <td className={`${tdClass} ${bgColor}`}>{d.TVU || 0}</td>
          <td className={`${tdClass} ${bgColor}`}>{d.TV || 0}</td>
          <td className={`${tdClass} ${bgColor}`}>
            {d.PctTVU ? (d.PctTVU * 100).toFixed(2) + '%' : '0.00%'}
          </td>
          <td className={`${tdClass} ${bgColor}`}></td>
          <td className={`${tdClass} ${bgColor}`}></td>
          <td className={`${tdClass} ${bgColor}`}></td>
        </tr>
      );
    });

    const t = summaryData[cat].total;
    if (isPercentage) {
      return [
        ...rows,
        <tr key={`${cat}-Total`} className="font-bold">
          <td className={`${tdClass} text-left ${totalBg}`}>
            {translate('summary.tabs.truck_usage.total_used')}
          </td>
          <td className={`${tdClass} ${getPctClass(t.PctTMS)}`}>
            {t.PctTMS ? (t.PctTMS * 100).toFixed(2) + '%' : '0.00%'}
          </td>
          <td className={`${tdClass} ${getPctClass(t.PctNonTMS)}`}>
            {t.PctNonTMS ? (t.PctNonTMS * 100).toFixed(2) + '%' : '0.00%'}
          </td>
          <td className={`${tdClass} ${getPctClass(t.PctTVU)}`}>
            {t.PctTVU ? (t.PctTVU * 100).toFixed(2) + '%' : '0.00%'}
          </td>
        </tr>,
      ];
    }

    // Count Table Total
    return [
      ...rows,
      <tr key={`${cat}-Total`} className="font-bold">
        <td className={`${tdClass} text-left ${totalBg}`}>
          {translate('summary.tabs.truck_usage.total_used')}
        </td>
        <td className={`${tdClass} ${totalBg}`}>{t.TMS || 0}</td>
        <td className={`${tdClass} ${totalBg}`}>{t.NonTMS || 0}</td>
        <td className={`${tdClass} ${totalBg}`}>{t.TVU || 0}</td>
        <td className={`${tdClass} ${totalBg}`}>{t.TV || 0}</td>
        <td className={`${tdClass} ${totalBg}`}>
          {t.PctTVU ? (t.PctTVU * 100).toFixed(2) + '%' : '0.00%'}
        </td>
        <td className={`${tdClass} ${totalBg}`}>{t.V || 0}</td>
        <td className={`${tdClass} ${totalBg}`}>{t.VU || 0}</td>
        <td className={`${tdClass} ${totalBg}`}>{t.IV || 0}</td>
      </tr>,
    ];
  };

  const renderOTVRow = () => {
    const t = summaryData.OTV;
    if (isPercentage) {
      return (
        <tr key="OTV-Total" className="font-bold">
          {headerTooltip(
            translate('summary.tabs.truck_usage.otv'),
            'OTV',
            '',
            `${tdClass} text-left ${otvBg}`
          )}
          <td className={`${tdClass} ${getPctClass(t.PctTMS)}`}>
            {t.PctTMS ? (t.PctTMS * 100).toFixed(2) + '%' : '0.00%'}
          </td>
          <td className={`${tdClass} ${getPctClass(t.PctNonTMS)}`}>
            {t.PctNonTMS ? (t.PctNonTMS * 100).toFixed(2) + '%' : '0.00%'}
          </td>
          <td className={`${tdClass} ${getPctClass(t.PctTVU)}`}>
            {t.PctTVU ? (t.PctTVU * 100).toFixed(2) + '%' : '0.00%'}
          </td>
        </tr>
      );
    }

    return (
      <tr key="OTV-Total" className="font-bold">
        {headerTooltip(
          translate('summary.tabs.truck_usage.otv'),
          'OTV',
          '',
          `${tdClass} text-left ${otvBg}`
        )}
        <td className={`${tdClass} ${otvBg}`}>{t.TMS || 0}</td>
        <td className={`${tdClass} ${otvBg}`}>{t.NonTMS || 0}</td>
        <td className={`${tdClass} ${otvBg}`}>{t.TVU || 0}</td>
        <td className={`${tdClass} ${otvBg}`}>{t.TV || 0}</td>
        <td className={`${tdClass} ${otvBg}`}>
          {t.PctTVU ? (t.PctTVU * 100).toFixed(2) + '%' : '0.00%'}
        </td>
        <td className={`${tdClass} ${otvBg}`}>{t.V || 0}</td>
        <td className={`${tdClass} ${otvBg}`}>{t.VU || 0}</td>
        <td className={`${tdClass} ${otvBg}`}>{t.IV || 0}</td>
      </tr>
    );
  };

  return (
    <div className="w-full overflow-x-auto">
      <table className="min-w-full border-collapse border-0 text-sm">
        <thead>
          <tr>
            <th className={`${thClass} w-[200px]`}>
              {translate('summary.tabs.truck_usage.vehicle_type')}
            </th>
            {headerTooltip(translate('summary.tabs.truck_usage.tms'), 'TMS')}
            {headerTooltip(translate('summary.tabs.truck_usage.non_tms'), 'Non TMS')}
            {headerTooltip(translate('summary.tabs.truck_usage.tvu'), 'TVU')}

            {/* HIDE COLUMNS FOR PERCENTAGE TABLE */}
            {!isPercentage && (
              <>
                {headerTooltip(translate('summary.tabs.truck_usage.tv'), 'TV')}
                {headerTooltip(translate('summary.tabs.truck_usage.tvu_percentage'), '% TVU')}
                {headerTooltip(translate('summary.tabs.truck_usage.vehicle'), 'V')}
                {headerTooltip(translate('summary.tabs.truck_usage.vu'), 'VU')}
                {headerTooltip(translate('summary.tabs.truck_usage.iv'), 'IV')}
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {renderRows('Dry', dryBg, dryTotBg, isPercentage)}
          {renderRows('Frozen', frzBg, frzTotBg, isPercentage)}
          {renderOTVRow()}
        </tbody>
      </table>
    </div>
  );
}
