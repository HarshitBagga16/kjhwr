import React from 'react';

export interface DateSelectorProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  label?: string;
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
}

export const DateSelector: React.FC<DateSelectorProps> = ({
  value,
  onChange,
  label = 'Delivery Date',
  minDate = '2020-01-01',
  maxDate = '2030-12-31',
  disabled = false,
}) => {
  const shiftDay = (delta: number) => {
    try {
      const parts = value.split('-').map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        const d = new Date(parts[0], parts[1] - 1, parts[2] + delta);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const nextStr = `${y}-${m}-${day}`;
        if ((!minDate || nextStr >= minDate) && (!maxDate || nextStr <= maxDate)) {
          onChange(nextStr);
        }
      }
    } catch {
      // fallback
    }
  };

  const handlePrevDay = () => shiftDay(-1);
  const handleNextDay = () => shiftDay(1);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center space-y-1.5 sm:space-y-0 sm:space-x-3">
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 font-mono">
          {label}:
        </label>
      )}
      <div className="flex items-center space-x-1">
        <button
          type="button"
          onClick={handlePrevDay}
          disabled={disabled || value <= minDate}
          className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 transition-colors"
          title="Previous Day"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <input
          type="date"
          value={value}
          min={minDate}
          max={maxDate}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="border border-slate-300 rounded px-2.5 py-1 text-sm bg-white font-mono text-slate-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
        />

        <button
          type="button"
          onClick={handleNextDay}
          disabled={disabled || value >= maxDate}
          className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 transition-colors"
          title="Next Day"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};
