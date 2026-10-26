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
import { AlignedObservation } from '../../types';

interface ErrorTimeSeriesChartProps {
  observations: AlignedObservation[];
  height?: number;
}

export const ErrorTimeSeriesChart: React.FC<ErrorTimeSeriesChartProps> = ({
  observations,
  height = 320,
}) => {
  if (!observations || observations.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-xs font-mono text-slate-400">
        No error time series observations to display
      </div>
    );
  }

  const data = observations
    .filter((obs) => obs.error_mw !== null)
    .map((obs) => {
      let timeLabel = `${String(obs.delivery_hour).padStart(2, '0')}:00`;
      if (obs.delivery_start) {
        try {
          const d = new Date(obs.delivery_start);
          timeLabel = d.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/London',
          });
        } catch {
          timeLabel = `${String(obs.delivery_hour).padStart(2, '0')}:00`;
        }
      }

      return {
        timeLabel,
        error: obs.error_mw,
        absError: obs.absolute_error_mw,
        forecast: obs.forecast_mw,
        actual: obs.actual_mw,
        status: obs.status,
      };
    });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const errorVal = item.error;
      const isOver = errorVal >= 0;
      return (
        <div className="bg-white/95 backdrop-blur-xs p-3 rounded-lg border border-slate-300 shadow-md text-xs font-mono">
          <div className="font-semibold text-slate-800 pb-1 mb-1.5 border-b border-slate-200">
            Interval: {label}
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">Classification:</span>
              <span
                className={`font-semibold ${
                  isOver ? 'text-amber-600' : 'text-purple-600'
                }`}
              >
                {isOver ? 'Overforecasting' : 'Underforecasting'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">Signed Error:</span>
              <span className="font-semibold text-slate-900">
                {isOver ? `+${errorVal.toFixed(1)}` : errorVal.toFixed(1)} MW
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">Absolute Error:</span>
              <span className="font-semibold text-slate-900">
                {item.absError !== null ? `${item.absError.toFixed(1)} MW` : '—'}
              </span>
            </div>
            <div className="pt-1 mt-1 border-t border-slate-200 text-[11px] text-slate-500 flex justify-between gap-4">
              <span>F: {item.forecast?.toFixed(1) ?? '—'} MW</span>
              <span>A: {item.actual?.toFixed(1) ?? '—'} MW</span>
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
          <h3 className="text-sm font-semibold text-slate-800">Forecast Error (Signed)</h3>
          <p className="text-xs text-slate-500">
            Positive = Overforecasting (Amber) | Negative = Underforecasting (Purple)
          </p>
        </div>
        <div className="flex items-center space-x-3 text-xs font-mono">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#f5a623]" />
            <span className="text-slate-600">Overforecast</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#6c5ce7]" />
            <span className="text-slate-600">Underforecast</span>
          </div>
        </div>
      </div>

      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="timeLabel"
              stroke="#64748b"
              fontSize={11}
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
                value: 'Error (MW)',
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: '#64748b', fontSize: 11 },
                offset: 0,
              }}
              dx={-5}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#475569" strokeWidth={1.5} />
            <Bar dataKey="error" maxBarSize={32}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={(entry.error ?? 0) >= 0 ? '#f5a623' : '#6c5ce7'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
