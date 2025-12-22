'use client';

import DatePicker from 'react-datepicker';

export default function CustomDatePicker({
  className = '',
  dateFormat = 'dd MMMM yyyy',
  disableSunday = true,
  disabled = false,
  filterDate,
  isLoading = false,
  maxDate,
  onChange,
  placeholderText = '',
  selected,
  wrapperClassName = 'w-full md:w-auto',
  ...props
}) {
  const isDisabled = isLoading || disabled;

  // Style dasar yang selalu dipakai
  const baseClasses =
    'px-4 py-2.5 h-[42px] rounded-lg border text-center font-medium shadow-sm transition-colors outline-none w-full';

  // Style berdasarkan state (disabled/loading vs aktif)
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
    if (disableSunday && date.getDay() === 0) {
      return '!text-[#ff0000] font-bold !cursor-not-allowed';
    }
    return undefined;
  };

  return (
    <DatePicker
      className={`${baseClasses} ${stateClasses} ${className}`}
      dateFormat={dateFormat}
      dayClassName={handleDayClassName}
      disabled={isDisabled}
      dropdownMode="select"
      filterDate={handleFilterDate}
      maxDate={maxDate !== undefined ? maxDate : new Date()}
      onChange={onChange}
      placeholderText={placeholderText}
      selected={selected}
      showMonthDropdown={!props.showYearPicker && !props.showMonthYearPicker}
      showYearDropdown={!props.showYearPicker && !props.showMonthYearPicker}
      wrapperClassName={wrapperClassName}
      {...props}
    />
  );
}
