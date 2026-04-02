// File: src/components/CustomDatePicker.js
'use client';

import { useLanguage } from '@/context/LanguageContext';
import enUS from 'date-fns/locale/en-US';
import id from 'date-fns/locale/id';
import { useRef } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';

registerLocale('id', id);
registerLocale('en', enUS);

export default function CustomDatePicker({
  className = 'w-full xl:w-[250px]! ',
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
  ...props
}) {
  const isDisabled = isLoading || disabled;
  const { lang } = useLanguage();
  const datePickerRef = useRef(null);

  const baseClasses =
    'px-4 py-2.5 h-[42px] rounded-lg border text-center font-medium shadow-sm transition-colors outline-none w-full';
  const stateClasses = isDisabled
    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
    : 'bg-white text-slate-700 cursor-pointer border-gray-300 hover:bg-gray-50';

  const handleFilterDate = (date) => {
    if (disableSunday && date.getDay() === 0) {
      return false;
    }
    if (filterDate) {
      return filterDate(date);
    }
    return true;
  };

  const handleDayClassName = (date) => {
    let classes = [];
    if (date.getDay() === 0) {
      classes.push('!text-[#ff0000] font-bold');
      if (disableSunday) {
        classes.push('!cursor-not-allowed');
      }
    }
    return classes.length > 0 ? classes.join(' ') : undefined;
  };

  const getCustomRangeValue = () => {
    // KUNCI: Hanya jalan jika prop useCustomRangeFormat = true
    if (!useCustomRangeFormat || !selectsRange || !startDate) return undefined;

    const isId = lang === 'id';
    const locale = isId ? 'id-ID' : 'en-GB';

    const sDay = startDate.getDate();
    const sMonthShort = startDate.toLocaleDateString(locale, { month: 'short' });
    const sMonthLong = startDate.toLocaleDateString(locale, { month: 'long' });
    const sYear = startDate.getFullYear();

    if (!endDate) {
      return `${sDay} ${sMonthLong} ${sYear}`;
    }

    const eDay = endDate.getDate();
    const eMonthShort = endDate.toLocaleDateString(locale, { month: 'short' });
    const eYear = endDate.getFullYear();

    if (sYear !== eYear) {
      return `${sDay} ${sMonthShort} ${sYear} - ${eDay} ${eMonthShort} ${eYear}`;
    } else if (sMonthShort !== eMonthShort) {
      return `${sDay} ${sMonthShort} - ${eDay} ${eMonthShort} ${eYear}`;
    } else {
      return `${sDay}-${eDay} ${sMonthLong} ${sYear}`;
    }
  };

  const customValue = getCustomRangeValue();

  return (
    <DatePicker
      ref={datePickerRef}
      locale={lang === 'id' ? 'id' : 'en'}
      className={`${baseClasses} ${stateClasses} ${className}`}
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
      value={customValue}
      {...props}
    >
      {showApplyButton && (
        <div className="flex justify-end pt-2 -mb-4 border-t border-gray-200 bg-white">
          <button
            type="button"
            onClick={() => {
              if (onApply) onApply();
              datePickerRef.current?.setOpen(false);
            }}
            className="px-3 py-1.5 bg-sky-600 text-white text-xs font-medium rounded-md hover:bg-sky-700 transition-colors shadow-sm cursor-pointer"
          >
            {applyText}
          </button>
        </div>
      )}
    </DatePicker>
  );
}
