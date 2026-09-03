import HighlightText from '@/components/HighlightText';
import Tooltip from '@/components/Tooltip';
import TableData from '@/components/table/TableData';
import {
  checkInvalidSo,
  checkInvalidSoList,
  formatDateUniversal,
  isEmpty,
  parseCustomerString,
} from '@/lib/utils';
import { useCallback, useMemo } from 'react';

export default function CustomTable({
  activeRoute,
  searchQuery,
  setSearchQuery,
  t,
  isDetailView,
  sortConfig,
  setSortConfig,
  onRowClick,
}) {
  const hasManualTaskInRoute = useMemo(
    () => activeRoute.trips.some((trip) => trip.isManual),
    [activeRoute]
  );

  const processedTrips = useMemo(() => {
    const list = [];
    activeRoute.trips.forEach((trip, index) => {
      const isHub = trip.isHub;
      const parsedCust = parseCustomerString(trip.visitName);
      const isBadCust = isEmpty(parsedCust?.id) || isEmpty(parsedCust?.location);

      const outletName = isHub
        ? trip.visitName
        : trip.flow === 'Pickup' && trip.warehouseName
          ? trip.warehouseName
          : parsedCust?.name || trip.visitName;
      const custId = isHub ? '' : parsedCust?.id || '-';
      const locId = isHub ? '' : parsedCust?.location || '-';
      const mapping = trip.soWarehouseMapping || [];

      if (!isHub && isDetailView && mapping.length > 0) {
        mapping.forEach((item, idx) => {
          const letter = mapping.length > 1 ? String.fromCharCode(65 + idx) : '';
          const soPartner = trip.syncDetails?.[item.so] || null;
          list.push({
            ...trip,
            _id: `${trip.visitId || 'trip'}-${index}-${idx}`,
            outletName,
            custId,
            locId,
            displaySo: item.so,
            displayNo: trip.isManual ? '-' : `${trip.routePlannedOrder}${letter}`,
            pickupWh: trip.flow !== 'Pickup' ? item.wh : null,
            isSplit: mapping.length > 1,
            originalIndex: index,
            isUnsync: !!soPartner,
            partnerVehicle: soPartner,
            hasPartner: trip.partnerSOs?.includes(item.so) || false,
            isInvalidSo: checkInvalidSo(item.so, isBadCust),
          });
        });
        return;
      }

      const isInvalidSo = isHub
        ? false
        : checkInvalidSoList(parsedCust?.invoiceNumber || trip.orderId || '', isBadCust);

      const displaySo = isHub
        ? '-'
        : mapping.length > 0
          ? mapping
              .map((item) =>
                item.wh && trip.flow !== 'Pickup' ? `${item.so} (${item.wh})` : item.so
              )
              .join(', ')
          : parsedCust?.invoiceNumber || trip.orderId || '-';

      list.push({
        ...trip,
        _id: `${trip.visitId || 'trip'}-${index}`,
        outletName,
        custId,
        locId,
        displaySo,
        displayNo: isHub ? '' : trip.isManual ? '-' : trip.routePlannedOrder,
        pickupWh: null,
        isSplit: false,
        originalIndex: index,
        hasPartner: trip.hasAnyPartner,
        partnerSOs: trip.partnerSOs,
        isInvalidSo,
      });
    });
    return list;
  }, [activeRoute, isDetailView]);

  const customSort = useCallback(
    (items, currentSortConfig) => {
      const isDefaultSort = currentSortConfig.key === 'no' && currentSortConfig.direction === 'asc';
      const sortedItems = [...items];

      sortedItems.sort((a, b) => {
        if (a.isHub && a.originalIndex === 0) return -1;
        if (b.isHub && b.originalIndex === 0) return 1;
        if (a.isHub && a.originalIndex === activeRoute.trips.length - 1) return 1;
        if (b.isHub && b.originalIndex === activeRoute.trips.length - 1) return -1;

        if (!isDefaultSort) {
          if (a.isMiddleHub && !b.isMiddleHub) return 1;
          if (!a.isMiddleHub && b.isMiddleHub) return -1;
        }

        if (currentSortConfig.key === 'no') {
          const getVal = (item) =>
            item.isMiddleHub
              ? (item.routePlannedOrder ?? 0)
              : parseInt(item.displayNo) || (item.isManual ? 9999 : 0);
          const noA = getVal(a);
          const noB = getVal(b);
          return currentSortConfig.direction === 'asc' ? noA - noB : noB - noA;
        }

        if (currentSortConfig.key === 'so') {
          const soA = String(a.displaySo || '');
          const soB = String(b.displaySo || '');
          return currentSortConfig.direction === 'asc'
            ? soA.localeCompare(soB)
            : soB.localeCompare(soA);
        }
        return 0;
      });
      return sortedItems;
    },
    [activeRoute.trips.length]
  );

  const handleTableRowClick = (row) => {
    const hasPartner = row.hasPartner;
    if (hasPartner && setSearchQuery) {
      const target = row.isSplit
        ? row.displaySo
        : row.partnerSOs?.[0] || row.orderId?.split(',')[0].trim();
      if (target) setSearchQuery(target);
    } else if (onRowClick) {
      onRowClick(row.visitId);
    }
  };

  const getRowClassName = (row) => {
    const isDefaultSort = sortConfig?.key === 'no' && sortConfig?.direction === 'asc';
    const isMisplacedMiddleHub = row.isMiddleHub && !isDefaultSort;

    if (isMisplacedMiddleHub) {
      return 'bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-900/60 transition-colors';
    }
    if (row.isManual) {
      return 'bg-[#E6EEFF] hover:bg-[#C9D9FF] dark:bg-blue-900/40 dark:hover:bg-blue-900/70 transition-colors';
    }
    return 'hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors';
  };

  const getRowTooltip = (row) => {
    const isDefaultSort = sortConfig?.key === 'no' && sortConfig?.direction === 'asc';
    const tooltips = [];
    if (row.isMiddleHub && !isDefaultSort) tooltips.push(t('delivery.tooltip.inaccurate_hub'));
    if (row.hasPartner) tooltips.push(t('delivery.tooltip.find_invoice'));
    if (row.isManual) tooltips.push(t('common.status.manual_assign'));
    if (row.isInvalidSo) tooltips.push(t('delivery.tooltip.invalid_invoice'));
    const tooltip = tooltips.join(', ');
    return tooltip.charAt(0).toUpperCase() + tooltip.slice(1).toLowerCase();
  };

  const columns = [
    {
      key: 'no',
      width: 'w-[7%]',
      sortable: true,
      align: 'center',
      label: 'No.',
      render: (row) => (
        <div className="flex justify-center w-full">
          <p
            className={`text-center w-full ${row.isSplit ? 'text-green-600 dark:text-green-400 font-bold' : row.isManual ? 'text-[#4F76C7] dark:text-blue-400 font-medium' : ''}`}
          >
            {row.displayNo}
          </p>
        </div>
      ),
    },
    {
      key: 'visit',
      width: 'w-[20%]',
      sortable: false,
      label: t('delivery.visit'),
      render: (row) => {
        if (row.isHub) {
          return (
            <div className="text-left w-full">
              <strong className="text-red-600 dark:text-red-300 font-semibold">HUB</strong>
            </div>
          );
        }

        return (
          <div className="flex flex-col gap-0.5 w-full">
            <div className="flex flex-wrap gap-2">
              <HighlightText text={row.outletName || ''} highlight={searchQuery} />
              {row.isReDelivery && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-300 uppercase tracking-tight">
                  Redelivery
                </span>
              )}
              {row.isUnsync && row.partnerVehicle && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-900 tracking-tight shadow-sm">
                  Partner: {row.partnerVehicle}
                </span>
              )}
            </div>
            {isDetailView && row.pickupWh && (
              <span className="text-[10px] text-gray-500 dark:text-slate-400 font-medium leading-none italic text-left">
                ↳ Pickup: {row.pickupWh}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'custId',
      width: 'w-[10%]',
      sortable: false,
      align: 'center',
      label: t('common.customer_id') || 'ID Customer',
      render: (row) => (
        <div className="text-center w-full">
          <p className={row.isHub ? 'text-red-600 dark:text-red-300 font-semibold' : ''}>
            {row.custId}
          </p>
        </div>
      ),
    },
    {
      key: 'locId',
      width: 'w-[10%]',
      sortable: false,
      align: 'center',
      label: t('common.location_id') || 'ID Location',
      render: (row) => (
        <div className="text-center w-full">
          <p className={row.isHub ? 'text-red-600 dark:text-red-300 font-semibold' : ''}>
            {row.locId}
          </p>
        </div>
      ),
    },
    {
      key: 'so',
      width: 'w-[15%]',
      sortable: true,
      align: isDetailView ? 'center' : 'left',
      label: t('common.invoice_number'),
      render: (row) => {
        if (row.isHub) return <div className="text-center w-full"></div>;
        const content = row.isInvalidSo ? (
          <span className="text-red-600 dark:text-red-400 font-bold border-b border-dashed border-red-400">
            <HighlightText text={row.displaySo} highlight={searchQuery} />
          </span>
        ) : (
          <HighlightText text={row.displaySo} highlight={searchQuery} />
        );
        return (
          <div className={isDetailView ? 'text-center w-full' : 'text-left w-full'}>{content}</div>
        );
      },
    },
    {
      key: 'openTime',
      width: 'w-[10%]',
      sortable: false,
      align: 'center',
      label: t('common.open_time'),
      render: (row) => (
        <div className="text-center w-full">{row.isHub ? '' : row.openTime || '-'}</div>
      ),
    },
    {
      key: 'closeTime',
      width: 'w-[10%]',
      sortable: false,
      align: 'center',
      label: t('common.close_time'),
      render: (row) => (
        <div className="text-center w-full">{row.isHub ? '' : row.closeTime || '-'}</div>
      ),
    },
    {
      key: 'eta',
      width: 'w-[10%]',
      sortable: false,
      align: 'center',
      label: t('delivery.est_arrival'),
      render: (row) => {
        const isFirstHub = row.originalIndex === 0 && row.isHub;
        const isLastHub = row.originalIndex === activeRoute.trips.length - 1 && row.isHub;

        if (isFirstHub) return <div className="text-center w-full"></div>;

        const timeStr = row.eta ? formatDateUniversal(row.eta, 'HH:mm') : '-';
        if (isLastHub && hasManualTaskInRoute && row.eta) {
          return (
            <div className="text-center w-full">
              <Tooltip tooltipContent={t('delivery.tooltip.hub_eta')}>
                <span className="underline decoration-dashed decoration-red-600 dark:decoration-red-300 cursor-help text-red-600 dark:text-red-300 font-bold underline-offset-4">
                  {timeStr}
                </span>
              </Tooltip>
            </div>
          );
        }
        return (
          <div className="text-center w-full">
            <p className={row.isHub ? 'text-red-600 dark:text-red-300 font-semibold' : ''}>
              {timeStr}
            </p>
          </div>
        );
      },
    },
    {
      key: 'etd',
      width: 'w-[10%]',
      sortable: false,
      align: 'center',
      label: t('delivery.est_depart'),
      render: (row) => {
        const isLastHub = row.originalIndex === activeRoute.trips.length - 1 && row.isHub;
        return (
          <div className="text-center w-full">
            <p className={row.isHub ? 'text-red-600 dark:text-red-300 font-semibold' : ''}>
              {isLastHub ? '' : row.etd ? formatDateUniversal(row.etd, 'HH:mm') : '-'}
            </p>
          </div>
        );
      },
    },
  ];

  return (
    <TableData
      columns={columns}
      data={processedTrips}
      onRowClick={handleTableRowClick}
      customSort={customSort}
      externalSortConfig={sortConfig}
      onExternalSort={setSortConfig}
      rowClassName={getRowClassName}
      rowTooltip={getRowTooltip}
    />
  );
}
