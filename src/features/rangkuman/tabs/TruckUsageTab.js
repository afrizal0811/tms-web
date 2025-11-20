// File: src/features/rangkuman/tabs/TruckUsageTab.js
import { Fragment } from 'react';

export default function TruckUsageTab({ data }) {
  const { dateMap, dateKeys, vehicleTypes } = data || {};

  if (!dateMap) {
    return <div className="p-6 text-center text-gray-400">Tidak ada data untuk ditampilkan.</div>;
  }

  // --- COLORS ---
  const colorHeader = '#d9d2e9';
  const colorDry = '#fae2d5';
  const colorDryTotal = '#f9cb9c';
  const colorFrozen = '#dbe9f7';
  const colorFrozenTotal = '#c9daf8';
  const colorOTV = '#d9f2d0';
  const colorSunday = '#ffc7ce';

  // --- STYLES ---
  const thClass =
    'border border-gray-400 px-2 py-2 text-center min-w-[60px] text-xs font-bold text-slate-700';
  // Hapus border-r-0 agar default bersih, border bawah tetap ada
  const tdClass = 'border-b border-gray-200 px-2 py-1 text-center text-xs text-slate-700';

  // Border Tebal Kanan (Pemisah Tanggal)
  const thickBorderClass = 'border-r-[3px] border-r-slate-400';

  const getBgStyle = (baseColor, isSunday) => ({
    backgroundColor: isSunday ? colorSunday : baseColor,
  });

  // Helper Cell Class
  const getCellClass = (isLastCol) => {
    return isLastCol ? `${tdClass} ${thickBorderClass}` : tdClass;
  };

  return (
    <div className="w-full overflow-auto max-h-[650px]">
      <table className="border-collapse border-0 text-sm whitespace-nowrap">
        {/* HEADER */}
        <thead className="sticky top-0 z-30" style={{ backgroundColor: colorHeader }}>
          <tr>
            <th
              rowSpan="2"
              className={`${thClass} w-[100px] sticky left-0 z-40`}
              style={{ backgroundColor: colorHeader }}
            >
              Vehicle Storage
            </th>
            <th
              rowSpan="2"
              className={`${thClass} w-[150px] sticky left-[100px] z-40`}
              style={{ backgroundColor: colorHeader }}
            >
              Vehicle Types
            </th>
            {dateKeys.map((d, i) => (
              <th
                key={i}
                colSpan="3"
                className={`${thClass} ${thickBorderClass}`}
                style={getBgStyle(colorHeader, d.isSunday)}
              >
                {d.day}
              </th>
            ))}
          </tr>
          <tr>
            {dateKeys.map((d, i) => (
              <Fragment key={i}>
                <th className={thClass} style={getBgStyle(colorHeader, d.isSunday)}>
                  TMS
                </th>
                <th className={thClass} style={getBgStyle(colorHeader, d.isSunday)}>
                  Non TMS
                </th>
                <th
                  className={`${thClass} ${thickBorderClass}`}
                  style={getBgStyle(colorHeader, d.isSunday)}
                >
                  TVU
                </th>
              </Fragment>
            ))}
          </tr>
        </thead>

        <tbody>
          {/* 1. DRY SECTION */}
          {vehicleTypes.map((type, idx) => (
            <tr key={`dry-${type}`}>
              {idx === 0 ? (
                <td
                  rowSpan={vehicleTypes.length}
                  className={`${tdClass} font-bold align-middle sticky left-0 z-20 border-r border-gray-300`}
                  style={{ backgroundColor: colorDry }}
                >
                  Dry
                </td>
              ) : null}
              <td
                className={`${tdClass} text-left sticky left-[100px] z-20 border-r border-gray-300`}
                style={{ backgroundColor: colorDry }}
              >
                {type}
              </td>

              {dateKeys.map((d, i) => (
                <Fragment key={i}>
                  <td className={getCellClass(false)} style={getBgStyle(colorDry, d.isSunday)}>
                    {dateMap[d.str].Dry[type] || ''}
                  </td>
                  <td className={getCellClass(false)} style={getBgStyle(colorDry, d.isSunday)}></td>
                  <td className={getCellClass(true)} style={getBgStyle(colorDry, d.isSunday)}></td>
                </Fragment>
              ))}
            </tr>
          ))}

          {/* Interbranch Dry */}
          <tr>
            <td
              colSpan="2"
              className={`${tdClass} text-left font-bold sticky left-0 z-20 border-r border-gray-300 pl-4`}
              style={{ backgroundColor: colorDry }}
            >
              Interbranch
            </td>
            {dateKeys.map((d, i) => (
              <Fragment key={i}>
                <td className={getCellClass(false)} style={getBgStyle(colorDry, d.isSunday)}></td>
                <td className={getCellClass(false)} style={getBgStyle(colorDry, d.isSunday)}></td>
                <td className={getCellClass(true)} style={getBgStyle(colorDry, d.isSunday)}></td>
              </Fragment>
            ))}
          </tr>

          {/* Total Dry */}
          <tr className="font-bold">
            <td
              colSpan="2"
              className={`${tdClass} text-left sticky left-0 z-20 border-r border-gray-300 pl-4`}
              style={{ backgroundColor: colorDryTotal }}
            >
              Total Used
            </td>
            {dateKeys.map((d, i) => (
              <Fragment key={i}>
                <td className={getCellClass(false)} style={getBgStyle(colorDryTotal, d.isSunday)}>
                  {dateMap[d.str].DryTotal || ''}
                </td>
                <td
                  className={getCellClass(false)}
                  style={getBgStyle(colorDryTotal, d.isSunday)}
                ></td>
                <td
                  className={getCellClass(true)}
                  style={getBgStyle(colorDryTotal, d.isSunday)}
                ></td>
              </Fragment>
            ))}
          </tr>

          {/* 2. FROZEN SECTION */}
          {vehicleTypes.map((type, idx) => (
            <tr key={`frz-${type}`}>
              {idx === 0 ? (
                <td
                  rowSpan={vehicleTypes.length}
                  className={`${tdClass} font-bold align-middle sticky left-0 z-20 border-r border-gray-300`}
                  style={{ backgroundColor: colorFrozen }}
                >
                  Frozen
                </td>
              ) : null}
              <td
                className={`${tdClass} text-left sticky left-[100px] z-20 border-r border-gray-300`}
                style={{ backgroundColor: colorFrozen }}
              >
                {type}
              </td>
              {dateKeys.map((d, i) => (
                <Fragment key={i}>
                  <td className={getCellClass(false)} style={getBgStyle(colorFrozen, d.isSunday)}>
                    {dateMap[d.str].Frozen[type] || ''}
                  </td>
                  <td
                    className={getCellClass(false)}
                    style={getBgStyle(colorFrozen, d.isSunday)}
                  ></td>
                  <td
                    className={getCellClass(true)}
                    style={getBgStyle(colorFrozen, d.isSunday)}
                  ></td>
                </Fragment>
              ))}
            </tr>
          ))}

          {/* Interbranch Frozen */}
          <tr>
            <td
              colSpan="2"
              className={`${tdClass} text-left font-bold sticky left-0 z-20 border-r border-gray-300 pl-4`}
              style={{ backgroundColor: colorFrozen }}
            >
              Interbranch
            </td>
            {dateKeys.map((d, i) => (
              <Fragment key={i}>
                <td
                  className={getCellClass(false)}
                  style={getBgStyle(colorFrozen, d.isSunday)}
                ></td>
                <td
                  className={getCellClass(false)}
                  style={getBgStyle(colorFrozen, d.isSunday)}
                ></td>
                <td className={getCellClass(true)} style={getBgStyle(colorFrozen, d.isSunday)}></td>
              </Fragment>
            ))}
          </tr>

          {/* Total Frozen */}
          <tr className="font-bold">
            <td
              colSpan="2"
              className={`${tdClass} text-left sticky left-0 z-20 border-r border-gray-300 pl-4`}
              style={{ backgroundColor: colorFrozenTotal }}
            >
              Total Used
            </td>
            {dateKeys.map((d, i) => (
              <Fragment key={i}>
                <td
                  className={getCellClass(false)}
                  style={getBgStyle(colorFrozenTotal, d.isSunday)}
                >
                  {dateMap[d.str].FrozenTotal || ''}
                </td>
                <td
                  className={getCellClass(false)}
                  style={getBgStyle(colorFrozenTotal, d.isSunday)}
                ></td>
                <td
                  className={getCellClass(true)}
                  style={getBgStyle(colorFrozenTotal, d.isSunday)}
                ></td>
              </Fragment>
            ))}
          </tr>

          {/* 3. OTV */}
          <tr className="font-bold">
            <td
              colSpan="2"
              className={`${tdClass} text-left sticky left-0 z-20 border-r border-gray-300 pl-4`}
              style={{ backgroundColor: colorOTV }}
            >
              OTV
            </td>
            {dateKeys.map((d, i) => (
              <Fragment key={i}>
                <td className={getCellClass(false)} style={getBgStyle(colorOTV, d.isSunday)}>
                  {dateMap[d.str].OTV || ''}
                </td>
                <td className={getCellClass(false)} style={getBgStyle(colorOTV, d.isSunday)}></td>
                <td className={getCellClass(true)} style={getBgStyle(colorOTV, d.isSunday)}></td>
              </Fragment>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
