import React from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { AlignedObservation } from '../../types';

interface ScatterPlotChartProps {
  observations: AlignedObservation[];
  height?: number;
}

interface ScatterPoint {
  delivery_start: string;
  actual: number;
  forecast: number;
  error: number;
  timeLabel: string;
}

export const ScatterPlotChart: React.FC<ScatterPlotChartProps> = ({
  observations,
  height = 360,
}) => {
  const points: ScatterPoint[] = observations
    .filter((obs) => obs.actual_mw !== null && obs.forecast_mw !== null)
    .map((obs) => {
      let timeLabel = `${String(obs.delivery_hour).padStart(2, '0')}:00`;
      if (obs.delivery_start) {
        try {
          const d = new Date(obs.delivery_start);
          timeLabel = `${d.toISOString().slice(0, 10)} ${String(obs.delivery_hour).padStart(2, '0')}:00`;
        } catch {
          timeLabel = `${obs.delivery_date} ${obs.delivery_hour}:00`;
        }
      }

      return {
        delivery_start: obs.delivery_start,
        actual: obs.actual_mw as number,
        forecast: obs.forecast_mw as number,
        error: obs.error_mw ?? (obs.forecast_mw as number) - (obs.actual_mw as number),
        timeLabel,
      };
    });

  if (points.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-xs font-mono text-slate-400">
        No matched observations available for scatter plot
      </div>
    );
  }

  // Find max value to calibrate 1:1 diagonal line
  const maxActual = Math.max(...points.map((p) => p.actual), 100);
  const maxForecast = Math.max(...points.map((p) => p.forecast), 100);
  const maxDomain = Math.ceil(Math.max(maxActual, maxForecast) * 1.08 / 500) * 500;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: ScatterPoint = payload[0].payload;
      return (
        <div className="bg-white/95 backdrop-blur-xs p-3 rounded-lg border border-slate-300 shadow-md text-xs font-mono">
          <div className="font-semibold text-slate-800 pb-1 mb-1.5 border-b border-slate-200">
            {data.timeLabel}
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">Actual Generation:</span>
              <span className="font-semibold text-emerald-700">{data.actual.toFixed(1)} MW</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">Forecast Generation:</span>
              <span className="font-semibold text-blue-700">{data.forecast.toFixed(1)} MW</span>
            </div>
            <div className="flex items-center justify-between gap-4 pt-1 mt-1 border-t border-slate-200">
              <span className="text-slate-500">Error (F - A):</span>
              <span
                className={`font-semibold ${
                  data.error >= 0 ? 'text-amber-600' : 'text-purple-600'
                }`}
              >
                {data.error >= 0 ? `+${data.error.toFixed(1)}` : data.error.toFixed(1)} MW
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
          <h3 className="text-sm font-semibold text-slate-800">Forecast vs Actual Correlation</h3>
          <p className="text-xs text-slate-500">
            Points on dashed diagonal line indicate perfect accuracy (n={points.length})
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs font-mono text-slate-600">
          <span className="w-3 h-0.5 border-t border-dashed border-slate-500 inline-block"></span>
          <span>1:1 Perfect Line</span>
        </div>
      </div>

      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              type="number"
              dataKey="actual"
              name="Actual"
              unit=" MW"
              domain={[0, maxDomain]}
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              label={{
                value: 'Actual Generation (MW)',
                position: 'insideBottom',
                style: { textAnchor: 'middle', fill: '#64748b', fontSize: 11 },
                offset: -12,
              }}
            />
            <YAxis
              type="number"
              dataKey="forecast"
              name="Forecast"
              unit=" MW"
              domain={[0, maxDomain]}
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              label={{
                value: 'Forecast Generation (MW)',
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: '#64748b', fontSize: 11 },
                offset: 0,
              }}
              dx={-5}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <ReferenceLine
              segment={[
                { x: 0, y: 0 },
                { x: maxDomain, y: maxDomain },
              ]}
              stroke="#94a3b8"
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />
            <Scatter
              name="Deliveries"
              data={points}
              fill="#2d7dd2"
              fillOpacity={0.65}
              stroke="#1e3a5f"
              strokeWidth={0.8}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
