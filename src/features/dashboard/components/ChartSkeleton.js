import { useLanguage } from '@/context/LanguageContext';

export default function ChartSkeleton({ title }) {
  const { t } = useLanguage();
  return (
    <div className="w-full bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-[450px] flex flex-col animate-pulse">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-300">{title}</h3>
        <div className="h-4 w-1/3 bg-slate-100 rounded mt-2" />
      </div>
      <div className="flex-1 bg-slate-50 rounded-lg flex items-center justify-center text-slate-300 text-sm">
        {t('common.preparing_chart')}
      </div>
    </div>
  );
}
