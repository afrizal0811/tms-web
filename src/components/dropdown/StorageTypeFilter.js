'use client';

import Dropdown from '@/components/Dropdown';

export default function StorageTypeFilter({
  selectedTypes = [],
  onApply,
  disabled = false,
  className = 'w-full',
  t,
}) {
  const handleSelect = (val) => {
    if (val === 'ALL') onApply(['DRY', 'FROZEN']);
    else if (val === 'DRY') onApply(['DRY']);
    else if (val === 'FROZEN') onApply(['FROZEN']);
  };

  const getLabel = () => {
    if (selectedTypes.includes('DRY') && selectedTypes.includes('FROZEN')) return t('common.all');
    if (selectedTypes.includes('DRY')) return 'Dry';
    if (selectedTypes.includes('FROZEN')) return 'Frozen';
    return t('common.all');
  };

  const options = [
    { label: t('common.all'), value: 'ALL' },
    { label: 'Dry', value: 'DRY' },
    { label: 'Frozen', value: 'FROZEN' },
  ];

  const currentValue =
    selectedTypes.includes('DRY') && selectedTypes.includes('FROZEN')
      ? 'ALL'
      : selectedTypes.includes('DRY')
        ? 'DRY'
        : selectedTypes.includes('FROZEN')
          ? 'FROZEN'
          : 'ALL';

  return (
    <Dropdown
      options={options}
      value={currentValue}
      onChange={handleSelect}
      getLabel={getLabel}
      disabled={disabled}
      className={className}
    />
  );
}
