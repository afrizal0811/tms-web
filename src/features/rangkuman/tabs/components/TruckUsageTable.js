import Tooltip from '@/components/Tooltip';
import { formatDateUniversal } from '@/lib/utils';
import { Fragment } from 'react';

export default function TruckUsageTable({
  dateMap,
  dateKeys,
  vehicleTypes,
  hubMasterData,
  isPercentage = false,
  translate,
  onCellClick,
}) {
  const colorHeader = '#d9d2e9';
  const colorDry = '#fae2d5';
  const colorDryTotal = '#f9cb9c';
  const colorFrozen = '#dbe9f7';
  const colorFrozenTotal = '#c9daf8';
  const colorOTV = '#d9f2d0';
  const colorSunday = '#ffc7ce';
  const colorAlert = '#FF0000';

  const colorPctLow = '#f4cccc';
  const colorPctMid = '#f1c232';
  const colorPctHigh = '#b7e1cd';
  const colorPctOver = '#ff0000';

  const thClass =
    'border border-gray-400 px-2 py-2 text-center min-w-[60px] text-xs font-bold text-slate-700';
  const tdClass = 'border-b border-gray-200 px-2 py-1 text-center text-xs text-slate-700';
  const thickBorderClass = 'border-r-[3px] border-r-slate-400';

  const todayStr = formatDateUniversal(new Date());

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

  const getDataStyle = (
    baseColor,
    isSunday,
    value,
    masterTotal,
    isDetailRow = false,
    cellType = '',
    otherVal = 0
  ) => {
    const valNum = parseInt(value || 0);
    const maxNum = parseInt(masterTotal || 0);

    if (isPercentage) {
      if (isSunday) return { backgroundColor: colorSunday };
      if (maxNum > 0 && valNum > 0) {
        const pct = (valNum / maxNum) * 100;
        if (pct > 100) return { backgroundColor: colorPctOver, fontWeight: 'bold', color: 'white' };
        if (pct >= 75) return { backgroundColor: colorPctHigh };
        if (pct >= 50) return { backgroundColor: colorPctMid };
        return { backgroundColor: colorPctLow };
      }
      return { backgroundColor: baseColor };
    }

    let isOverLimit = false;
    if (isDetailRow) {
      if (cellType === 'TMS' && valNum > maxNum) isOverLimit = true;
      if (cellType === 'MANUAL' && valNum + parseInt(otherVal || 0) > maxNum) isOverLimit = true;
      if (cellType === 'TVU' && valNum > maxNum) isOverLimit = true;
    }

    if (isOverLimit) return { backgroundColor: colorAlert, fontWeight: 'bold', color: 'white' };
    if (isSunday) return { backgroundColor: colorSunday };

    return { backgroundColor: baseColor };
  };

  const getRowValues = (d, category, label2) => {
    let tmsRaw = 0;
    let manualRaw = 0;
    let manualDesc = '';
    let manualId = null;
    let tmsDetails = [];

    if (category === 'Dry' || category === 'Frozen') {
      tmsRaw = dateMap[d.str][category][label2] || 0;
      tmsDetails = dateMap[d.str][category][`${label2}_details`] || [];

      const manualObj = dateMap[d.str][`${category}Manual`]?.[label2];
      if (manualObj) {
        manualRaw = manualObj.count || 0;
        manualDesc = manualObj.desc || '';
        manualId = manualObj.id || null;
      }
    } else if (category === 'DryTotal' || category === 'FrozenTotal') {
      tmsRaw = dateMap[d.str][category] || 0;
      manualRaw = dateMap[d.str][`${category}Manual`] || 0;

      const actualCat = category.replace('Total', '');
      vehicleTypes.forEach((vt) => {
        const details = dateMap[d.str][actualCat][`${vt}_details`] || [];
        tmsDetails = tmsDetails.concat(details);
      });
    } else if (category === 'OTV') {
      tmsRaw = dateMap[d.str].OTV || 0;
      manualRaw = dateMap[d.str].OTVManual || 0;

      ['Dry', 'Frozen'].forEach((cat) => {
        vehicleTypes.forEach((vt) => {
          const details = dateMap[d.str][cat][`${vt}_details`] || [];
          tmsDetails = tmsDetails.concat(details);
        });
      });
    }

    const tmsDisp = tmsRaw === 0 ? null : tmsRaw;
    const manualDisp = manualRaw === 0 ? null : manualRaw;
    const totalSum = tmsRaw + manualRaw;
    const tvuDisp = totalSum > 0 ? totalSum : null;

    return { tmsDisp, manualDisp, tvuDisp, tmsRaw, manualRaw, manualDesc, manualId, tmsDetails };
  };

  const renderSectionRows = (cat, bgColor, types) => {
    return types.map((type, idx) => {
      const masterTotal = getMasterVal(cat, type);
      return (
        <tr key={`${cat}-${type}`}>
          {idx === 0 && (
            <td
              rowSpan={types.length}
              className={`${tdClass} w-[100px] min-w-[100px] max-w-[100px] font-bold align-middle sticky left-0 z-30 border-r border-gray-300`}
              style={{ backgroundColor: bgColor }}
            >
              {cat}
            </td>
          )}
          <td
            className={`${tdClass} w-[150px] min-w-[150px] max-w-[150px] text-left sticky left-[100px] z-30 border-r border-gray-300`}
            style={{ backgroundColor: bgColor }}
          >
            {type}
          </td>
          <td
            className={`${tdClass} w-[60px] min-w-[60px] font-bold sticky left-[250px] z-30 ${thickBorderClass}`}
            style={{ backgroundColor: bgColor }}
          >
            {masterTotal}
          </td>
          {dateKeys.map((d, i) => {
            const {
              tmsDisp,
              manualDisp,
              tvuDisp,
              tmsRaw,
              manualRaw,
              manualDesc,
              manualId,
              tmsDetails,
            } = getRowValues(d, cat, type);
            const isFuture = d.str > todayStr;

            const isClickableManual = !isPercentage && !isFuture && !d.isSunday;
            const isClickableTMS = !isPercentage && tmsRaw > 0;
            const hasDataManual = manualDisp !== null;

            return (
              <Fragment key={i}>
                <td
                  className={`${getCellClass(false)} relative ${isClickableTMS ? 'cursor-pointer hover:bg-white/50 transition-colors' : ''}`}
                  style={getDataStyle(bgColor, d.isSunday, tmsDisp, masterTotal, true, 'TMS')}
                  onClick={() => {
                    if (isClickableTMS && onCellClick) {
                      onCellClick({
                        isTms: true,
                        date: d.str,
                        storage: cat,
                        type,
                        tmsCount: tmsRaw,
                        tmsDetails: tmsDetails,
                      });
                    }
                  }}
                >
                  {isClickableTMS ? (
                    <div className="relative z-20 w-full min-h-5 flex items-center justify-center text-slate-700 hover:text-slate-800 transition-all group/tms">
                      <span className="inline-block border-b-2 border-dotted border-red-700 px-1 pb-0.5">
                        {formatValue(tmsDisp, masterTotal)}
                      </span>
                    </div>
                  ) : (
                    <div className="relative z-20 w-full min-h-5 flex items-center justify-center">
                      {formatValue(tmsDisp, masterTotal)}
                    </div>
                  )}
                </td>

                <td
                  className={`${getCellClass(false)} relative ${isClickableManual ? 'cursor-pointer group/cell hover:bg-white/5' : ''}`}
                  style={getDataStyle(
                    bgColor,
                    d.isSunday,
                    manualDisp,
                    masterTotal,
                    true,
                    'MANUAL',
                    tmsDisp
                  )}
                  onClick={() => {
                    if (isClickableManual && onCellClick) {
                      onCellClick({
                        isTms: false,
                        date: d.str,
                        storage: cat,
                        type,
                        tmsCount: tmsRaw,
                        manualCount: manualRaw,
                        description: manualDesc,
                        id: manualId,
                        masterTotal: masterTotal || 0,
                      });
                    }
                  }}
                >
                  {isClickableManual && !hasDataManual && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity pointer-events-none z-10">
                      <div className="absolute inset-0 bg-white/30"></div>
                      <span className="relative text-slate-600/30 text-xl font-bold">+</span>
                    </div>
                  )}

                  {hasDataManual ? (
                    <div className="relative z-20 w-full min-h-5 flex items-center justify-center group/edit">
                      <span
                        className={
                          isClickableManual
                            ? `inline-block border-b-2 border-dotted border-red-700 px-1 pb-0.5`
                            : ''
                        }
                      >
                        {formatValue(manualDisp, masterTotal)}
                      </span>
                    </div>
                  ) : undefined}
                </td>

                <td
                  className={getCellClass(true)}
                  style={getDataStyle(bgColor, d.isSunday, tvuDisp, masterTotal, true, 'TVU')}
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

  const renderSpecialRow = (label, cat, bgColor, isBold = false, tooltip, type = '') => {
    const masterTotal = getMasterVal(cat);
    const isInterbranch = type === 'Interbranch';

    const labelTable = (
      <td
        colSpan="2"
        className={`${tooltip && 'cursor-help'} ${tdClass} w-[250px] min-w-[250px] max-w-[250px] text-left font-bold sticky left-0 z-30 border-r border-gray-300 pl-4`}
        style={{ backgroundColor: bgColor }}
      >
        <span className={tooltip && `border-b-2 border-dotted border-red-700 pb-px`}>
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
          className={`${tdClass} w-[60px] min-w-[60px] sticky left-[250px] z-30 ${thickBorderClass}`}
          style={{ backgroundColor: bgColor }}
        >
          {masterTotal}
        </td>
        {dateKeys.map((d, i) => {
          const {
            tmsDisp,
            manualDisp,
            tvuDisp,
            tmsRaw,
            manualRaw,
            manualDesc,
            manualId,
            tmsDetails,
          } = getRowValues(d, cat, type);
          const isFuture = d.str > todayStr;

          const isClickableManual = !isPercentage && !isFuture && isInterbranch && !d.isSunday;
          const isClickableTMS = !isPercentage && tmsRaw > 0;
          const hasDataManual = manualDisp !== null;

          return (
            <Fragment key={i}>
              <td
                className={`${getCellClass(false)} relative ${isClickableTMS ? 'cursor-pointer hover:bg-white/40 transition-colors' : ''}`}
                style={getDataStyle(bgColor, d.isSunday, tmsDisp, masterTotal, false)}
                onClick={() => {
                  if (isClickableTMS && onCellClick) {
                    onCellClick({
                      isTms: true,
                      date: d.str,
                      storage: cat,
                      type: type || 'Gabungan',
                      tmsCount: tmsRaw,
                      tmsDetails: tmsDetails,
                    });
                  }
                }}
              >
                {isClickableTMS ? (
                  <div className="relative z-20 w-full min-h-5 flex items-center justify-center text-slate-700 hover:text-slate-800 transition-all group/tms">
                    <span className="inline-block border-b-2 border-dotted border-red-700 px-1 pb-0.5">
                      {formatValue(tmsDisp, masterTotal)}
                    </span>
                  </div>
                ) : (
                  <div className="relative z-20 w-full min-h-5 flex items-center justify-center">
                    {formatValue(tmsDisp, masterTotal)}
                  </div>
                )}
              </td>

              {isInterbranch ? (
                <td
                  className={`${getCellClass(false)} relative ${isClickableManual ? 'cursor-pointer group/cell hover:bg-white/5' : ''}`}
                  style={getDataStyle(bgColor, d.isSunday, manualDisp, 0, false, 'MANUAL', tmsDisp)}
                  onClick={() => {
                    if (isClickableManual && onCellClick) {
                      onCellClick({
                        isTms: false,
                        date: d.str,
                        storage: cat,
                        type: 'Interbranch',
                        tmsCount: tmsRaw,
                        manualCount: manualRaw,
                        description: manualDesc,
                        id: manualId,
                        masterTotal: 0,
                      });
                    }
                  }}
                >
                  {isClickableManual && !hasDataManual && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity pointer-events-none z-10">
                      <div className="absolute inset-0 bg-white/20"></div>
                      <span className="relative text-slate-600/30 text-xl font-bold">+</span>
                    </div>
                  )}

                  {hasDataManual ? (
                    <div className="relative z-20 w-full min-h-5 flex items-center justify-center group/edit">
                      <span
                        className={
                          isClickableManual
                            ? `inline-block border-b-2 border-dotted border-red-700 px-1 pb-0.5`
                            : ''
                        }
                      >
                        {formatValue(manualDisp, masterTotal)}
                      </span>
                    </div>
                  ) : undefined}
                </td>
              ) : (
                <td
                  className={getCellClass(false)}
                  style={getDataStyle(bgColor, d.isSunday, manualDisp, 0, false)}
                >
                  {formatValue(manualDisp, masterTotal)}
                </td>
              )}

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
              className={`${thClass} w-[100px] min-w-[100px] max-w-[100px] sticky left-0 z-50`}
              style={{ backgroundColor: colorHeader }}
            >
              {translate('common.storage_type')}
            </th>
            <th
              rowSpan="2"
              className={`${thClass} w-[150px] min-w-[150px] max-w-[150px] sticky left-[100px] z-50`}
              style={{ backgroundColor: colorHeader }}
            >
              {translate('summary.tabs.truck_usage.vehicle_type')}
            </th>
            <th
              rowSpan="2"
              className={`${thClass} w-[60px] min-w-[60px] sticky left-[250px] z-50 ${thickBorderClass}`}
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
                {formatDateUniversal(d.str, 'DD-MM-YYYY')}
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
          {renderSectionRows('Dry', colorDry, vehicleTypes)}
          {renderSpecialRow(
            translate('summary.tabs.truck_usage.interbranch'),
            'Dry',
            colorDry,
            false,
            null,
            'Interbranch'
          )}
          {renderSpecialRow(
            translate('summary.tabs.truck_usage.total_used'),
            'DryTotal',
            colorDryTotal,
            true
          )}

          {renderSectionRows('Frozen', colorFrozen, vehicleTypes)}
          {renderSpecialRow(
            translate('summary.tabs.truck_usage.interbranch'),
            'Frozen',
            colorFrozen,
            false,
            null,
            'Interbranch'
          )}
          {renderSpecialRow(
            translate('summary.tabs.truck_usage.total_used'),
            'FrozenTotal',
            colorFrozenTotal,
            true
          )}

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
