// File: src/features/dashboard/modals/DailyServiceLevelModal.js
'use client';

import BaseModal from '@/components/BaseModal';
import Spinner from '@/components/Spinner';
import { useLanguage } from '@/context/LanguageContext';
import { memo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

// Update parameter: terima lang dan selectedDate
const DailyTooltip = ({ active, payload, label, t, lang, selectedDate }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    let dayName = '';
    if (selectedDate) {
      try {
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        const day = parseInt(label, 10);
        const dateObj = new Date(year, month, day);
        const locale = lang === 'id' ? 'id-ID' : 'en-GB';
        dayName = dateObj.toLocaleDateString(locale, { weekday: 'long' });
      } catch (e) {
        toastError(t('dashboard.toast.parsing_date_error', { err: e.message }));
      }
    }

    return (
      <div className="bg-slate-800 text-white text-xs p-3 rounded shadow-lg border border-slate-600 z-50 w-45">
        <p className="font-bold mb-2 text-sm border-b border-slate-600 pb-1">
          {t('common.date')} {label} {dayName && `(${dayName})`}
        </p>

        <div className="flex justify-between gap-4 mb-1 text-emerald-400 font-bold">
          <span>● {t('dashboard.charts.service_level.success')}</span>
          <span className="font-mono">{data.SUKSES}</span>
        </div>
        {data.PENDING > 0 && (
          <div className="flex justify-between gap-4 mb-1 text-amber-400">
            <span>● {t('dashboard.charts.service_level.pending')}</span>
            <span className="font-mono">{data.PENDING}</span>
          </div>
        )}
        {data.BATAL > 0 && (
          <div className="flex justify-between gap-4 mb-1 text-red-400">
            <span>● {t('dashboard.charts.service_level.batal')}</span>
            <span className="font-mono">{data.BATAL}</span>
          </div>
        )}
        {data.PARTIAL > 0 && (
          <div className="flex justify-between gap-4 mb-1 text-orange-400">
            <span>● {t('dashboard.charts.service_level.partial')}</span>
            <span className="font-mono">{data.PARTIAL}</span>
          </div>
        )}
        {data.PENDING_GR > 0 && (
          <div className="flex justify-between gap-4 mb-1 text-yellow-600">
            <span>● {t('dashboard.charts.service_level.pending_gr')}</span>
            <span className="font-mono">{data.PENDING_GR}</span>
          </div>
        )}

        <div className="mt-2 pt-1 border-t border-slate-600 font-bold flex justify-between">
          <span>{t('dashboard.charts.service_level.success_rate')}</span>
          <span>{data.rate}%</span>
        </div>
      </div>
    );
  }
  return null;
};

// Update props: terima selectedDate
function DailyServiceLevelModal({ isOpen, onClose, title, data, isLoading, selectedDate }) {
  const { t, lang } = useLanguage(); // Ambil lang

  if (!isOpen) return null;

  const hasData = Array.isArray(data) && data.length > 0;
  const hasPendingGR = hasData && data.some((d) => d.PENDING_GR > 0);

  const footerContent = (
    <div className="flex flex-wrap gap-4 font-medium text-xs text-gray-500">
      <div className="flex items-center gap-1.5">
        <span className="w-3 h-3 bg-[#22c55e] rounded-sm" />
        <span>{t('dashboard.charts.service_level.success')}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-3 h-3 bg-[#eab308] rounded-sm" />
        <span>{t('dashboard.charts.service_level.pending')}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-3 h-3 bg-[#ef4444] rounded-sm" />
        <span>{t('dashboard.charts.service_level.batal')}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-3 h-3 bg-[#f97316] rounded-sm" />
        <span>{t('dashboard.charts.service_level.partial')}</span>
      </div>
      {hasPendingGR && (
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-[#d97706] rounded-sm" />
          <span>{t('dashboard.charts.service_level.pending_gr')}</span>
        </div>
      )}
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="max-w-5xl"
      footer={footerContent}
    >
      <div className="h-[400px] w-full bg-white">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Spinner />
          </div>
        ) : hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis
                dataKey="label"
                name="Tanggal"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
                dy={10}
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              {/* Passing props lang & selectedDate ke tooltip */}
              <Tooltip
                content={<DailyTooltip t={t} lang={lang} selectedDate={selectedDate} />}
                cursor={{ fill: '#f1f5f9' }}
              />

              <Bar
                name={t('dashboard.charts.service_level.success')}
                dataKey="SUKSES"
                stackId="a"
                fill="#22c55e"
                radius={[0, 0, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                name={t('dashboard.charts.service_level.pending')}
                dataKey="PENDING"
                stackId="a"
                fill="#eab308"
                radius={[0, 0, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                name={t('dashboard.charts.service_level.batal')}
                dataKey="BATAL"
                stackId="a"
                fill="#ef4444"
                radius={[0, 0, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                name={t('dashboard.charts.service_level.partial')}
                dataKey="PARTIAL"
                stackId="a"
                fill="#f97316"
                radius={[0, 0, 0, 0]}
                maxBarSize={40}
              />
              {hasPendingGR && (
                <Bar
                  name={t('dashboard.charts.service_level.pending_gr')}
                  dataKey="PENDING_GR"
                  stackId="a"
                  fill="#d97706"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            {t('common.no_data')}
          </div>
        )}
      </div>
    </BaseModal>
  );
}

export default memo(DailyServiceLevelModal);
