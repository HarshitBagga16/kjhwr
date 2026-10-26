import React, { useState } from 'react';
import { api } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { KpiCard } from '../../components/ui/KpiCard';
import { DateSelector } from '../../components/ui/DateSelector';
import { ForecastActualChart } from '../../components/charts/ForecastActualChart';
import { ErrorTimeSeriesChart } from '../../components/charts/ErrorTimeSeriesChart';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { EmptyState } from '../../components/ui/EmptyState';
import { DashboardResponse } from '../../types';

export const DashboardPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>('2026-01-15');

  const { data, loading, error, refetch } = useApi<DashboardResponse>(
    () => api.getDashboard(selectedDate),
    [selectedDate]
  );

  const metrics = data?.metrics;
  const observations = data?.observations ?? [];

  // Determine bias trend direction
  const biasTrend =
    metrics?.bias_mw !== null && metrics?.bias_mw !== undefined
      ? metrics.bias_mw > 0
        ? 'positive'
        : metrics.bias_mw < 0
        ? 'negative'
        : 'neutral'
      : undefined;

  return (
    <div className="space-y-6">
      {/* Top Header & Date Control Bar */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 font-mono">
              Day-Ahead Trading Desk
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-blue-50 text-blue-700 border border-blue-200">
              Cutoff: {data?.decision_cutoff_hour ?? 9}:00 London
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time day-ahead forecast vs actual generation verification for National Grid ESO
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <DateSelector
            value={selectedDate}
            onChange={setSelectedDate}
            minDate="2026-01-01"
            maxDate="2026-01-31"
            disabled={loading}
          />
          <button
            type="button"
            onClick={refetch}
            disabled={loading}
            className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 transition-colors disabled:opacity-40"
            title="Refresh Day Data"
          >
            <svg
              className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <LoadingSpinner message={`Loading delivery metrics for ${selectedDate}...`} size="lg" />
      ) : error ? (
        <ErrorDisplay
          title={`Error loading dashboard for ${selectedDate}`}
          message={error}
          onRetry={refetch}
        />
      ) : observations.length === 0 ? (
        <EmptyState
          title={`No observations for ${selectedDate}`}
          message="No aligned forecast or settlement generation records found for this date. Check backend ingestion status."
          actionText="Select Another Date"
          onAction={() => setSelectedDate('2026-01-01')}
        />
      ) : (
        <>
          {/* KPI Summary Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <KpiCard
              label="MAE"
              value={metrics?.mae_mw ?? null}
              unit="MW"
              tooltip="Mean Absolute Error: Average magnitude of day-ahead forecast discrepancies"
              sampleCount={metrics?.sample_count}
            />

            <KpiCard
              label="RMSE"
              value={metrics?.rmse_mw ?? null}
              unit="MW"
              tooltip="Root Mean Squared Error: Penalizes larger volumetric errors more heavily"
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
              tooltip="Mean Signed Error (F - A). Positive = Overforecast (Amber), Negative = Underforecast (Purple)"
              sampleCount={metrics?.sample_count}
              trend={biasTrend}
            />

            <KpiCard
              label="WAPE"
              value={metrics?.wape_pct !== null && metrics?.wape_pct !== undefined ? `${metrics.wape_pct.toFixed(1)}%` : null}
              unit=""
              tooltip="Weighted Absolute Percentage Error: Total |Error| divided by Total Actual Generation"
              sampleCount={metrics?.sample_count}
            />

            <KpiCard
              label="Coverage"
              value={
                metrics?.coverage_pct !== null && metrics?.coverage_pct !== undefined
                  ? `${metrics.coverage_pct.toFixed(1)}%`
                  : null
              }
              unit=""
              tooltip={`${metrics?.matched_count ?? 0} of ${metrics?.total_intervals ?? 0} hourly intervals matched`}
              sampleCount={metrics?.matched_count}
            />
          </div>

          {/* Primary Generation Profile Chart */}
          <ForecastActualChart observations={observations} height={380} />

          {/* Error Profile Chart */}
          <ErrorTimeSeriesChart observations={observations} height={280} />

          {/* Desk Operational Context Box */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 text-xs font-mono text-slate-600 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span>
                Delivery Day: <span className="font-semibold text-slate-800">{selectedDate}</span>
              </span>
              <span className="text-slate-300">|</span>
              <span>Matched Intervals: {metrics?.matched_count ?? 0} / 24</span>
              {metrics?.missing_forecast_count ? (
                <span className="text-amber-600 font-medium">
                  • Missing Forecast: {metrics.missing_forecast_count}
                </span>
              ) : null}
              {metrics?.missing_actual_count ? (
                <span className="text-rose-600 font-medium">
                  • Missing Actual: {metrics.missing_actual_count}
                </span>
              ) : null}
            </div>

            <div className="text-slate-400 text-[11px]">
              Last Ingestion: {data?.last_ingestion ? new Date(data.last_ingestion).toLocaleString('en-GB') : 'Latest'}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
