import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { AlignedObservation } from '../../types';

interface ErrorDistributionChartProps {
  observations: AlignedObservation[];
  height?: number;
  binCount?: number;
}

interface BinData {
  binLabel: string;
  binStart: number;
  binEnd: number;
  binMid: number;
  count: number;
  percentage: number;
}

export const ErrorDistributionChart: React.FC<ErrorDistributionChartProps> = ({
  observations,
  height = 320,
  binCount = 18,
}) => {
  const { bins, mean, median, totalCount } = useMemo(() => {
    const errors = observations
      .map((o) => o.error_mw)
      .filter((e): e is number => e !== null && !isNaN(e))
      .sort((a, b) => a - b);

    if (errors.length === 0) {
      return { bins: [], mean: 0, median: 0, totalCount: 0 };
    }

    const n = errors.length;
    const sum = errors.reduce((acc, v) => acc + v, 0);
    const meanVal = sum / n;
    const midIdx = Math.floor(n / 2);
    const medianVal = n % 2 !== 0 ? errors[midIdx] : (errors[midIdx - 1] + errors[midIdx]) / 2;

    const minErr = errors[0];
    const maxErr = errors[n - 1];

    // If all errors are identical
    if (minErr === maxErr) {
      return {
        bins: [
          {
            binLabel: `${Math.round(minErr)}`,
            binStart: minErr,
            binEnd: maxErr,
            binMid: minErr,
            count: n,
            percentage: 100,
          },
        ],
        mean: meanVal,
        median: medianVal,
        totalCount: n,
      };
    }

    const binSize = (maxErr - minErr) / binCount;
    const computedBins: BinData[] = [];

    for (let i = 0; i < binCount; i++) {
      const bStart = minErr + i * binSize;
      const bEnd = i === binCount - 1 ? maxErr + 0.0001 : minErr + (i + 1) * binSize;
      const bMid = (bStart + bEnd) / 2;
      const count = errors.filter((e) => e >= bStart && e < bEnd).length;
      const pct = (count / n) * 100;

      computedBins.push({
        binLabel: `${Math.round(bMid)}`,
        binStart: bStart,
        binEnd: bEnd,
        binMid: bMid,
        count,
        percentage: pct,
      });
    }

    return { bins: computedBins, mean: meanVal, median: medianVal, totalCount: n };
  }, [observations, binCount]);

  if (bins.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-xs font-mono text-slate-400">
        No error observations available for distribution analysis
      </div>
    );
  }

  // Find the bin closest to the mean / median for reference
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const b: BinData = payload[0].payload;
      return (
        <div className="bg-white/95 backdrop-blur-xs p-3 rounded-lg border border-slate-300 shadow-md text-xs font-mono">
          <div className="font-semibold text-slate-800 pb-1 mb-1.5 border-b border-slate-200">
            Error Range: [{Math.round(b.binStart)} MW to {Math.round(b.binEnd)} MW]
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">Frequency:</span>
              <span className="font-semibold text-slate-900">{b.count} intervals</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">Share of Total:</span>
              <span className="font-semibold text-blue-600">{b.percentage.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Forecast Error Distribution</h3>
          <p className="text-xs text-slate-500">
            Frequency distribution of signed errors (n={totalCount})
          </p>
        </div>
        <div className="flex items-center space-x-4 text-xs font-mono">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-0.5 bg-rose-500" />
            <span className="text-slate-600">
              Mean: <span className="font-semibold">{mean >= 0 ? `+${mean.toFixed(1)}` : mean.toFixed(1)} MW</span>
            </span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-0.5 bg-blue-600" />
            <span className="text-slate-600">
              Median: <span className="font-semibold">{median >= 0 ? `+${median.toFixed(1)}` : median.toFixed(1)} MW</span>
            </span>
          </div>
        </div>
      </div>

      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={bins} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="binLabel"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              label={{
                value: 'Forecast Error Bin (MW)',
                position: 'insideBottom',
                style: { textAnchor: 'middle', fill: '#64748b', fontSize: 11 },
                offset: -12,
              }}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              label={{
                value: 'Interval Count',
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: '#64748b', fontSize: 11 },
                offset: 0,
              }}
              dx={-5}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" maxBarSize={38}>
              {bins.map((b, idx) => (
                <Cell
                  key={`cell-dist-${idx}`}
                  fill={b.binMid >= 0 ? '#f5a623' : '#6c5ce7'}
                  fillOpacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
