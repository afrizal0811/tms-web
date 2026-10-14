import Tooltip from '../Tooltip';

export default function InformationButton({ infoText = '', size = '4', className = '' }) {
  return (
    <Tooltip tooltipContent={infoText}>
      <span
        className={`inline-flex items-center cursor-help text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors ${className}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className={`w-${size} h-${size}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      </span>
    </Tooltip>
  );
}
