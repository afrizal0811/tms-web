'use client';

import ToggleButton from './ToggleButton';

export default function ThemeToggle({
  label,
  isDarkMode,
  onToggle,
  className,
  isLargeIcon = false,
}) {
  const paddingMargin = isLargeIcon ? '' : 'py-2 mb-1';

  return (
    <div className={`flex items-center justify-between px-3 ${paddingMargin} ${className}`}>
      {label && (
        <span className="font-medium text-slate-700 dark:text-slate-300 mr-4">{label}</span>
      )}
      <ToggleButton
        size={isLargeIcon ? 'lg' : 'sm'}
        options={[
          {
            label: (
              <span className={`${isLargeIcon ? 'text-xl' : 'text-sm'} leading-none`}>🌞</span>
            ),
            value: 'light',
          },
          {
            label: (
              <span className={`${isLargeIcon ? 'text-xl' : 'text-sm'} leading-none`}>🌙</span>
            ),
            value: 'dark',
          },
        ]}
        value={isDarkMode ? 'dark' : 'light'}
        onChange={(val) => {
          const isDark = val === 'dark';
          if (isDark !== isDarkMode) onToggle();
        }}
      />
    </div>
  );
}
