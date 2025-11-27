// File: features/rangkuman/tabs/PendingReasonsTab.js
import { useState, useRef } from 'react';
import Tooltip from '@/components/Tooltip';
import { toastSuccess } from '@/lib/toastHelper';

// --- KONFIGURASI DINAMIS ---
const LOCATIONS_SHOW_PENDING_GR = ['Cikarang', 'Daan Mogot'];

// --- 1. REASON CELL ---
const ReasonCell = ({ text, className }) => {
  const [isTruncated, setIsTruncated] = useState(false);
  const textRef = useRef(null);

  const checkOverflow = () => {
    if (textRef.current) {
      const isOverflow = textRef.current.scrollWidth > textRef.current.clientWidth;
      setIsTruncated(isOverflow);
    }
  };

  const innerContent = (
    <div ref={textRef} className="truncate w-full cursor-default" onMouseEnter={checkOverflow}>
      {text}
    </div>
  );

  return (
    <td className={`${className} text-left max-w-[200px]`}>
      {text && text !== '-' ? (
        isTruncated ? (
          <Tooltip tooltipContent={text}>{innerContent}</Tooltip>
        ) : (
          innerContent
        )
      ) : (
        '-'
      )}
    </td>
  );
};

// --- 2. SO CELL ---
const SOCell = ({ text, content, className, isError, errorMessage }) => {
  if (!text) return <td className={className}></td>;

  const refs = content
    ? content
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const firstRef = refs[0] || '';
  const count = refs.length > 1 ? refs.length - 1 : 0;

  // Default Tooltip
  let tooltipText = count > 0 ? `${firstRef} (+${count})` : firstRef;

  // Jika Error, gunakan pesan error JSX/String
  if (isError && errorMessage) {
    tooltipText = errorMessage;
  }

  const textStyle = isError
    ? 'text-[#FF0000] font-bold border-b border-dotted border-red-500'
    : 'border-b border-dotted border-slate-400 group-hover:border-blue-500';

  const handleCopy = () => {
    if (!firstRef) return;
    const parts = firstRef.split('-');
    const copyText = parts.length > 1 ? parts[1] : firstRef;
    navigator.clipboard.writeText(copyText);
    toastSuccess(`Copied: ${firstRef}`);
  };

  return (
    <td
      className={`${className} cursor-pointer hover:bg-blue-50 transition-colors relative group`}
      onClick={handleCopy}
    >
      {refs.length > 0 || isError ? (
        <Tooltip tooltipContent={tooltipText}>
          <span className={textStyle}>{text}</span>
        </Tooltip>
      ) : (
        text
      )}
    </td>
  );
};

export default function PendingReasonsTab({ data, locationName }) {
  if (!data || data.length === 0) {
    return <div className="p-6 text-center text-gray-400">Tidak ada data Pending Reason.</div>;
  }

  const shouldShowPendingGR = LOCATIONS_SHOW_PENDING_GR.some((loc) =>
    (locationName || '').toLowerCase().includes(loc.toLowerCase())
  );

  const getCustId = (name) => {
    if (!name) return '-';

    // Cari langsung pola C0 diikuti angka
    const match = name.match(/C0\d+/);
    return match ? match[0] : '-';
  };

  const thClass =
    'border border-gray-300 px-2 py-2 bg-sky-600 text-white text-xs font-bold whitespace-nowrap';
  const baseTdClass =
    'px-2 py-2 text-xs text-slate-700 whitespace-nowrap text-center border-r border-r-gray-200 border-l border-l-gray-200';
  const redCellStyle = 'text-red-700 bg-red-100 font-bold';
  const yellowCellStyle = 'text-slate-900 bg-yellow-200 font-bold';

  const renderRedIfEmpty = (val, baseClass) => {
    const isEmpty = !val || val === '-' || val === '';
    if (isEmpty) {
      return <td className={`${baseClass} ${redCellStyle}`}>-</td>;
    }
    return <td className={baseClass}>{val}</td>;
  };

  return (
    <div className="w-full overflow-auto h-full">
      <table className="border-collapse border-0 text-sm whitespace-nowrap min-w-max">
        <thead className="sticky top-0 z-20">
          <tr>
            <th className={thClass}>Flow</th>
            <th className={thClass}>Date</th>
            <th className={thClass}>License Plat</th>
            <th className={thClass}>Driver</th>
            <th className={thClass}>Faktur Batal</th>
            <th className={thClass}>Terkirim Sebagian</th>
            <th className={thClass}>Pending</th>
            {shouldShowPendingGR && <th className={thClass}>Pending GR</th>}
            <th className={thClass}>Reason</th>
            <th className={thClass}>Open Time</th>
            <th className={thClass}>Close Time</th>
            <th className={thClass}>ETA</th>
            <th className={thClass}>ETD</th>
            <th className={thClass}>Actual Arrival</th>
            <th className={thClass}>Actual Departure</th>
            <th className={thClass}>Visit Time</th>
            <th className={thClass}>Actual Visit Time</th>
            <th className={thClass}>Customer ID</th>
            <th className={thClass}>RO Seq</th>
            <th className={thClass}>Real Seq</th>
            <th className={thClass}>Temperature</th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {data.map((item, idx) => {
            const isLastInDate = data[idx + 1]?.dateStr !== item.dateStr;
            const borderBottomClass = isLastInDate
              ? 'border-b-[4px] border-b-slate-400'
              : 'border-b border-b-gray-200';
            const tdClass = `${baseTdClass} ${borderBottomClass}`;

            // --- DETEKSI SALAH STATUS ---
            const isWrongGR = !shouldShowPendingGR && item.status === 'PENDING GR';

            // --- UPDATE: PESAN ERROR MENGGUNAKAN JSX (UNDERLINE) ---
            const errorMsg = (
              <span>
                Driver memilih status yang salah. Seharusnya memilih <u>Pending</u>, bukan{' '}
                <u>Pending GR</u>.
              </span>
            );

            const textBatal = item.status === 'BATAL' ? item.customerName : '';
            const textParsial = item.status === 'TERIMA SEBAGIAN' ? item.customerName : '';

            let textPending = item.status === 'PENDING' ? item.customerName : '';
            if (isWrongGR) {
              textPending = item.customerName;
            }

            const textPendingGR = item.status === 'PENDING GR' ? item.customerName : '';

            return (
              <tr key={idx} className="hover:bg-gray-50">
                <td className={tdClass}>{item.flow || '-'}</td>
                <td className={tdClass}>{item.dateStr}</td>
                <td className={tdClass}>{item.licensePlate}</td>
                <td className={`${tdClass} text-left`}>{item.driverName}</td>

                <SOCell text={textBatal} content={item.content} className={tdClass} />
                <SOCell text={textParsial} content={item.content} className={tdClass} />

                {/* CELL PENDING (Pass JSX errorMsg) */}
                <SOCell
                  text={textPending}
                  content={item.content}
                  className={tdClass}
                  isError={isWrongGR}
                  errorMessage={errorMsg} // Passing JSX
                />

                {shouldShowPendingGR && (
                  <SOCell text={textPendingGR} content={item.content} className={tdClass} />
                )}

                <ReasonCell text={item.alasan} className={tdClass} />
                <td className={tdClass}>{item.openStr || '-'}</td>
                <td className={tdClass}>{item.closeStr || '-'}</td>
                {renderRedIfEmpty(item.etaStr, tdClass)}
                {renderRedIfEmpty(item.etdStr, tdClass)}
                <td className={tdClass}>{item.arrStr || '-'}</td>
                <td className={tdClass}>{item.depStr || '-'}</td>
                <td className={tdClass}>{item.visitTime || '-'}</td>
                <td className={`${tdClass} ${item.actualVisitMins === 0 ? yellowCellStyle : ''}`}>
                  {item.actualVisitMins}
                </td>
                <td className={tdClass}>{getCustId(item.customerName)}</td>
                {renderRedIfEmpty(item.routePlannedOrder, tdClass)}
                <td className={tdClass}>{item.realSequence}</td>
                <td className={tdClass}>{item.temp}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
