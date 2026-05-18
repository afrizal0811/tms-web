'use client';

import LocationDropdown from '@/components/LocationDropdown';

export default function BranchSelection({
  t,
  tempSelectedLocation,
  handleLocationChange,
  currentHubListView,
  handleSaveLocation,
}) {
  return (
    <div className="text-center w-full">
      <h1 className="text-4xl font-bold">{t('home.welcome')}</h1>
      <h2 className="text-xl mt-2 text-gray-500">{t('home.select_branch')}</h2>
      <LocationDropdown
        value={tempSelectedLocation}
        onChange={handleLocationChange}
        hubsToShow={currentHubListView}
        className="mt-6 p-2 rounded border border-gray-300 w-64"
        placeholder={`-- ${t('home.placeholder')} --`}
        translate={t}
      />
      <div className="mt-4">
        <button
          onClick={handleSaveLocation}
          disabled={!tempSelectedLocation}
          className="px-6 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 disabled:bg-gray-400 cursor-pointer transition-colors text-sm"
        >
          {t('home.select_btn')}
        </button>
      </div>
    </div>
  );
}
