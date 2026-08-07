'use client';

import { useLanguage } from '@/context/LanguageContext';
import enUS from 'date-fns/locale/en-US';
import id from 'date-fns/locale/id';
import { useRef } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';

registerLocale('id', id);
registerLocale('en', enUS);

export default function CustomDatePicker({
  className = 'w-full xl:w-[250px]!',
  dateFormat = 'dd MMMM yyyy',
  disableSunday = true,
  disabled = false,
  filterDate,
  isLoading = false,
  maxDate,
  onChange,
  placeholderText = '',
  selected,
  wrapperClassName = 'w-full',
  showApplyButton = false,
  onApply,
  applyText = 'Terapkan',
  selectsRange = false,
  startDate = null,
  endDate = null,
  useCustomRangeFormat = false,
  showDropdowns = true,
  ...props
}) {
  const { localeCode, isIndonesian } = useLanguage();
  const datePickerRef = useRef(null);
  const isDisabled = isLoading || disabled;

  const stateClasses = isDisabled
    ? 'bg-gray-100 dark:bg-slate-800/50 text-gray-400 dark:text-slate-500 cursor-not-allowed border-gray-200 dark:border-slate-700'
    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700';

  const handleFilterDate = (date) =>
    disableSunday && date.getDay() === 0 ? false : filterDate ? filterDate(date) : true;

  const handleDayClassName = (date) =>
    date.getDay() === 0
      ? `!text-[#ff0000] font-bold ${disableSunday ? '!cursor-not-allowed' : ''}`
      : undefined;

  const getCustomRangeValue = () => {
    if (!useCustomRangeFormat || !selectsRange || !startDate) return undefined;

    const sDay = startDate.getDate(),
      sYear = startDate.getFullYear();
    const sMonthS = startDate.toLocaleDateString(localeCode, { month: 'short' });
    const sMonthL = startDate.toLocaleDateString(localeCode, { month: 'long' });

    if (!endDate) return `${sDay} ${sMonthL} ${sYear}`;

    const eDay = endDate.getDate(),
      eYear = endDate.getFullYear();
    const eMonthS = endDate.toLocaleDateString(localeCode, { month: 'short' });

    if (sYear !== eYear) return `${sDay} ${sMonthS} ${sYear} - ${eDay} ${eMonthS} ${eYear}`;
    if (sMonthS !== eMonthS) return `${sDay} ${sMonthS} - ${eDay} ${eMonthS} ${eYear}`;
    return `${sDay}-${eDay} ${sMonthL} ${sYear}`;
  };

  return (
    <DatePicker
      ref={datePickerRef}
      locale={isIndonesian ? 'id' : 'en'}
      className={`px-4 py-2.5 h-[42px] rounded-lg border text-center font-medium shadow-sm transition-colors outline-none w-full ${stateClasses} ${className}`}
      dateFormat={dateFormat}
      disabled={isDisabled}
      filterDate={handleFilterDate}
      dayClassName={handleDayClassName}
      maxDate={maxDate}
      onChange={onChange}
      placeholderText={placeholderText}
      selected={selected}
      startDate={startDate}
      endDate={endDate}
      selectsRange={selectsRange}
      wrapperClassName={wrapperClassName}
      shouldCloseOnSelect={!showApplyButton}
      value={getCustomRangeValue()}
      showMonthDropdown={showDropdowns}
      showYearDropdown={showDropdowns}
      dropdownMode="select"
      popperPlacement="bottom"
      fixedHeight
      {...props}
    >
      {showApplyButton && (
        <div className="flex justify-end pt-2 -mb-4 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-b-lg">
          <button
            type="button"
            onClick={() => {
              onApply?.();
              datePickerRef.current?.setOpen(false);
            }}
            className="px-3 py-1.5 bg-sky-600 dark:bg-sky-700 text-white text-xs font-medium rounded-md hover:bg-sky-700 dark:hover:bg-sky-600 transition-colors shadow-sm cursor-pointer"
          >
            {applyText}
          </button>
        </div>
      )}
    </DatePicker>
  );
}
