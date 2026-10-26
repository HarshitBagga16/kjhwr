import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceArea,
} from 'recharts';
import { AlignedObservation } from '../../types';

interface ForecastActualChartProps {
  observations: AlignedObservation[];
  height?: number;
}

interface ChartItem {
  timeLabel: string;
  hour: number;
  forecast: number | null;
  actual: number | null;
  error: number | null;
  status: string;
  rawStart: string;
}

export const ForecastActualChart: React.FC<ForecastActualChartProps> = ({
  observations,
  height = 360,
}) => {
  if (!observations || observations.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-xs font-mono text-slate-400">
        No forecast or actual generation observations to display
      </div>
    );
  }

  // Map observations to chart data
  const data: ChartItem[] = observations.map((obs) => {
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
      hour: obs.delivery_hour,
      forecast: obs.forecast_mw,
      actual: obs.actual_mw,
      error: obs.error_mw,
      status: obs.status,
      rawStart: obs.delivery_start,
    };
  });

  // Identify missing data intervals for ReferenceAreas
  const missingIntervals: { start: string; end: string; status: string }[] = [];
  data.forEach((item) => {
    if (item.status !== 'matched') {
      missingIntervals.push({
        start: item.timeLabel,
        end: item.timeLabel,
        status: item.status,
      });
    }
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item: ChartItem = payload[0].payload;
      return (
        <div className="bg-white/95 backdrop-blur-xs p-3 rounded-lg border border-slate-300 shadow-md text-xs font-mono">
          <div className="font-semibold text-slate-800 pb-1 mb-1.5 border-b border-slate-200 flex items-center justify-between gap-4">
            <span>Interval: {label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-normal ${
                item.status === 'matched'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {item.status}
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4 text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#2d7dd2]" />
                Forecast:
              </span>
              <span className="font-semibold text-slate-900">
                {item.forecast !== null ? `${item.forecast.toFixed(1)} MW` : 'Missing'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#28a745]" />
                Actual:
              </span>
              <span className="font-semibold text-slate-900">
                {item.actual !== null ? `${item.actual.toFixed(1)} MW` : 'Missing'}
              </span>
            </div>
            {item.error !== null && (
              <div className="pt-1 mt-1 border-t border-slate-200 flex items-center justify-between gap-4">
                <span className="text-slate-500">Error (F - A):</span>
                <span
                  className={`font-semibold ${
                    item.error > 0
                      ? 'text-amber-600'
                      : item.error < 0
                      ? 'text-indigo-600'
                      : 'text-slate-700'
                  }`}
                >
                  {item.error > 0 ? `+${item.error.toFixed(1)}` : item.error.toFixed(1)} MW
                </span>
              </div>
            )}
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
          <h3 className="text-sm font-semibold text-slate-800">Forecast vs Actual Generation</h3>
          <p className="text-xs text-slate-500">
            Day-ahead hourly forecast (WINDFOR) vs settlement actuals (FUELHH)
          </p>
        </div>
        <div className="flex items-center space-x-3 text-xs font-mono">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-0.5 bg-[#2d7dd2]" />
            <span className="text-slate-600">Forecast</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-0.5 bg-[#28a745]" />
            <span className="text-slate-600">Actual</span>
          </div>
        </div>
      </div>

      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="timeLabel"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              interval="preserveStartEnd"
              dy={8}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              label={{
                value: 'Generation (MW)',
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: '#64748b', fontSize: 11 },
                offset: 0,
              }}
              dx={-5}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="plainline"
              wrapperStyle={{ paddingBottom: '8px', fontSize: '11px', fontFamily: 'monospace' }}
            />

            {missingIntervals.map((miss, idx) => (
              <ReferenceArea
                key={`miss-${idx}`}
                x1={miss.start}
                x2={miss.end}
                fill="#fef3c7"
                fillOpacity={0.4}
                stroke="#f59e0b"
                strokeDasharray="2 2"
              />
            ))}

            <Line
              type="monotone"
              dataKey="forecast"
              name="Forecast MW"
              stroke="#2d7dd2"
              strokeWidth={2}
              dot={{ r: 2.5, fill: '#2d7dd2' }}
              activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="actual"
              name="Actual MW"
              stroke="#28a745"
              strokeWidth={2}
              dot={{ r: 2.5, fill: '#28a745' }}
              activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
