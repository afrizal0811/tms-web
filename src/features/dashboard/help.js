// File: src/features/dashboard/help.js
import { normalizeDeliveryStatus } from '@/lib/deliveryStatus';
import { formatDateUniversal, isEmpty, normalizeEmail, parseCustomerString } from '@/lib/utils';

export const calculateDashboard = (tasksArray, driverMap, isIndonesian) => {
  const keys = [
    'unassigned',
    'ongoing',
    'done',
    'flowDelivery',
    'flowReDelivery',
    'manualAssign',
    'diffDay',
    'success',
    'partial',
    'cancel',
    'pending',
    'pendingGr',
  ];

  const res = {
    totalTasks: tasksArray?.length || 0,
    totalDry: 0,
    totalFrozen: 0,
    assignedDry: 0,
    assignedFrozen: 0,
    assignedTasks: 0,
    taskId: null,
    ongoingList: [],
    manualAssignList: [],
    unassignedList: [],
    diffDayList: [],
    successList: [],
    partialList: [],
    cancelList: [],
    pendingList: [],
    pendingGrList: [],
  };

  keys.forEach((k) => {
    res[k] = 0;
    res[`${k}Dry`] = 0;
    res[`${k}Frozen`] = 0;
  });

  if (isEmpty(tasksArray)) return res;

  const inc = (key, isDry, isFrozen) => {
    res[key]++;
    if (isDry) res[`${key}Dry`]++;
    if (isFrozen) res[`${key}Frozen`]++;
  };

  for (const task of tasksArray) {
    const {
      name: customerName,
      invoiceNumber,
      truncateInvoice,
      isTruncated,
    } = parseCustomerString(task.customerOrder) || 'N/A';

    let rawAssignee = 'N/A';
    if (task.assignee && task.assignee !== '') {
      rawAssignee =
        typeof task.assignee === 'string' ? task.assignee.split(',')[0].trim() : task.assignee;
    }
    let finalAssignee =
      task.driverName || driverMap.get(normalizeEmail(rawAssignee)) || rawAssignee;
    if (finalAssignee === 'N/A') finalAssignee = '-';

    const typeStorage = (task.typeStorage || '').toUpperCase();
    const isDry = typeStorage === 'DRY';
    const isFrozen = typeStorage === 'FROZEN';

    if (isDry) res.totalDry++;
    if (isFrozen) res.totalFrozen++;

    const isAssigned = task.status !== 'UNASSIGNED';
    if (isAssigned) {
      if (isDry) res.assignedDry++;
      if (isFrozen) res.assignedFrozen++;
    }

    const baseData = {
      customer: customerName,
      flow: task.flow || 'N/A',
      soNumber: invoiceNumber || '-',
      truncateSoNumber: truncateInvoice,
      isTruncated,
      driver: finalAssignee,
      taskId: task._id || '-',
    };

    if (task.status === 'DONE') {
      inc('done', isDry, isFrozen);
      const statusDelivery = normalizeDeliveryStatus(task.statusDelivery);

      if (statusDelivery === 'SUCCESS') {
        res.successList.push(baseData);
        inc('success', isDry, isFrozen);
      } else if (statusDelivery === 'PARTIAL') {
        res.partialList.push(baseData);
        inc('partial', isDry, isFrozen);
      } else if (statusDelivery === 'CANCEL') {
        res.cancelList.push(baseData);
        inc('cancel', isDry, isFrozen);
      } else if (statusDelivery === 'PENDING') {
        res.pendingList.push(baseData);
        inc('pending', isDry, isFrozen);
      } else if (statusDelivery === 'PENDING_GR') {
        res.pendingGrList.push(baseData);
        inc('pendingGr', isDry, isFrozen);
      }
    } else if (task.status === 'ONGOING') {
      res.ongoingList.push(baseData);
      inc('ongoing', isDry, isFrozen);
    } else if (task.status === 'UNASSIGNED') {
      res.unassignedList.push(baseData);
      inc('unassigned', isDry, isFrozen);
    }

    const manualCategory = !task.routePlannedOrder || !task.eta || !task.etd;
    if (manualCategory && isAssigned) {
      res.manualAssignList.push(baseData);
      inc('manualAssign', isDry, isFrozen);
    }

    const flow = task.flow || '';
    if (flow === 'Delivery') {
      inc('flowDelivery', isDry, isFrozen);
    } else if (flow.includes('Re Delivery')) {
      inc('flowReDelivery', isDry, isFrozen);
    }

    if (task.status === 'DONE' && task.startTime && task.doneTime) {
      const startDateWIB = formatDateUniversal(task.startTime);
      const doneDateWIB = formatDateUniversal(task.doneTime);
      if (startDateWIB && doneDateWIB && startDateWIB !== doneDateWIB) {
        const startDate = new Date(task.startTime);
        const doneDate = new Date(task.doneTime);
        const diffInDays = Math.ceil((doneDate - startDate) / (1000 * 60 * 60 * 24));
        res.diffDayList.push({
          ...baseData,
          doneDateDisplay: `${doneDateWIB} (${isIndonesian ? 'H+' : 'D+'}${diffInDays})`,
        });
        inc('diffDay', isDry, isFrozen);
      }
    }
  }

  const sortList = (list) => list.sort((a, b) => a.driver.localeCompare(b.driver));
  res.unassignedList.sort((a, b) => a.flow.localeCompare(b.flow));
  [
    'ongoingList',
    'manualAssignList',
    'diffDayList',
    'successList',
    'partialList',
    'cancelList',
    'pendingList',
    'pendingGrList',
  ].forEach((k) => sortList(res[k]));

  res.assignedTasks = res.done + res.ongoing;
  return res;
};
