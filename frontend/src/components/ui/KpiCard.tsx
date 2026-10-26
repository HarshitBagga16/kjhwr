import React, { useState } from 'react';

export interface KpiCardProps {
  label: string;
  value: string | number | null;
  unit: string;
  tooltip?: string;
  sampleCount?: number;
  trend?: 'positive' | 'negative' | 'neutral';
  loading?: boolean;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  unit,
  tooltip,
  sampleCount,
  trend,
  loading = false,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs animate-pulse">
        <div className="h-3 bg-slate-200 rounded w-24 mb-3"></div>
        <div className="h-7 bg-slate-200 rounded w-32 mb-2"></div>
        <div className="h-3 bg-slate-200 rounded w-16"></div>
      </div>
    );
  }

  // Determine trend badge or color if applicable
  const getTrendColor = () => {
    if (trend === 'positive') return 'text-amber-600 bg-amber-50 border-amber-200';
    if (trend === 'negative') return 'text-indigo-600 bg-indigo-50 border-indigo-200';
    return 'text-slate-600 bg-slate-50 border-slate-200';
  };

  const formattedValue =
    value === null || value === undefined
      ? '—'
      : typeof value === 'number'
      ? value.toLocaleString(undefined, {
          minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
          maximumFractionDigits: 1,
        })
      : value;

  return (
    <div className="relative bg-white rounded-lg border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-colors">
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold tracking-wider uppercase text-slate-500">
          {label}
        </span>
        {tooltip && (
          <div className="relative inline-block">
            <button
              type="button"
              className="text-slate-400 hover:text-slate-600 transition-colors cursor-help p-0.5 rounded"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setShowTooltip(!showTooltip)}
              aria-label={`Info about ${label}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth="2" />
                <path strokeWidth="2" d="M12 16v-4m0-4h.01" />
              </svg>
            </button>
            {showTooltip && (
              <div className="absolute right-0 top-6 z-20 w-56 p-2 text-xs font-normal text-slate-700 bg-white rounded-md shadow-lg border border-slate-200 pointer-events-none">
                {tooltip}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-2 flex items-baseline space-x-1.5">
        <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
          {formattedValue}
        </span>
        {unit && (
          <span className="text-xs font-semibold text-slate-500 font-mono">{unit}</span>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
        <div>
          {sampleCount !== undefined && (
            <span className="font-mono text-slate-400">
              n={sampleCount}
            </span>
          )}
        </div>
        {trend && (
          <span
            className={`px-1.5 py-0.5 rounded border text-[10px] font-medium uppercase font-mono ${getTrendColor()}`}
          >
            {trend}
          </span>
        )}
      </div>
    </div>
  );
};
