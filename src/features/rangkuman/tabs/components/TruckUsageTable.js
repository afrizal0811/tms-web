// File: features/rangkuman/tabs/components/TruckUsageTable.js
import Tooltip from '@/components/Tooltip';
import { Fragment } from 'react';

export default function TruckUsageTable({
  dateMap,
  dateKeys,
  vehicleTypes,
  hubMasterData,
  isPercentage = false,
  translate,
}) {
  // --- COLORS ---
  const colorHeader = '#d9d2e9';
  const colorDry = '#fae2d5';
  const colorDryTotal = '#f9cb9c';
  const colorFrozen = '#dbe9f7';
  const colorFrozenTotal = '#c9daf8';
  const colorOTV = '#d9f2d0';
  const colorSunday = '#ffc7ce';
  const colorAlert = '#FF0000';

  // --- COLORS FOR PERCENTAGE ---
  const colorPctLow = '#f4cccc'; // 0-49%
  const colorPctMid = '#f1c232'; // 50-74%
  const colorPctHigh = '#b7e1cd'; // 75-100%
  const colorPctOver = '#ff0000'; // > 100%

  // --- STYLES ---
  const thClass =
    'border border-gray-400 px-2 py-2 text-center min-w-[60px] text-xs font-bold text-slate-700';
  const tdClass = 'border-b border-gray-200 px-2 py-1 text-center text-xs text-slate-700';
  const thickBorderClass = 'border-r-[3px] border-r-slate-400';

  const colStorageClass = 'w-[100px] min-w-[100px] max-w-[100px]';
  const colTypeClass = 'w-[150px] min-w-[150px] max-w-[150px]';
  const colTotalClass = 'w-[60px] min-w-[60px]';

  const getCellClass = (isLastCol) => {
    return isLastCol ? `${tdClass} ${thickBorderClass}` : tdClass;
  };

  const getMasterVal = (cat, type) => {
    let val = 0;
    if (cat === 'DryTotal') val = hubMasterData?.Dry?.Total;
    else if (cat === 'FrozenTotal') val = hubMasterData?.Frozen?.Total;
    else if (cat === 'Dry') val = hubMasterData?.Dry?.[type];
    else if (cat === 'Frozen') val = hubMasterData?.Frozen?.[type];
    else if (cat === 'OTV')
      val = (hubMasterData?.Dry?.Total || 0) + (hubMasterData?.Frozen?.Total || 0);

    return val > 0 ? val : null;
  };

  const formatValue = (val, masterTotal) => {
    const numVal = parseInt(val || 0);
    const numMaster = parseInt(masterTotal || 0);

    if (numVal === 0) return null;

    if (isPercentage) {
      if (numMaster === 0) return null;
      const pct = (numVal / numMaster) * 100;
      return `${Math.round(pct)}%`;
    }

    return numVal;
  };

  // --- LOGIKA STYLE CELL ---
  const getDataStyle = (baseColor, isSunday, value, masterTotal, isDetailRow = false) => {
    const valNum = parseInt(value || 0);
    const maxNum = parseInt(masterTotal || 0);

    // === A. LOGIKA TABLE PERCENTAGE ===
    if (isPercentage) {
      if (isSunday) return { backgroundColor: colorSunday };

      // UPDATE: Hapus syarat 'isDetailRow'
      // Sekarang TVU (yang isDetailRow=false) juga akan diwarnai jika nilainya > 0
      if (maxNum > 0 && valNum > 0) {
        const pct = (valNum / maxNum) * 100;

        if (pct > 100) return { backgroundColor: colorPctOver, fontWeight: 'bold', color: 'white' };
        if (pct >= 75) return { backgroundColor: colorPctHigh };
        if (pct >= 50) return { backgroundColor: colorPctMid };
        return { backgroundColor: colorPctLow };
      }

      return { backgroundColor: baseColor };
    }

    // === B. LOGIKA TABLE COUNT ===
    // Tetap gunakan isDetailRow agar baris Total tidak merah jika overlimit
    let isOverLimit = false;
    if (isDetailRow && maxNum > 0 && valNum > maxNum) {
      isOverLimit = true;
    }

    if (isOverLimit) {
      return { backgroundColor: colorAlert, fontWeight: 'bold', color: 'white' };
    }
    if (isSunday) {
      return { backgroundColor: colorSunday };
    }
    return { backgroundColor: baseColor };
  };

  const getRowValues = (d, category, label2) => {
    let tmsRaw = 0;
    if (category === 'Dry' || category === 'Frozen') tmsRaw = dateMap[d.str][category][label2];
    else if (category === 'DryTotal') tmsRaw = dateMap[d.str].DryTotal;
    else if (category === 'FrozenTotal') tmsRaw = dateMap[d.str].FrozenTotal;
    else if (category === 'OTV') tmsRaw = dateMap[d.str].OTV;
    tmsRaw = tmsRaw || 0;

    const nonTmsRaw = 0;

    const tmsDisp = tmsRaw === 0 ? null : tmsRaw;
    const nonTmsDisp = nonTmsRaw === 0 ? null : nonTmsRaw;

    const totalSum = tmsRaw + nonTmsRaw;
    const tvuDisp = totalSum > 0 ? totalSum : null;

    return { tmsDisp, nonTmsDisp, tvuDisp };
  };

  // Render Section Rows (Dry/Frozen Types)
  const renderSectionRows = (cat, bgColor, types) => {
    return types.map((type, idx) => {
      const masterTotal = getMasterVal(cat, type);
      return (
        <tr key={`${cat}-${type}`}>
          {idx === 0 && (
            <td
              rowSpan={types.length}
              className={`${tdClass} ${colStorageClass} font-bold align-middle sticky left-0 z-30 border-r border-gray-300`}
              style={{ backgroundColor: bgColor }}
            >
              {cat}
            </td>
          )}
          <td
            className={`${tdClass} ${colTypeClass} text-left sticky left-[100px] z-30 border-r border-gray-300`}
            style={{ backgroundColor: bgColor }}
          >
            {type}
          </td>
          <td
            className={`${tdClass} ${colTotalClass} font-bold sticky left-[250px] z-30 ${thickBorderClass}`}
            style={{ backgroundColor: bgColor }}
          >
            {masterTotal}
          </td>
          {dateKeys.map((d, i) => {
            const { tmsDisp, nonTmsDisp, tvuDisp } = getRowValues(d, cat, type);
            return (
              <Fragment key={i}>
                <td
                  className={getCellClass(false)}
                  style={getDataStyle(bgColor, d.isSunday, tmsDisp, masterTotal, true)}
                >
                  {formatValue(tmsDisp, masterTotal)}
                </td>
                <td
                  className={getCellClass(false)}
                  style={getDataStyle(bgColor, d.isSunday, nonTmsDisp, 0, false)}
                >
                  {formatValue(nonTmsDisp, masterTotal)}
                </td>
                <td
                  className={getCellClass(true)}
                  style={getDataStyle(bgColor, d.isSunday, tvuDisp, masterTotal, false)}
                >
                  {formatValue(tvuDisp, masterTotal)}
                </td>
              </Fragment>
            );
          })}
        </tr>
      );
    });
  };

  // Render Special Row (Total/Interbranch/OTV)
  const renderSpecialRow = (label, cat, bgColor, isBold = false, tooltip) => {
    const masterTotal = getMasterVal(cat);
    const labelTable = (
      <td
        colSpan="2"
        className={`${tooltip && 'cursor-help'} ${tdClass} w-[250px] min-w-[250px] max-w-[250px] text-left font-bold sticky left-0 z-30 border-r border-gray-300 pl-4`}
        style={{ backgroundColor: bgColor }}
      >
        <span className={tooltip && `border-b-[1.5px] border-dashed border-gray-600 pb-px`}>
          {label}
        </span>
      </td>
    );
    const hasTooltip = tooltip ? (
      <Tooltip tooltipContent={tooltip}>{labelTable}</Tooltip>
    ) : (
      labelTable
    );
    return (
      <tr className={isBold ? 'font-bold' : ''}>
        {hasTooltip}
        <td
          className={`${tdClass} ${colTotalClass} sticky left-[250px] z-30 ${thickBorderClass}`}
          style={{ backgroundColor: bgColor }}
        >
          {masterTotal}
        </td>
        {dateKeys.map((d, i) => {
          const { tmsDisp, nonTmsDisp, tvuDisp } = getRowValues(d, cat, '');
          return (
            <Fragment key={i}>
              <td
                className={getCellClass(false)}
                style={getDataStyle(bgColor, d.isSunday, tmsDisp, masterTotal, false)}
              >
                {formatValue(tmsDisp, masterTotal)}
              </td>
              <td
                className={getCellClass(false)}
                style={getDataStyle(bgColor, d.isSunday, nonTmsDisp, 0, false)}
              >
                {formatValue(nonTmsDisp, masterTotal)}
              </td>
              <td
                className={getCellClass(true)}
                style={getDataStyle(bgColor, d.isSunday, tvuDisp, masterTotal, false)}
              >
                {formatValue(tvuDisp, masterTotal)}
              </td>
            </Fragment>
          );
        })}
      </tr>
    );
  };
  const renderHeader = (data, tooltip, text, isLast = false) => {
    return (
      <Tooltip tooltipContent={tooltip}>
        <th
          className={`${thClass} ${isLast ? thickBorderClass : ''} cursor-help`}
          style={{ backgroundColor: data.isSunday ? colorSunday : colorHeader }}
        >
          {text}
        </th>
      </Tooltip>
    );
  };
  return (
    <div className="w-full">
      <table className="border-collapse border-0 text-sm whitespace-nowrap">
        <thead className="sticky top-0 z-40" style={{ backgroundColor: colorHeader }}>
          <tr>
            <th
              rowSpan="2"
              className={`${thClass} ${colStorageClass} sticky left-0 z-50`}
              style={{ backgroundColor: colorHeader }}
            >
              {translate('summary.tabs.truck_usage.temp')}
            </th>
            <th
              rowSpan="2"
              className={`${thClass} ${colTypeClass} sticky left-[100px] z-50`}
              style={{ backgroundColor: colorHeader }}
            >
              {translate('summary.tabs.truck_usage.vehicle_type')}
            </th>
            <th
              rowSpan="2"
              className={`${thClass} ${colTotalClass} sticky left-[250px] z-50 ${thickBorderClass}`}
              style={{ backgroundColor: colorHeader }}
            >
              Total
            </th>
            {dateKeys.map((d, i) => (
              <th
                key={i}
                colSpan="3"
                className={`${thClass} ${thickBorderClass} min-w-[90px]`}
                style={{ backgroundColor: d.isSunday ? colorSunday : colorHeader }}
              >
                {d.day}
              </th>
            ))}
          </tr>
          <tr>
            {dateKeys.map((d, i) => (
              <Fragment key={i}>
                {renderHeader(d, translate('summary.tabs.truck_usage.tms'), 'TMS')}
                {renderHeader(d, translate('summary.tabs.truck_usage.non_tms'), 'Non TMS')}
                {renderHeader(d, translate('summary.tabs.truck_usage.tvu'), 'TVU', true)}
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* DRY */}
          {renderSectionRows('Dry', colorDry, vehicleTypes)}
          {renderSpecialRow(translate('summary.tabs.truck_usage.interbranch'), 'Dry', colorDry)}
          {renderSpecialRow(
            translate('summary.tabs.truck_usage.total_used'),
            'DryTotal',
            colorDryTotal,
            true
          )}

          {/* FROZEN */}
          {renderSectionRows('Frozen', colorFrozen, vehicleTypes)}
          {renderSpecialRow(
            translate('summary.tabs.truck_usage.interbranch'),
            'Frozen',
            colorFrozen
          )}
          {renderSpecialRow(
            translate('summary.tabs.truck_usage.total_used'),
            'FrozenTotal',
            colorFrozenTotal,
            true
          )}

          {/* OTV */}
          {renderSpecialRow(
            'OTV',
            'OTV',
            colorOTV,
            true,
            translate('summary.tabs.truck_usage.otv')
          )}
        </tbody>
      </table>
    </div>
  );
}
