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
  ReferenceLine,
} from 'recharts';
import { DailyMetric } from '../../types';

interface DailyMetricsChartProps {
  dailyMetrics: DailyMetric[];
  height?: number;
}

export const DailyMetricsChart: React.FC<DailyMetricsChartProps> = ({
  dailyMetrics,
  height = 340,
}) => {
  if (!dailyMetrics || dailyMetrics.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-xs font-mono text-slate-400">
        No daily metric trends available
      </div>
    );
  }

  const data = dailyMetrics.map((dm) => {
    // Format date string YYYY-MM-DD -> DD MMM
    let shortDate = dm.date;
    try {
      const parts = dm.date.split('-');
      if (parts.length === 3) {
        const day = parts[2];
        const monthNames = [
          'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
        ];
        const month = monthNames[parseInt(parts[1], 10) - 1] || parts[1];
        shortDate = `${day} ${month}`;
      }
    } catch {
      shortDate = dm.date;
    }

    return {
      date: dm.date,
      dateLabel: shortDate,
      mae: dm.mae_mw,
      bias: dm.bias_mw,
      rmse: dm.rmse_mw,
      sampleCount: dm.sample_count,
    };
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white/95 backdrop-blur-xs p-3 rounded-lg border border-slate-300 shadow-md text-xs font-mono">
          <div className="font-semibold text-slate-800 pb-1 mb-1.5 border-b border-slate-200 flex items-center justify-between gap-4">
            <span>Date: {item.date}</span>
            <span className="text-[10px] text-slate-400">n={item.sampleCount}</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#2d7dd2]" />
                MAE:
              </span>
              <span className="font-semibold text-slate-900">{item.mae.toFixed(1)} MW</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#64748b]" />
                RMSE:
              </span>
              <span className="font-semibold text-slate-900">{item.rmse.toFixed(1)} MW</span>
            </div>
            <div className="flex items-center justify-between gap-4 pt-1 mt-1 border-t border-slate-200">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#f5a623]" />
                Mean Bias:
              </span>
              <span
                className={`font-semibold ${
                  item.bias >= 0 ? 'text-amber-600' : 'text-purple-600'
                }`}
              >
                {item.bias >= 0 ? `+${item.bias.toFixed(1)}` : item.bias.toFixed(1)} MW
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
          <h3 className="text-sm font-semibold text-slate-800">Daily Error & Bias Evolution</h3>
          <p className="text-xs text-slate-500">
            MAE & RMSE magnitudes (left axis) vs Signed Mean Bias (right axis)
          </p>
        </div>
      </div>

      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="dateLabel"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              dy={8}
            />
            {/* Left Axis: Absolute Error Scales (MAE, RMSE) */}
            <YAxis
              yAxisId="left"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              label={{
                value: 'MAE / RMSE (MW)',
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: '#64748b', fontSize: 11 },
                offset: 0,
              }}
              dx={-5}
            />
            {/* Right Axis: Signed Bias Scale */}
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              label={{
                value: 'Mean Bias (MW)',
                angle: 90,
                position: 'insideRight',
                style: { textAnchor: 'middle', fill: '#64748b', fontSize: 11 },
                offset: 0,
              }}
              dx={5}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: '8px', fontSize: '11px', fontFamily: 'monospace' }}
            />
            <ReferenceLine yAxisId="right" y={0} stroke="#cbd5e1" strokeDasharray="2 2" />

            <Line
              yAxisId="left"
              type="monotone"
              dataKey="mae"
              name="MAE (MW)"
              stroke="#2d7dd2"
              strokeWidth={2}
              dot={{ r: 2.5, fill: '#2d7dd2' }}
              activeDot={{ r: 5 }}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="rmse"
              name="RMSE (MW)"
              stroke="#64748b"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              dot={{ r: 2, fill: '#64748b' }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="bias"
              name="Bias (MW)"
              stroke="#f5a623"
              strokeWidth={2}
              dot={{ r: 2.5, fill: '#f5a623' }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
