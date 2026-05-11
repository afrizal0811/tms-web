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
    'border border-gray-400 dark:border-slate-600 px-2 py-2 text-center text-xs font-bold text-slate-700 dark:text-slate-200 bg-[#d9d2e9] dark:bg-violet-900/30';
  const thClassTooltip = `${thClass} cursor-help`;
  const tdClass =
    'border border-gray-200 dark:border-slate-700 px-2 py-1 text-center text-xs text-slate-700 dark:text-slate-300';

  const dryBg = 'bg-[#fae2d5] dark:bg-orange-900/30';
  const frzBg = 'bg-[#dbe9f7] dark:bg-blue-900/30';
  const dryTotBg = 'bg-[#f9cb9c] dark:bg-orange-900/50';
  const frzTotBg = 'bg-[#c9daf8] dark:bg-blue-900/50';
  const otvBg = 'bg-[#d9f2d0] dark:bg-green-900/30';

  const headerTooltip = (tootltip, text, className = '', addClass = '') => {
    return (
      <Tooltip tooltipContent={tootltip}>
        <td
          className={`${isEmpty(className) ? thClassTooltip : className} ${addClass && `${addClass}`}`}
        >
          <span className="border-b-2 border-dotted border-slate-700 dark:border-slate-400 pb-px">
            {text}
          </span>
        </td>
      </Tooltip>
    );
  };

  const getPctClass = (val) => {
    if (val > 1) return 'bg-[#ff0000] dark:bg-red-700 text-white font-bold';
    if (val >= 0.75) return 'bg-[#b7e1cd] dark:bg-emerald-900/50';
    if (val >= 0.5) return 'bg-[#f1c232] dark:bg-yellow-900/50';
    return 'bg-[#f4cccc] dark:bg-red-900/40';
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
            <td className={`${tdClass} ${getPctClass(d.PctManual)}`}>
              {d.PctManual ? (d.PctManual * 100).toFixed(2) + '%' : '0.00%'}
            </td>
            <td className={`${tdClass} ${getPctClass(d.PctTVU)}`}>
              {d.PctTVU ? (d.PctTVU * 100).toFixed(2) + '%' : '0.00%'}
            </td>
          </tr>
        );
      }

      return (
        <tr key={`${cat}-${type}`} className="hover:opacity-90">
          <td className={`${tdClass} text-left font-medium ${bgColor}`}>{type}</td>
          <td className={`${tdClass} ${bgColor}`}>{d.TMS || 0}</td>
          <td className={`${tdClass} ${bgColor}`}>{d.Manual || 0}</td>
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
          <td className={`${tdClass} ${getPctClass(t.PctManual)}`}>
            {t.PctManual ? (t.PctManual * 100).toFixed(2) + '%' : '0.00%'}
          </td>
          <td className={`${tdClass} ${getPctClass(t.PctTVU)}`}>
            {t.PctTVU ? (t.PctTVU * 100).toFixed(2) + '%' : '0.00%'}
          </td>
        </tr>,
      ];
    }

    return [
      ...rows,
      <tr key={`${cat}-Total`} className="font-bold">
        <td className={`${tdClass} text-left ${totalBg}`}>
          {translate('summary.tabs.truck_usage.total_used')}
        </td>
        <td className={`${tdClass} ${totalBg}`}>{t.TMS || 0}</td>
        <td className={`${tdClass} ${totalBg}`}>{t.Manual || 0}</td>
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
          <td className={`${tdClass} ${getPctClass(t.PctManual)}`}>
            {t.PctManual ? (t.PctManual * 100).toFixed(2) + '%' : '0.00%'}
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
        <td className={`${tdClass} ${otvBg}`}>{t.Manual || 0}</td>
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
            <th className={`${thClass} w-[200px]`}>{translate('common.vehicle_type')}</th>
            {headerTooltip(translate('summary.tabs.truck_usage.tms'), 'TMS')}
            {headerTooltip(translate('summary.tabs.truck_usage.non_tms'), 'Non TMS')}
            {headerTooltip(translate('summary.tabs.truck_usage.tvu'), 'TVU')}

            {!isPercentage && (
              <>
                {headerTooltip(translate('summary.tabs.truck_usage.tv'), 'TV')}
                {headerTooltip(translate('summary.tabs.truck_usage.tvu_percentage'), '% TVU')}
                {headerTooltip(translate('common.vehicle'), 'V')}
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
