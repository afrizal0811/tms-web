'use client';

import DatePicker from 'react-datepicker';

export default function CustomDatePicker({
  selected,
  onChange,
  isLoading = false,
  disabled = false,
  dateFormat = 'dd MMMM yyyy',
  maxDate,
  className = '',
  wrapperClassName = 'w-full md:w-auto',
  placeholderText = '',
  // Props sisa (selectsRange, startDate, endDate, showYearPicker, dll)
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

  return (
    <DatePicker
      selected={selected}
      onChange={onChange}
      disabled={isDisabled}
      dateFormat={dateFormat}
      // Default maxDate adalah hari ini, kecuali di-override
      maxDate={maxDate !== undefined ? maxDate : new Date()}
      placeholderText={placeholderText}
      // Classname gabungan
      className={`${baseClasses} ${stateClasses} ${className}`}
      wrapperClassName={wrapperClassName}
      // Default props (bisa ditimpa via ...props)
      dropdownMode="select"
      showMonthDropdown={!props.showYearPicker && !props.showMonthYearPicker}
      showYearDropdown={!props.showYearPicker && !props.showMonthYearPicker}
      {...props}
    />
  );
}
