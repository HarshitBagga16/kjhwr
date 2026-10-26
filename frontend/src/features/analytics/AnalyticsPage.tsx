import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { AnalyticsSummary, AlignedObservation } from '../../types';
import { KpiCard } from '../../components/ui/KpiCard';
import { DailyMetricsChart } from '../../components/charts/DailyMetricsChart';
import { HourlyProfileChart } from '../../components/charts/HourlyProfileChart';
import { ErrorDistributionChart } from '../../components/charts/ErrorDistributionChart';
import { ScatterPlotChart } from '../../components/charts/ScatterPlotChart';
import { ErrorTimeSeriesChart } from '../../components/charts/ErrorTimeSeriesChart';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';

export const AnalyticsPage: React.FC = () => {
  const [fromDate, setFromDate] = useState<string>('2026-01-01');
  const [toDate, setToDate] = useState<string>('2026-01-31');
  const [activeTab, setActiveTab] = useState<'trends' | 'diurnal' | 'distribution' | 'scatter' | 'all'>('trends');

  const [summaryData, setSummaryData] = useState<AnalyticsSummary | null>(null);
  const [errorObservations, setErrorObservations] = useState<AlignedObservation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, errorsRes] = await Promise.all([
        api.getAnalyticsSummary(fromDate, toDate),
        api.getErrors(fromDate, toDate),
      ]);
      setSummaryData(summaryRes);
      const errList = errorsRes.errors ?? (errorsRes as unknown as { series?: AlignedObservation[] }).series ?? [];
      setErrorObservations(errList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate]);

  const metrics = summaryData?.metrics;

  const biasTrend =
    metrics?.bias_mw !== null && metrics?.bias_mw !== undefined
      ? metrics.bias_mw > 0
        ? 'positive'
        : metrics.bias_mw < 0
        ? 'negative'
        : 'neutral'
      : undefined;

  const handlePreset = (start: string, end: string) => {
    setFromDate(start);
    setToDate(end);
  };

  return (
    <div className="space-y-6">
      {/* Analytics Control Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 font-mono">
            Forecast Accuracy Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Statistical performance evaluation, diurnal bias profiles, and error distributions
          </p>
        </div>

        {/* Date Filter & Presets */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick presets */}
          <div className="inline-flex rounded-md shadow-2xs text-xs font-mono">
            <button
              type="button"
              onClick={() => handlePreset('2026-01-01', '2026-01-31')}
              className={`px-2.5 py-1 rounded-l-md border text-xs font-medium transition-colors ${
                fromDate === '2026-01-01' && toDate === '2026-01-31'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              Full Jan
            </button>
            <button
              type="button"
              onClick={() => handlePreset('2026-01-01', '2026-01-15')}
              className={`px-2.5 py-1 border-t border-b text-xs font-medium transition-colors ${
                fromDate === '2026-01-01' && toDate === '2026-01-15'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              Jan 1-15
            </button>
            <button
              type="button"
              onClick={() => handlePreset('2026-01-16', '2026-01-31')}
              className={`px-2.5 py-1 rounded-r-md border text-xs font-medium transition-colors ${
                fromDate === '2026-01-16' && toDate === '2026-01-31'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              Jan 16-31
            </button>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono">
            <input
              type="date"
              value={fromDate}
              max={toDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 bg-white text-slate-800 shadow-2xs focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={toDate}
              min={fromDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 bg-white text-slate-800 shadow-2xs focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            type="button"
            onClick={() => api.exportCsv(fromDate, toDate)}
            className="inline-flex items-center px-3 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-xs font-mono font-medium text-slate-700 transition-colors shadow-2xs"
            title="Export CSV dataset for this range"
          >
            <svg className="w-3.5 h-3.5 mr-1.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message={`Computing analytics from ${fromDate} to ${toDate}...`} size="lg" />
      ) : error ? (
        <ErrorDisplay
          title="Failed to load analytics"
          message={error}
          onRetry={fetchAnalytics}
        />
      ) : (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <KpiCard
              label="MAE"
              value={metrics?.mae_mw ?? null}
              unit="MW"
              tooltip="Mean Absolute Error across the selected date range"
              sampleCount={metrics?.sample_count}
            />

            <KpiCard
              label="RMSE"
              value={metrics?.rmse_mw ?? null}
              unit="MW"
              tooltip="Root Mean Squared Error over the selected range"
              sampleCount={metrics?.sample_count}
            />

            <KpiCard
              label="Mean Bias"
              value={
                metrics?.bias_mw !== null && metrics?.bias_mw !== undefined
                  ? `${metrics.bias_mw > 0 ? '+' : ''}${metrics.bias_mw.toFixed(1)}`
                  : null
              }
              unit="MW"
              tooltip="Net Directional Forecast Error: Average (Forecast - Actual)"
              sampleCount={metrics?.sample_count}
              trend={biasTrend}
            />

            <KpiCard
              label="WAPE"
              value={metrics?.wape_pct !== null && metrics?.wape_pct !== undefined ? `${metrics.wape_pct.toFixed(1)}%` : null}
              unit=""
              tooltip="Weighted Absolute Percentage Error (Total Error / Total Generation)"
              sampleCount={metrics?.sample_count}
            />

            <KpiCard
              label="MAPE"
              value={metrics?.mape_pct !== null && metrics?.mape_pct !== undefined ? `${metrics.mape_pct.toFixed(1)}%` : null}
              unit=""
              tooltip={metrics?.mape_note || "Mean Absolute Percentage Error (computed on actuals > 100 MW)"}
              sampleCount={metrics?.sample_count}
            />

            <KpiCard
              label="Matched Coverage"
              value={
                metrics?.coverage_pct !== null && metrics?.coverage_pct !== undefined
                  ? `${metrics.coverage_pct.toFixed(1)}%`
                  : null
              }
              unit=""
              tooltip={`${metrics?.matched_count ?? 0} valid pairs out of ${metrics?.total_intervals ?? 0} total intervals`}
              sampleCount={metrics?.matched_count}
            />
          </div>

          {/* Section Navigation Tabs */}
          <div className="border-b border-slate-200">
            <nav className="flex space-x-4 text-xs font-mono font-medium">
              <button
                type="button"
                onClick={() => setActiveTab('trends')}
                className={`pb-2 px-1 border-b-2 transition-colors ${
                  activeTab === 'trends'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                Daily Trends (MAE & Bias)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('diurnal')}
                className={`pb-2 px-1 border-b-2 transition-colors ${
                  activeTab === 'diurnal'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                Diurnal 24h Profile
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('distribution')}
                className={`pb-2 px-1 border-b-2 transition-colors ${
                  activeTab === 'distribution'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                Error Distribution Histogram
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('scatter')}
                className={`pb-2 px-1 border-b-2 transition-colors ${
                  activeTab === 'scatter'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                Forecast vs Actual Scatter
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`pb-2 px-1 border-b-2 transition-colors ${
                  activeTab === 'all'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                All Views (Grid)
              </button>
            </nav>
          </div>

          {/* Active Tab View */}
          {activeTab === 'trends' && (
            <DailyMetricsChart dailyMetrics={summaryData?.daily_metrics ?? []} height={400} />
          )}

          {activeTab === 'diurnal' && (
            <HourlyProfileChart hourlyProfiles={summaryData?.hourly_profile ?? []} height={400} />
          )}

          {activeTab === 'distribution' && (
            <ErrorDistributionChart observations={errorObservations} height={400} />
          )}

          {activeTab === 'scatter' && (
            <ScatterPlotChart observations={errorObservations} height={400} />
          )}

          {activeTab === 'all' && (
            <div className="space-y-6">
              <DailyMetricsChart dailyMetrics={summaryData?.daily_metrics ?? []} height={320} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <HourlyProfileChart hourlyProfiles={summaryData?.hourly_profile ?? []} height={320} />
                <ErrorDistributionChart observations={errorObservations} height={320} />
              </div>
              <ScatterPlotChart observations={errorObservations} height={360} />
              <ErrorTimeSeriesChart observations={errorObservations.slice(0, 72)} height={320} />
            </div>
          )}
        </>
      )}
    </div>
  );
};
