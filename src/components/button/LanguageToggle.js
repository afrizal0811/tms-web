'use client';

import { useLanguage } from '@/context/LanguageContext';
import ToggleButton from './ToggleButton';

export default function LanguageToggle({ className = '', showLabel = false, isLargeIcon = false }) {
  const { isIndonesian, switchLanguage, t } = useLanguage();

  const handleToggle = (val) => {
    if ((val === 'id') !== isIndonesian) {
      switchLanguage(val);
      window.location.reload();
    }
  };

  return (
    <div className={`flex items-center justify-between px-3 py-2 ${className}`}>
      {showLabel && (
        <span className="font-medium text-slate-700 dark:text-slate-300 mr-4">
          {t('common.language')}
        </span>
      )}
      <ToggleButton
        size={isLargeIcon ? 'lg' : 'sm'}
        options={[
          { label: 'EN', value: 'en' },
          { label: 'ID', value: 'id' },
        ]}
        value={isIndonesian ? 'id' : 'en'}
        onChange={handleToggle}
      />
    </div>
  );
}
