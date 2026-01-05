// File: src/features/dashboard/modals/DailySequenceAccuracyModal.js
'use client';

import BaseModal from '@/components/BaseModal';
import Spinner from '@/components/Spinner';
import { useLanguage } from '@/context/LanguageContext'; // Import Hook
import { memo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const DailyTooltip = ({ active, payload, label, t }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-800 text-white text-xs p-3 rounded shadow-lg border border-slate-600 z-50 w-45">
        <p className="font-bold mb-2 text-sm border-b border-slate-600 pb-1">
          {t('common.date')} {label}
        </p>
        <div className="flex justify-between gap-4 mb-1">
          <span className="text-blue-400">● {t('dashboard.charts.sequence.manual')}</span>
          <span className="font-mono">{data.manual}</span>
        </div>
        <div className="flex justify-between gap-4 mb-1">
          <span className="text-emerald-400">● {t('dashboard.charts.sequence.match')}</span>
          <span className="font-mono">{data.match}</span>
        </div>
        <div className="flex justify-between gap-4 mb-1">
          <span className="text-red-400">● {t('dashboard.charts.sequence.mismatch')}</span>
          <span className="font-mono">{data.mismatch}</span>
        </div>

        <div className="mt-2 pt-1 border-t border-slate-600 font-bold flex flex-col gap-0.5">
          <div className="flex justify-between gap-4">
            <span>{t('common.total_task')}</span>
            <span>{data.total}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>{t('common.accuracy')}</span>
            <span>{data.rate}%</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

function DailySequenceAccuracyModal({ isOpen, onClose, title, data, isLoading }) {
  const { t } = useLanguage(); // Panggil Hook

  if (!isOpen) return null;

  const hasData = Array.isArray(data) && data.length > 0;

  const footerContent = (
    <div className="flex gap-4 font-medium text-xs text-gray-500">
      <div className="flex items-center gap-1.5">
        <span className="w-3 h-3 bg-[#3b82f6] rounded-sm" />
        <span>{t('dashboard.charts.sequence.manual')}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-3 h-3 bg-[#22c55e] rounded-sm" />
        <span>{t('dashboard.charts.sequence.match')}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-3 h-3 bg-[#ef4444] rounded-sm" />
        <span>{t('dashboard.charts.sequence.mismatch')}</span>
      </div>
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
      <div className="h-[400px] w-full">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Spinner />
          </div>
        ) : hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis
                dataKey="name"
                name={t('common.date')}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
                dy={10}
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              {/* Passing props t ke tooltip */}
              <Tooltip content={<DailyTooltip t={t} />} cursor={{ fill: '#f1f5f9' }} />
              <Bar
                name={t('dashboard.charts.sequence.match')}
                dataKey="match"
                stackId="a"
                fill="#22c55e"
                radius={[0, 0, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                name={t('dashboard.charts.sequence.manual')}
                dataKey="manual"
                stackId="a"
                fill="#3b82f6"
                radius={[0, 0, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                name={t('dashboard.charts.sequence.mismatch')}
                dataKey="mismatch"
                stackId="a"
                fill="#ef4444"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            {t('common.no_data_month')}
          </div>
        )}
      </div>
    </BaseModal>
  );
}

export default memo(DailySequenceAccuracyModal);
