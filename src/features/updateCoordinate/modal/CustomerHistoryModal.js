'use client';

import BaseModal from '@/components/BaseModal';
import { useLanguage } from '@/context/LanguageContext';
import { formatLongDate } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';

const MapLoader = () => {
  const { t } = useLanguage();
  return (
    <div className="h-full w-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 font-medium">
      {t('common.loading')}...
    </div>
  );
};

const MapLocation = dynamic(() => import('../components/MapLocation'), {
  ssr: false,
  loading: MapLoader,
});

export default function CustomerHistoryModal({
  isOpen,
  onClose,
  data,
  customerData,
  selectedDate,
}) {
  const { t, lang } = useLanguage();

  const mapData = useMemo(() => {
    if (!data) return [];
    return data.filter((item) => item.newLonglat && item.oldLonglat);
  }, [data]);

  if (!isOpen) return null;

  const headerContent = (
    <div>
      <h3 className="text-lg font-bold">
        {t('longlat.modal.title')} ({formatLongDate(selectedDate, lang)})
      </h3>
      <div className="flex mt-1 font-normal">
        <p className="text-sm text-slate-500 dark:text-slate-300 font-small break-all">
          {customerData}
        </p>
      </div>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={headerContent}
      maxWidth="max-w-5xl"
      contentClassName="h-[80vh] sm:h-[70vh]"
      bodyClassName="p-0 flex flex-col overflow-hidden h-full"
    >
      <div className="w-full h-full bg-slate-50 dark:bg-slate-900 relative shrink-0">
        {mapData.length > 0 ? (
          <div className="absolute inset-0 p-4">
            <MapLocation data={mapData} t={t} lang={lang} />
            <div
              className="absolute bottom-6 left-6 bg-white/90 dark:bg-slate-800/90 backdrop-blur px-3 py-2 rounded shadow text-[10px] border border-gray-200 dark:border-slate-700 dark:text-slate-200"
              style={{ zIndex: 1000 }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span>{t('longlat.modal.new_loc')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 opacity-60"></span>
                <span>{t('longlat.modal.old_loc')}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500 text-sm">
            {t('common.no_data')}
          </div>
        )}
      </div>
    </BaseModal>
  );
}
