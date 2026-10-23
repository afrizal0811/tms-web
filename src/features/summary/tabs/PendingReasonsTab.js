import ConfirmModal from '@/components/modal/ConfirmModal';
import TaskModal from '@/components/modal/TaskModal';
import Tooltip from '@/components/Tooltip';
import { deletePendingDetail, postPendingDetail } from '@/lib/api/mileapp';
import { DELIVERY_STATUS_KEYS, deliveryTooltip } from '@/lib/deliveryStatus';
import { useDeliveryStatus } from '@/lib/hooks/useDeliveryStatus';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError, toastSuccess } from '@/lib/toast';
import { getBasePlate, isEmpty, parseCustomerString } from '@/lib/utils';
import { Fragment, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import AddPendingModal from './modals/AddPendingModal';
import PendingReasonModal from './modals/PendingReasonModal';

const ReasonCell = ({ text, className }) => {
  const [isTruncated, setIsTruncated] = useState(false);
  const textRef = useRef(null);

  const checkOverflow = () => {
    if (textRef.current) {
      setIsTruncated(textRef.current.scrollWidth > textRef.current.clientWidth);
    }
  };

  const innerContent = (
    <div ref={textRef} className="truncate w-full " onMouseEnter={checkOverflow}>
      {text}
    </div>
  );

  return (
    <Tooltip tooltipContent={isTruncated ? text : ''}>
      <td
        className={`${className} text-left max-w-[200px] p-0 ${isTruncated ? 'cursor-help' : 'cursor-default'}`}
      >
        {innerContent}
      </td>
    </Tooltip>
  );
};

const ActionCell = ({ text, className, onClick, isAllEmpty = false, disabled = false }) => {
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
    <div
      ref={textRef}
      className={`truncate w-full ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
      onMouseEnter={checkOverflow}
    >
      {text}
    </div>
  );

  const hasData = text && !isEmpty(text) && text !== '-';

  return (
    <td
      className={`${className} max-w-[150px] ${disabled ? '!cursor-default hover:bg-transparent' : ''}`}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => !disabled && setIsHovered(false)}
    >
      {hasData ? (
        <Tooltip tooltipContent={isTruncated ? text : ''}>{innerContent}</Tooltip>
      ) : (
        <div className="w-full h-full flex items-center justify-center transition-colors">
          {!disabled && isAllEmpty && isHovered ? (
            <span className="relative text-slate-600/30 dark:text-slate-400/30 font-bold">+</span>
          ) : (
            <span className="text-slate-400 dark:text-slate-500">-</span>
          )}
        </div>
      )}
    </td>
  );
};

const StatusCell = ({
  item,
  pd,
  originalStatus,
  currentStatus,
  isModified,
  isWrongGR,
  hasPendingGR,
  formatStatus,
  normalizeStatus,
  isPendingGr,
  translate,
  onUpdatePendingDetail,
  className,
  isConvertedFromSuccess = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingTargetKey, setPendingTargetKey] = useState(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, placeTop: false });
  const cellRef = useRef(null);
  const menuRef = useRef(null);

  const statusLabel = currentStatus ? formatStatus(currentStatus) : '-';
  const tooltipContent = isModified
    ? deliveryTooltip({
        originalStatus,
        pendingDetail: pd,
        formatStatus,
        t: translate,
      })
    : '';

  const updateMenuPosition = () => {
    if (!cellRef.current) return;
    const rect = cellRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownHeight = 180;
    const placeTop = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    setMenuPos({
      top: placeTop ? rect.top - 4 : rect.bottom + 4,
      left: Math.max(10, Math.min(rect.left, window.innerWidth - 180)),
      width: Math.max(140, rect.width),
      placeTop,
    });
  };

  const handleCellClick = (e) => {
    e.stopPropagation();
    if (isUpdating) return;
    if (!isOpen) {
      updateMenuPosition();
    }
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!isOpen) return;

    updateMenuPosition();

    const handleClickOutside = (e) => {
      if (cellRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setIsOpen(false);
    };

    const handleScroll = (e) => {
      if (menuRef.current?.contains(e.target)) return;
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll, true);
    };
  }, [isOpen]);

  const statusList = [
    { key: DELIVERY_STATUS_KEYS.SUCCESS, label: formatStatus(DELIVERY_STATUS_KEYS.SUCCESS) },
    { key: DELIVERY_STATUS_KEYS.PARTIAL, label: formatStatus(DELIVERY_STATUS_KEYS.PARTIAL) },
    { key: DELIVERY_STATUS_KEYS.PENDING, label: formatStatus(DELIVERY_STATUS_KEYS.PENDING) },
    { key: DELIVERY_STATUS_KEYS.CANCEL, label: formatStatus(DELIVERY_STATUS_KEYS.CANCEL) },
  ];
  if (hasPendingGR || isPendingGr(currentStatus) || isPendingGr(originalStatus)) {
    statusList.push({
      key: DELIVERY_STATUS_KEYS.PENDING_GR,
      label: formatStatus(DELIVERY_STATUS_KEYS.PENDING_GR),
    });
  }

  const executeStatusChange = async (targetKey) => {
    setIsUpdating(true);
    try {
      const isOriginal = normalizeStatus(targetKey) === normalizeStatus(originalStatus);
      const newStatusVal = isOriginal ? null : targetKey;
      const isNowSuccess = targetKey === DELIVERY_STATUS_KEYS.SUCCESS;

      const dateParts = item.dateStr.split('-');
      const dbDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
      const { storedUser } = getLocalStorage();
      const userName = storedUser?.name || 'User';

      const hasReasons = Boolean(
        pd.groupReason || pd.detailReason || pd.internalExternal || pd.pic
      );

      const isOriginalSuccess = normalizeStatus(originalStatus) === DELIVERY_STATUS_KEYS.SUCCESS;

      if (newStatusVal === null && (!hasReasons || isOriginalSuccess)) {
        await deletePendingDetail(item._id);
        const delData = { taskId: item._id, deleted: true };
        onUpdatePendingDetail(delData);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tms-pending-details-updated', { detail: delData }));
          try {
            localStorage.setItem('tms_pending_details_last_update', Date.now().toString());
          } catch {}
        }
      } else {
        const payload = {
          taskId: item._id,
          date: dbDate,
          new_status: newStatusVal,
          internalExternal: isNowSuccess ? null : (pd.internalExternal ?? null),
          detailReason: isNowSuccess ? null : (pd.detailReason ?? null),
          groupReason: isNowSuccess ? null : (pd.groupReason ?? null),
          pic: isNowSuccess ? null : (pd.pic ?? null),
          userName,
          created_by: pd.created_by || userName,
          updated_by: userName,
        };

        const res = await postPendingDetail(payload);
        const savedData = res.data || res;
        onUpdatePendingDetail(savedData);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('tms-pending-details-updated', { detail: savedData })
          );
          try {
            localStorage.setItem('tms_pending_details_last_update', Date.now().toString());
          } catch {}
        }
      }
      toastSuccess(translate('common.toast.success'));
      setIsOpen(false);
      setIsConfirmOpen(false);
      setPendingTargetKey(null);
    } catch (err) {
      toastError(translate('common.toast.error', { err: err.message }), err);
      setIsConfirmOpen(false);
      setPendingTargetKey(null);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSelectStatus = (targetKey) => {
    if (normalizeStatus(currentStatus) === normalizeStatus(targetKey)) {
      setIsOpen(false);
      return;
    }

    const isOriginal = normalizeStatus(targetKey) === normalizeStatus(originalStatus);
    if (isOriginal && isModified) {
      setPendingTargetKey(targetKey);
      setIsOpen(false);
      setIsConfirmOpen(true);
      return;
    }

    executeStatusChange(targetKey);
  };

  const handleCancelConfirm = () => {
    if (isUpdating) return;
    setIsConfirmOpen(false);
    setPendingTargetKey(null);
  };

  const handleConfirmRevert = () => {
    if (isUpdating) return;
    executeStatusChange(pendingTargetKey || originalStatus);
  };

  const textStyle = isModified
    ? 'inline-block border-b-2 border-dotted border-red-500 font-bold text-red-600 dark:text-red-400 pb-0.5'
    : isWrongGR
      ? 'inline-block border-b-2 border-dotted border-red-500 font-bold text-[#FF0000] dark:text-red-400 pb-0.5'
      : 'inline-block border-b-2 border-dotted pb-0.5';

  const dropdownStyle = {
    position: 'fixed',
    top: `${menuPos.top}px`,
    left: `${menuPos.left}px`,
    transform: menuPos.placeTop ? 'translateY(-100%)' : 'none',
    minWidth: `${menuPos.width || 140}px`,
    zIndex: 9999,
  };

  const hoverClass = isConvertedFromSuccess
    ? 'hover:bg-amber-200/80 dark:hover:bg-amber-900/60'
    : 'hover:bg-blue-50 dark:hover:bg-slate-700';

  return (
    <>
      <td
        ref={cellRef}
        className={`${className} ${hoverClass} transition-colors cursor-pointer group select-none relative`}
        onClick={handleCellClick}
      >
        <Tooltip tooltipContent={!isOpen && isModified ? tooltipContent : ''}>
          <div className="flex items-center justify-between gap-1 w-full">
            <span className={textStyle}>{statusLabel}</span>
            {isUpdating ? (
              <div className="w-3 h-3 border-2 border-sky-500 border-t-transparent rounded-full animate-spin shrink-0" />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-3 w-3 shrink-0 text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-transform ${
                  isOpen ? 'rotate-180' : ''
                }`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
        </Tooltip>
      </td>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            style={dropdownStyle}
            className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl py-1 text-xs z-[9999] animate-in fade-in zoom-in-95 duration-100"
            onClick={(e) => e.stopPropagation()}
          >
            {statusList.map((opt) => {
              const isSelected = normalizeStatus(currentStatus) === normalizeStatus(opt.key);

              return (
                <button
                  key={opt.key}
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleSelectStatus(opt.key)}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 hover:bg-sky-50 dark:hover:bg-slate-700/80 transition-colors ${
                    isSelected
                      ? 'font-bold text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-slate-700/40'
                      : 'cursor-pointer text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>,
          document.body
        )}

      {isConfirmOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div onClick={(e) => e.stopPropagation()}>
            <ConfirmModal
              isOpen={isConfirmOpen}
              onCancel={handleCancelConfirm}
              onConfirm={handleConfirmRevert}
              loading={isUpdating}
              title={
                translate('summary.tabs.pending_reasons.confirm_revert_title') ||
                'Konfirmasi Pengembalian Status'
              }
              message={translate('summary.tabs.pending_reasons.confirm_revert_message', {
                status: formatStatus(originalStatus),
              })}
            />
          </div>,
          document.body
        )}
    </>
  );
};

const SOCell = ({ text, className, isError, onClick, isConvertedFromSuccess = false }) => {
  if (!text) return <td className={className}></td>;

  const textStyle = isError
    ? 'text-[#FF0000] dark:text-red-400 font-bold border-b border-dotted border-red-500'
    : 'inline-block border-b-2 border-dotted pb-0.5';

  const hoverClass = isConvertedFromSuccess
    ? 'hover:bg-amber-200/80 dark:hover:bg-amber-900/60'
    : 'hover:bg-blue-50 dark:hover:bg-slate-700';

  return (
    <td
      className={`${className} ${hoverClass} transition-colors relative group cursor-pointer`}
      onClick={onClick}
    >
      <span className={textStyle}>{text}</span>
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
  showConvertedSuccess = false,
  allTasks = [],
  dateRange = [null, null],
  driverData = [],
  isAddPendingModalOpen = false,
  onCloseAddSuccessModal = () => {},
  onOpenAddSuccessModal = () => {},
}) {
  const { formatStatus, isPendingGr, normalizeStatus } = useDeliveryStatus();
  const [modalData, setModalData] = useState(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [selectedSuccessTasksMap, setSelectedSuccessTasksMap] = useState(() => new Map());
  const [successModalDate, setSuccessModalDate] = useState(() =>
    dateRange && dateRange[0] ? new Date(dateRange[0]) : new Date()
  );
  const [prevDateRange, setPrevDateRange] = useState(dateRange);

  if (dateRange !== prevDateRange) {
    setPrevDateRange(dateRange);
    setSelectedSuccessTasksMap(new Map());
    if (dateRange && dateRange[0]) {
      setSuccessModalDate(new Date(dateRange[0]));
    }
  }

  const handleRowClick = (taskId) => {
    if (!taskId || taskId === '-') return;

    setSelectedTaskId(taskId);
    setIsTaskModalOpen(true);
  };

  const thClass =
    'border border-gray-300 dark:border-slate-700 px-2 py-2 bg-sky-600 dark:bg-sky-900 text-white text-xs font-bold whitespace-nowrap';
  const baseTdClass =
    'px-2 py-2 text-xs text-slate-700 dark:text-slate-200 whitespace-nowrap text-center border-r border-r-gray-200 dark:border-r-slate-700 border-l border-l-gray-200 dark:border-l-slate-700';
  const redCellStyle = 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-[#4a1c1c] font-bold';
  const yellowCellStyle = 'bg-red-500 text-white dark:bg-red-600 font-bold';

  const tableHeaders = [
    translate('common.flow'),
    translate('common.delivery_date'),
    translate('common.license_number'),
    translate('common.driver'),
    translate('common.customer_name'),
    translate('common.invoice_number'),
    translate('common.status.delivery_status'),
    translate('summary.tabs.pending_reasons.reason'),
    translate('summary.tabs.pending_reasons.group_reason'),
    translate('summary.tabs.pending_reasons.detail'),
    translate('summary.tabs.pending_reasons.category'),
    'PIC',
    translate('common.open_time'),
    translate('common.close_time'),
    translate('common.eta'),
    translate('common.etd'),
    translate('common.actual_arrival'),
    translate('common.actual_departure'),
    translate('common.plan_visit'),
    translate('common.actual_visit'),
    translate('common.plan_seq'),
    translate('common.actual_seq'),
    translate('common.storage_type'),
  ];

  const filteredData = (data || []).filter((item) => {
    const pd = (pendingDetails || []).find((d) => d.taskId === item._id) || item.pendingDetail || {};
    const effectiveDelivery = pd.new_status || item.statusDelivery || item.status;
    const rawOrig =
      item.originalStatus ||
      (allTasks || []).find((t) => t._id === item._id)?.statusDelivery ||
      item.status;
    const isConvertedSuccess =
      normalizeStatus(effectiveDelivery) === DELIVERY_STATUS_KEYS.SUCCESS &&
      normalizeStatus(rawOrig) !== DELIVERY_STATUS_KEYS.SUCCESS;

    if (!showConvertedSuccess && isConvertedSuccess) {
      return false;
    }
    return true;
  });

  return (
    <Fragment>
      <div className="rounded-b-xl overflow-auto m-0 relative">
        <AddPendingModal
          isOpen={isAddPendingModalOpen}
          onClose={() => {
            setSelectedSuccessTasksMap(new Map());
            onCloseAddSuccessModal();
          }}
          allTasks={allTasks}
          dateRange={dateRange}
          driverData={driverData}
          pendingDetails={pendingDetails}
          translate={translate}
          selectedTasksMap={selectedSuccessTasksMap}
          setSelectedTasksMap={setSelectedSuccessTasksMap}
          selectedDate={successModalDate}
          setSelectedDate={setSuccessModalDate}
          onProceed={(selectedTasks) => {
            onCloseAddSuccessModal();
            setModalData(selectedTasks);
          }}
        />

        <PendingReasonModal
          isOpen={!!modalData}
          onClose={() => {
            setModalData(null);
            setSelectedSuccessTasksMap(new Map());
          }}
          data={modalData}
          reasons={reasons || []}
          onSuccess={(res) => {
            setSelectedSuccessTasksMap(new Map());
            onUpdatePendingDetail(res);
          }}
          translate={translate}
          hasPendingGR={hasPendingGR}
          onBack={
            (
              Array.isArray(modalData)
                ? modalData.some((t) => t.isSuccessConversion)
                : Boolean(modalData?.isSuccessConversion)
            )
              ? () => {
                  setModalData(null);
                  onOpenAddSuccessModal();
                }
              : undefined
          }
        />

        <TaskModal
          isOpen={isTaskModalOpen}
          onClose={() => setIsTaskModalOpen(false)}
          taskId={selectedTaskId}
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
            {filteredData.map((item, idx) => {
              const {
                name: customerName,
                invoiceNumber,
                truncateInvoice,
                isTruncated,
              } = parseCustomerString(item.customerOrder || item.customerName);
              const isLastInDate = filteredData[idx + 1]?.dateStr !== item.dateStr;
              const borderBottomClass = isLastInDate
                ? 'border-b-[4px] border-b-slate-400 dark:border-b-slate-600'
                : 'border-b border-b-gray-200 dark:border-b-slate-700';
              const tdClass = `${baseTdClass} ${borderBottomClass}`;
              const pd = (pendingDetails || []).find((d) => d.taskId === item._id) || {};
              const rawTask = (allTasks || []).find((t) => t._id === item._id);
              const origStatus =
                item.originalStatus ||
                (rawTask
                  ? rawTask.statusDelivery?.split(',')[0].trim() || rawTask.status
                  : item.status);
              const currentStatus = pd.new_status || item.status;
              const isConvertedSuccess =
                normalizeStatus(pd.new_status) === DELIVERY_STATUS_KEYS.SUCCESS;
              const isConvertedFromSuccess = Boolean(
                pd.new_status &&
                  normalizeStatus(origStatus) === DELIVERY_STATUS_KEYS.SUCCESS &&
                  normalizeStatus(pd.new_status) !== DELIVERY_STATUS_KEYS.SUCCESS
              );
              const isStatusModified = Boolean(
                pd.new_status && normalizeStatus(pd.new_status) !== normalizeStatus(origStatus)
              );
              const isWrongGR = !hasPendingGR && isPendingGr(currentStatus);

              const hasAnyData = Boolean(
                (pd.groupReason && !isEmpty(pd.groupReason) && pd.groupReason !== '-') ||
                  (pd.detailReason && !isEmpty(pd.detailReason) && pd.detailReason !== '-') ||
                  (pd.internalExternal &&
                    !isEmpty(pd.internalExternal) &&
                    pd.internalExternal !== '-') ||
                  (pd.pic && !isEmpty(pd.pic) && pd.pic !== '-')
              );
              const isAllEmpty = !hasAnyData;
              const actionCellHover = isConvertedFromSuccess
                ? 'hover:bg-amber-200/80 dark:hover:bg-amber-900/60'
                : 'hover:bg-sky-50 dark:hover:bg-slate-700/80';
              const actionCellBase = `${baseTdClass} ${borderBottomClass} cursor-pointer transition-colors`;
              const actionCellClass = isConvertedSuccess
                ? `${baseTdClass} ${borderBottomClass}`
                : isAllEmpty
                  ? `${actionCellBase} bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-900/60`
                  : `${actionCellBase} ${actionCellHover}`;

              const openModal = () =>
                setModalData({
                  ...item,
                  pendingDetail: pd,
                  customer: customerName,
                  isSuccessConversion: isConvertedFromSuccess,
                });

              const rowCells = [
                { type: 'text', val: item.flow || '-' },
                { type: 'text', val: item.dateStr },
                { type: 'text', val: getBasePlate(item.licensePlate) },
                { type: 'text', val: item.driverName, cls: 'text-left' },
                {
                  type: 'detail',
                  val: customerName || '-',
                  id: item._id,
                  cls: 'text-left',
                  isConvertedFromSuccess,
                },
                {
                  type: 'text',
                  val: truncateInvoice || '-',
                  content: invoiceNumber,
                  isTruncated: isTruncated,
                  cls: `text-left ${isTruncated && 'cursor-help'}`,
                },
                {
                  type: 'status',
                  item: item,
                  pd: pd,
                  originalStatus: origStatus,
                  currentStatus: currentStatus,
                  isModified: isStatusModified,
                  isWrongGR: isWrongGR,
                  cls: 'text-left',
                  isConvertedFromSuccess,
                },
                {
                  type: 'reason',
                  val: isConvertedFromSuccess
                    ? pd.detailReason || item.alasan || '-'
                    : item.alasan || '-',
                  cls: 'text-left',
                },
                {
                  type: 'action',
                  val: isConvertedSuccess ? '-' : pd.groupReason,
                  cls: actionCellClass,
                  isAllEmpty,
                  disabled: isConvertedSuccess,
                },
                {
                  type: 'action',
                  val: isConvertedSuccess ? '-' : pd.detailReason,
                  cls: actionCellClass,
                  isAllEmpty,
                  disabled: isConvertedSuccess,
                },
                {
                  type: 'action',
                  val: isConvertedSuccess ? '-' : pd.internalExternal,
                  cls: actionCellClass,
                  isAllEmpty,
                  disabled: isConvertedSuccess,
                },
                {
                  type: 'action',
                  val: isConvertedSuccess ? '-' : pd.pic,
                  cls: actionCellClass,
                  isAllEmpty,
                  disabled: isConvertedSuccess,
                },
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
                { type: 'redEmpty', val: item.routePlannedOrder },
                { type: 'text', val: item.realSequence || '-' },
                { type: 'text', val: item.temp },
              ];

              return (
                <tr
                  key={idx}
                  className={
                    isConvertedFromSuccess
                      ? 'bg-amber-100/60 dark:bg-amber-950/30 hover:bg-amber-100/90 dark:hover:bg-amber-900/40 transition-colors'
                      : 'hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors'
                  }
                >
                  {rowCells.map((cell, cIdx) => {
                    const cellClass = `${tdClass} ${cell.cls || ''}`;

                    if (cell.type === 'detail') {
                      return (
                        <SOCell
                          key={cIdx}
                          text={cell.val}
                          className={cellClass}
                          isError={cell.isError}
                          isConvertedFromSuccess={cell.isConvertedFromSuccess}
                          onClick={() => handleRowClick(cell.id)}
                        />
                      );
                    }
                    if (cell.type === 'status') {
                      return (
                        <StatusCell
                          key={cIdx}
                          item={cell.item}
                          pd={cell.pd}
                          originalStatus={cell.originalStatus}
                          currentStatus={cell.currentStatus}
                          isModified={cell.isModified}
                          isWrongGR={cell.isWrongGR}
                          hasPendingGR={hasPendingGR}
                          formatStatus={formatStatus}
                          normalizeStatus={normalizeStatus}
                          isPendingGr={isPendingGr}
                          translate={translate}
                          onUpdatePendingDetail={onUpdatePendingDetail}
                          className={cellClass}
                          isConvertedFromSuccess={cell.isConvertedFromSuccess}
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
                          isAllEmpty={cell.isAllEmpty}
                          disabled={cell.disabled}
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
                      <Tooltip key={cIdx} tooltipContent={cell.isTruncated ? cell.content : ''}>
                        <td className={cellClass}>{cell.val}</td>
                      </Tooltip>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Fragment>
  );
}
