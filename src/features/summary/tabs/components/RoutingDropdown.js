import { toastError, toastSuccess } from '@/lib/toast';
import { useEffect, useRef } from 'react';

export default function RoutingDropdown({
  displayText,
  routingNames = [],
  translate,
  position = 'bottom',
  isOpen,
  onToggle,
}) {
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        if (onToggle) onToggle();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onToggle]);

  const handleCopy = async (name) => {
    if (!name) return;
    try {
      await navigator.clipboard.writeText(name);
      toastSuccess(`${translate('common.copied')}: ${name}`);
      setTimeout(() => {
        if (onToggle) onToggle();
      }, 1500);
    } catch (err) {
      toastError(`${translate('common.toast.error')}: ${err.message}`);
    }
  };

  const positionClasses = {
    bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
    right: 'top-1/2 -translate-y-1/2 left-full ml-3',
  };

  return (
    <div className="relative inline-flex items-center justify-center" ref={dropdownRef}>
      <span
        onClick={onToggle}
        className="cursor-pointer border-b-2 border-dotted pb-0.5 transition-colors inline-flex items-center gap-1"
      >
        {displayText}
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </span>

      {isOpen && (
        <div
          className={`absolute ${positionClasses[position]} bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 shadow-xl rounded-md py-1 z-50 min-w-[200px] flex flex-col font-normal text-left`}
        >
          <div className="p-2 font-bold text-slate-700 dark:text-slate-200 border-b border-gray-100 dark:border-slate-700/50 text-center">
            {translate('common.routing_name')}
          </div>
          {routingNames.map((rName, rIdx) => (
            <div
              key={rIdx}
              onClick={() => handleCopy(rName)}
              className="w-full px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs text-slate-700 dark:text-slate-200 cursor-pointer border-b last:border-0 border-gray-100 dark:border-slate-700/50 flex justify-center items-center relative group "
            >
              <span className="truncate pr-2" title={rName}>
                {rName}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
