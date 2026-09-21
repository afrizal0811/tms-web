'use client';

import { formatDateUniversal, formatLongDate, formatUTC7, isPastDate } from '@/lib/utils';
import { useMemo, useState } from 'react';
import ServiceLevelSummaryTable from './components/ServiceLevelSummaryTable';
import ServiceLevelTable from './components/ServiceLevelTable';
import ServiceLevelModal from './modals/ServiceLevelModal';

export default function ServiceLevelTab({
  tasks = [],
  driverData = [],
  startDateStr,
  endDateStr,
  translate,
  localeCode,
}) {
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    tasks: [],
    title: '',
    subtitle: '',
  });

  const handleOpenModal = (taskList, storageType, leadTime, displayDate) => {
    if (!taskList || taskList.length === 0) return;

    const isDateRange = typeof displayDate === 'string' && displayDate.includes(' - ');
    const formattedDate = isDateRange ? displayDate : formatLongDate(displayDate, localeCode);
    const dayLabel =
      leadTime !== '' && leadTime !== null && leadTime !== undefined
        ? ` | ${leadTime} ${translate('common.day')}`
        : '';

    setModalConfig({
      isOpen: true,
      tasks: taskList,
      title: `${translate('summary.tabs.service_level.title')} - ${storageType}`,
      subtitle: `${formattedDate}${dayLabel}`,
    });
  };

  const { dateKeys, dateMap, maxDay } = useMemo(() => {
    if (!startDateStr || !endDateStr) return { dateKeys: [], dateMap: {}, maxDay: 7 };

    const keys = [];
    const map = {};
    const [sy, sm, sd] = startDateStr.split('-').map(Number);
    const [ey, em, ed] = endDateStr.split('-').map(Number);
    const curr = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);

    while (curr <= end) {
      const dStr = formatDateUniversal(curr, 'YYYY-MM-DD');
      const isSunday = curr.getDay() === 0;
      keys.push({ str: dStr, isSunday });
      map[dStr] = {
        dateStr: dStr,
        displayDate: formatDateUniversal(curr, 'DD-MM-YYYY'),
        Dry: {},
        Frozen: {},
        dryTasks: [],
        frozenTasks: [],
      };
      curr.setDate(curr.getDate() + 1);
    }

    let detectedMaxDay = 7;

    (tasks || []).forEach((t) => {
      if (t.status !== 'DONE' || !t.createdTime || !t.doneTime) return;

      const createdWib = formatUTC7(t.createdTime, 'YYYY-MM-DD');
      const doneWib = formatUTC7(t.doneTime, 'YYYY-MM-DD');

      if (!map[doneWib]) return;

      const [cy, cm, cd] = createdWib.split('-').map(Number);
      const [dy, dmNum, dd] = doneWib.split('-').map(Number);
      const cDate = new Date(cy, cm - 1, cd);
      const dDate = new Date(dy, dmNum - 1, dd);
      const rawDiff = Math.round((dDate - cDate) / (1000 * 60 * 60 * 24));
      const diffDays = rawDiff <= 0 ? 1 : rawDiff;

      if (diffDays > detectedMaxDay) detectedMaxDay = diffDays;

      const storageType = (t.typeStorage || '').toUpperCase().includes('FROZEN') ? 'Frozen' : 'Dry';

      const dayObj = map[doneWib];
      if (!dayObj[storageType][diffDays]) {
        dayObj[storageType][diffDays] = [];
      }
      dayObj[storageType][diffDays].push(t);

      if (storageType === 'Dry') dayObj.dryTasks.push(t);
      else dayObj.frozenTasks.push(t);
    });

    keys.forEach((k) => {
      const dm = map[k.str];
      const isZero = dm.dryTasks.length === 0 && dm.frozenTasks.length === 0;
      k.isPast = isPastDate(k.str);
      k.isDynamicHoliday = !k.isSunday && k.isPast && isZero;
      k.isHoliday = k.isSunday || k.isDynamicHoliday;
    });

    return { dateKeys: keys, dateMap: map, maxDay: detectedMaxDay };
  }, [tasks, startDateStr, endDateStr]);

  const daysList = useMemo(() => {
    const list = [];
    for (let i = 1; i <= maxDay; i++) list.push(i);
    return list;
  }, [maxDay]);

  const totalRowsCount = daysList.length + 1;

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-slate-800 p-0 overflow-auto">
      <ServiceLevelModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
        tasks={modalConfig.tasks}
        driverData={driverData}
        title={modalConfig.title}
        subtitle={modalConfig.subtitle}
        translate={translate}
      />

      <div className="flex-1 overflow-auto p-0 flex flex-col gap-6">
        <div className="w-full">
          <h3 className="font-bold text-slate-700 dark:text-slate-200 my-2 px-2 ">
            {translate('summary.tabs.service_level.summary_tab')}
          </h3>
          <div className="w-full overflow-x-auto">
            <ServiceLevelSummaryTable
              dateKeys={dateKeys}
              dateMap={dateMap}
              daysList={daysList}
              translate={translate}
              onCellClick={handleOpenModal}
              dateRangeStr={`${formatLongDate(startDateStr, localeCode)} - ${formatLongDate(endDateStr, localeCode)}`}
            />
          </div>
        </div>
        <div className="w-full">
          <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-2 px-2">
            {translate('summary.tabs.service_level.detail_tab')}
          </h3>
          <div className="w-full overflow-x-auto">
            <ServiceLevelTable
              dateKeys={dateKeys}
              dateMap={dateMap}
              daysList={daysList}
              totalRowsCount={totalRowsCount}
              translate={translate}
              onCellClick={handleOpenModal}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
