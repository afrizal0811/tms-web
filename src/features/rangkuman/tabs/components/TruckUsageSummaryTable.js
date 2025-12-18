// File: features/rangkuman/tabs/components/TruckUsageSummaryTable.js
export default function TruckUsageSummaryTable({
  summaryData,
  vehicleTypes,
  isPercentage = false,
}) {
  if (!summaryData) return null;

  const thClass =
    'border border-gray-400 px-2 py-2 text-center text-xs font-bold text-slate-700 bg-[#d9d2e9]';
  const tdClass = 'border border-gray-200 px-2 py-1 text-center text-xs text-slate-700';

  const dryBg = 'bg-[#fae2d5]';
  const frzBg = 'bg-[#dbe9f7]';
  const dryTotBg = 'bg-[#f9cb9c]';
  const frzTotBg = 'bg-[#c9daf8]';
  const otvBg = 'bg-[#d9f2d0]';

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
          <td className={`${tdClass} text-left ${totalBg}`}>Total Used</td>
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
        <td className={`${tdClass} text-left ${totalBg}`}>Total Used</td>
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
          <td className={`${tdClass} text-left ${otvBg}`}>OTV</td>
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
        <td className={`${tdClass} text-left ${otvBg}`}>OTV</td>
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
            <th className={`${thClass} w-[200px]`}>Vehicle Types</th>
            <th className={thClass}>TMS</th>
            <th className={thClass}>Non TMS</th>
            <th className={thClass}>TVU</th>

            {/* HIDE COLUMNS FOR PERCENTAGE TABLE */}
            {!isPercentage && (
              <>
                <th className={thClass}>TV</th>
                <th className={thClass}>% TVU</th>
                <th className={thClass}>V</th>
                <th className={thClass}>VU</th>
                <th className={thClass}>IV</th>
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
