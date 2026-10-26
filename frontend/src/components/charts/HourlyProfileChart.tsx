import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';
import { HourlyProfile } from '../../types';

interface HourlyProfileChartProps {
  hourlyProfiles: HourlyProfile[];
  height?: number;
}

export const HourlyProfileChart: React.FC<HourlyProfileChartProps> = ({
  hourlyProfiles,
  height = 320,
}) => {
  if (!hourlyProfiles || hourlyProfiles.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-xs font-mono text-slate-400">
        No hourly profile data available
      </div>
    );
  }

  const data = hourlyProfiles.map((hp) => ({
    hour: hp.hour,
    hourLabel: `${String(hp.hour).padStart(2, '0')}:00`,
    meanError: hp.mean_error_mw,
    mae: hp.mean_absolute_error_mw,
    sampleCount: hp.sample_count,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const isOver = item.meanError >= 0;
      return (
        <div className="bg-white/95 backdrop-blur-xs p-3 rounded-lg border border-slate-300 shadow-md text-xs font-mono">
          <div className="font-semibold text-slate-800 pb-1 mb-1.5 border-b border-slate-200 flex items-center justify-between gap-4">
            <span>Hour: {label}</span>
            <span className="text-[10px] text-slate-400">n={item.sampleCount}</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">Mean Bias:</span>
              <span
                className={`font-semibold ${
                  isOver ? 'text-amber-600' : 'text-purple-600'
                }`}
              >
                {isOver ? `+${item.meanError.toFixed(1)}` : item.meanError.toFixed(1)} MW
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">Mean Absolute Error (MAE):</span>
              <span className="font-semibold text-slate-900">
                {item.mae.toFixed(1)} MW
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Diurnal Error Profile (Hour of Day)</h3>
          <p className="text-xs text-slate-500">
            Systematic day-ahead bias across 24 delivery hours (00:00 to 23:00)
          </p>
        </div>
        <div className="flex items-center space-x-3 text-xs font-mono">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#f5a623]" />
            <span className="text-slate-600">Overforecast Bias</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#6c5ce7]" />
            <span className="text-slate-600">Underforecast Bias</span>
          </div>
        </div>
      </div>

      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="hourLabel"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              dy={8}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              label={{
                value: 'Mean Error (MW)',
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: '#64748b', fontSize: 11 },
                offset: 0,
              }}
              dx={-5}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#475569" strokeWidth={1.5} />
            <Bar dataKey="meanError" maxBarSize={28}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.meanError >= 0 ? '#f5a623' : '#6c5ce7'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
