import Tooltip from '@/components/Tooltip';
import { toastSuccess } from '@/lib/toastHelper';
import { isEmpty, parseCustomerString, getBasePlate } from '@/lib/utils';
import { useRef, useState } from 'react';
import PendingReasonModal from './modals/PendingReasonModal';

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
      {text && !isEmpty(text) ? (
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

// Komponen ActionCell baru untuk 4 kolom interaktif dengan fitur hover tanda plus (+)
const ActionCell = ({ text, className, onClick }) => {
  const [isTruncated, setIsTruncated] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const textRef = useRef(null);

  const checkOverflow = () => {
    if (textRef.current) {
      const isOverflow = textRef.current.scrollWidth > textRef.current.clientWidth;
      setIsTruncated(isOverflow);
    }
  };

  const innerContent = (
    <div ref={textRef} className="truncate w-full cursor-pointer" onMouseEnter={checkOverflow}>
      {text}
    </div>
  );

  const hasData = text && !isEmpty(text) && text !== '-';

  return (
    <td
      className={`${className} max-w-[150px]`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {hasData ? (
        isTruncated ? (
          <Tooltip tooltipContent={text}>{innerContent}</Tooltip>
        ) : (
          innerContent
        )
      ) : (
        <div className="w-full h-full flex items-center justify-center transition-colors">
          {isHovered ? (
            <span className="inline-block font-bold text-lg leading-none text-sky-600 dark:text-sky-400 transform scale-125 transition-transform duration-200">
              +
            </span>
          ) : (
            <span className="text-slate-400 dark:text-slate-500">-</span>
          )}
        </div>
      )}
    </td>
  );
};

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

  let tooltipText = count > 0 ? `${firstRef} (+${count})` : firstRef;

  if (isError && errorMessage) {
    tooltipText = errorMessage;
  }

  const textStyle = isError
    ? 'text-[#FF0000] dark:text-red-400 font-bold border-b border-dotted border-red-500'
    : 'inline-block border-b-2 border-dotted border-red-700 dark:border-red-400 px-1';

  const handleCopy = () => {
    if (!firstRef) return;
    const parts = firstRef.split('-');
    const copyText = parts.length > 1 ? parts[1] : firstRef;
    navigator.clipboard.writeText(copyText);
    toastSuccess(`Copied: ${firstRef}`);
  };

  return (
    <td
      className={`${className} cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors relative group`}
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

export default function PendingReasonsTab({
  data,
  pendingDetails,
  reasons,
  hasPendingGR,
  translate,
  onUpdatePendingDetail,
}) {
  const shouldShowPendingGR = hasPendingGR;
  const [modalData, setModalData] = useState(null);

  const getCustId = (name) => {
    if (!name) return '-';
    const match = name.match(/C0\d+/);
    return match ? match[0] : '-';
  };

  const thClass =
    'border border-gray-300 dark:border-slate-700 px-2 py-2 bg-sky-600 dark:bg-sky-900 text-white text-xs font-bold whitespace-nowrap';
  const baseTdClass =
    'px-2 py-2 text-xs text-slate-700 dark:text-slate-200 whitespace-nowrap text-center border-r border-r-gray-200 dark:border-r-slate-700 border-l border-l-gray-200 dark:border-l-slate-700';
  const redCellStyle = 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-[#4a1c1c] font-bold';
  const yellowCellStyle =
    'text-slate-900 dark:text-slate-100 bg-yellow-200 dark:bg-[#42311c] font-bold';

  const tableHeaders = [
    translate('common.flow'),
    translate('common.date'),
    translate('common.license_number'),
    translate('common.driver'),
    translate('common.status.cancel'),
    translate('common.status.partial'),
    translate('common.status.pending'),
    ...(shouldShowPendingGR ? [translate('common.status.pending_gr')] : []),
    translate('summary.tabs.pending_reasons.reason'),
    'Internal/External',
    'Detail Reason',
    'Group Reason',
    'PIC',
    translate('common.open_time'),
    translate('common.close_time'),
    translate('common.eta'),
    translate('common.etd'),
    translate('common.actual_arrival'),
    translate('common.actual_departure'),
    translate('common.visit_plan'),
    translate('common.visit_actual'),
    translate('common.customer_id'),
    translate('common.ro_seq'),
    translate('common.actual_seq'),
    translate('common.storage_type'),
  ];

  return (
    <div className="rounded-b-xl overflow-auto m-0 relative">
      <PendingReasonModal
        isOpen={!!modalData}
        onClose={() => setModalData(null)}
        data={modalData}
        reasons={reasons || []}
        onSuccess={onUpdatePendingDetail}
        translate={translate}
      />

      <table className="border-collapse w-full text-sm">
        <thead className="sticky top-0 z-20">
          <tr>
            {tableHeaders.map((header, idx) => (
              <th key={idx} className={thClass}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-slate-800">
          {data.map((item, idx) => {
            const { name: customerName } = parseCustomerString(
              item.customerName || item.customerOrder
            );
            const isLastInDate = data[idx + 1]?.dateStr !== item.dateStr;
            const borderBottomClass = isLastInDate
              ? 'border-b-[4px] border-b-slate-400 dark:border-b-slate-600'
              : 'border-b border-b-gray-200 dark:border-b-slate-700';
            const tdClass = `${baseTdClass} ${borderBottomClass}`;

            const isWrongGR = !shouldShowPendingGR && item.status === 'PENDING GR';
            const errorMsg = <span>{translate('summary.tabs.pending_reasons.warning')}</span>;

            const textBatal = item.status === 'BATAL' ? customerName : '';
            const textParsial = item.status === 'TERIMA SEBAGIAN' ? customerName : '';
            let textPending = item.status === 'PENDING' ? customerName : '';

            if (isWrongGR) {
              textPending = item.customerName;
            }

            const textPendingGR = item.status === 'PENDING GR' ? customerName : '';

            // Cari data detail dari props
            const pd = (pendingDetails || []).find((d) => d.taskId === item._id) || {};
            const isAllEmpty =
              !pd.internalExternal && !pd.detailReason && !pd.groupReason && !pd.pic;
            const actionCellBase = `${baseTdClass} ${borderBottomClass} cursor-pointer transition-colors`;
            const actionCellClass = isAllEmpty
              ? `${actionCellBase} bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-900/60`
              : `${actionCellBase} hover:bg-sky-50 dark:hover:bg-slate-700/80`;

            const openModal = () =>
              setModalData({ ...item, pendingDetail: pd, customer: customerName });

            const rowCells = [
              { type: 'text', val: item.flow || '-' },
              { type: 'text', val: item.dateStr },
              { type: 'text', val: getBasePlate(item.licensePlate) },
              { type: 'text', val: item.driverName, cls: 'text-left' },
              { type: 'so', val: textBatal, content: item.content },
              { type: 'so', val: textParsial, content: item.content },
              { type: 'so', val: textPending, content: item.content, isError: isWrongGR, errorMsg },
              ...(shouldShowPendingGR
                ? [{ type: 'so', val: textPendingGR, content: item.content }]
                : []),
              { type: 'reason', val: item.alasan },
              { type: 'action', val: pd.internalExternal, cls: actionCellClass },
              { type: 'action', val: pd.detailReason, cls: actionCellClass },
              { type: 'action', val: pd.groupReason, cls: actionCellClass },
              { type: 'action', val: pd.pic, cls: actionCellClass },
              { type: 'text', val: item.openStr || '-' },
              { type: 'text', val: item.closeStr || '-' },
              { type: 'redEmpty', val: item.etaStr },
              { type: 'redEmpty', val: item.etdStr },
              { type: 'text', val: item.arrStr || '-' },
              { type: 'text', val: item.depStr || '-' },
              { type: 'text', val: item.visitTime || '-' },
              {
                type: 'text',
                val: item.actualVisitMins,
                cls: item.actualVisitMins === 0 ? yellowCellStyle : '',
              },
              { type: 'text', val: getCustId(item.customerName) },
              { type: 'redEmpty', val: item.routePlannedOrder },
              { type: 'text', val: item.realSequence },
              { type: 'text', val: item.temp },
            ];

            return (
              <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                {rowCells.map((cell, cIdx) => {
                  const cellClass = `${tdClass} ${cell.cls || ''}`;

                  if (cell.type === 'so') {
                    return (
                      <SOCell
                        key={cIdx}
                        text={cell.val}
                        content={cell.content}
                        className={cellClass}
                        isError={cell.isError}
                        errorMessage={cell.errorMsg}
                      />
                    );
                  }
                  if (cell.type === 'reason') {
                    return <ReasonCell key={cIdx} text={cell.val} className={cellClass} />;
                  }
                  if (cell.type === 'action') {
                    return (
                      <ActionCell
                        key={cIdx}
                        text={cell.val}
                        className={cell.cls}
                        onClick={openModal}
                      />
                    );
                  }
                  if (cell.type === 'redEmpty') {
                    return (
                      <td
                        key={cIdx}
                        className={isEmpty(cell.val) ? `${cellClass} ${redCellStyle}` : cellClass}
                      >
                        {isEmpty(cell.val) ? '-' : cell.val}
                      </td>
                    );
                  }
                  return (
                    <td key={cIdx} className={cellClass}>
                      {cell.val}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
