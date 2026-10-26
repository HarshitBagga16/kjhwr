import React, { useState } from 'react';
import { api } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { DateSelector } from '../../components/ui/DateSelector';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { ForecastHistoryPanel } from './ForecastHistoryPanel';
import { AlignedObservation } from '../../types';

export const ForecastsPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>('2026-01-15');
  const [historyTarget, setHistoryTarget] = useState<{
    deliveryStart: string;
    cutoffTime: string;
  } | null>(null);

  const { data, loading, error, refetch } = useApi<{ observations: AlignedObservation[] }>(
    () => api.getForecasts(selectedDate),
    [selectedDate]
  );

  const observations = data?.observations ?? [];

  return (
    <div className="space-y-6">
      {/* Top Header & Date Control Bar */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 font-mono">
            Forecast Inspection & Lineage
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit day-ahead hourly forecast selections and verify decision cutoff compliance
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <DateSelector
            value={selectedDate}
            onChange={setSelectedDate}
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

      {/* Main Table Container */}
      {loading ? (
        <LoadingSpinner message={`Loading forecast lineage for ${selectedDate}...`} size="lg" />
      ) : error ? (
        <ErrorDisplay
          title={`Error loading forecasts for ${selectedDate}`}
          message={error}
          onRetry={refetch}
        />
      ) : observations.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-8 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-800">
              No Forecast Records for {selectedDate}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              No aligned forecast entries found for this date. The pilot active window is January 2026.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setSelectedDate('2026-01-15')}
              className="px-3 py-1.5 rounded text-xs font-mono font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-2xs"
            >
              Jump to Jan 15, 2026 (Active Sample)
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate('2026-01-01')}
              className="px-3 py-1.5 rounded text-xs font-mono font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            >
              Jump to Jan 01, 2026
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-semibold text-slate-700 font-mono">
                Aligned Intervals for {selectedDate} ({observations.length} hours)
              </span>
              <p className="text-[11px] text-slate-400">
                Click any row to open the complete forecast vintage audit history
              </p>
            </div>
            <div className="text-xs font-mono text-slate-500">
              Matched: {observations.filter((o) => o.status === 'matched').length} / {observations.length}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Delivery Time</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Forecast (MW)</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Actual (MW)</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Error (MW)</th>
                  <th className="py-2.5 px-3 font-semibold text-right">|Error| (MW)</th>
                  <th className="py-2.5 px-3 font-semibold">Published At</th>
                  <th className="py-2.5 px-3 font-semibold">Cutoff Time</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Vintages</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {observations.map((obs) => {
                  let timeDisplay = `${String(obs.delivery_hour).padStart(2, '0')}:00`;
                  let publishedDisplay = '—';
                  let cutoffDisplay = '09:00 London';

                  if (obs.delivery_start) {
                    try {
                      const d = new Date(obs.delivery_start);
                      timeDisplay = d.toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'Europe/London',
                      });
                    } catch {
                      // fallback
                    }
                  }

                  if (obs.forecast_publish_time) {
                    try {
                      const pd = new Date(obs.forecast_publish_time);
                      publishedDisplay = `${pd.toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        timeZone: 'UTC',
                      })} UTC`;
                    } catch {
                      publishedDisplay = obs.forecast_publish_time;
                    }
                  }

                  if (obs.decision_cutoff) {
                    try {
                      const cd = new Date(obs.decision_cutoff);
                      cutoffDisplay = cd.toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'Europe/London',
                      });
                    } catch {
                      cutoffDisplay = obs.decision_cutoff;
                    }
                  }

                  const hasError = obs.error_mw !== null;
                  const isOver = hasError && (obs.error_mw as number) > 0;
                  const isUnder = hasError && (obs.error_mw as number) < 0;

                  return (
                    <tr
                      key={obs.delivery_start || `hour-${obs.delivery_hour}`}
                      onClick={() =>
                        setHistoryTarget({
                          deliveryStart: obs.delivery_start,
                          cutoffTime: obs.decision_cutoff,
                        })
                      }
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                    >
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        <div className="flex items-center space-x-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-blue-500 transition-colors" />
                          <span>{timeDisplay}</span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-right font-medium text-blue-700">
                        {obs.forecast_mw !== null ? obs.forecast_mw.toFixed(1) : '—'}
                      </td>

                      <td className="py-2.5 px-3 text-right font-medium text-emerald-700">
                        {obs.actual_mw !== null ? obs.actual_mw.toFixed(1) : '—'}
                      </td>

                      <td
                        className={`py-2.5 px-3 text-right font-semibold ${
                          isOver
                            ? 'text-amber-600'
                            : isUnder
                            ? 'text-purple-600'
                            : 'text-slate-600'
                        }`}
                      >
                        {obs.error_mw !== null
                          ? `${obs.error_mw > 0 ? '+' : ''}${obs.error_mw.toFixed(1)}`
                          : '—'}
                      </td>

                      <td className="py-2.5 px-3 text-right text-slate-700">
                        {obs.absolute_error_mw !== null
                          ? obs.absolute_error_mw.toFixed(1)
                          : '—'}
                      </td>

                      <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                        {publishedDisplay}
                      </td>

                      <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                        {cutoffDisplay}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <StatusBadge status={obs.status} />
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          className="inline-flex items-center px-2 py-0.5 rounded border border-slate-200 bg-white group-hover:border-blue-300 group-hover:bg-blue-50 text-[11px] text-slate-600 group-hover:text-blue-700 transition-colors"
                        >
                          History
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Forecast History Modal */}
      {historyTarget && (
        <ForecastHistoryPanel
          deliveryStart={historyTarget.deliveryStart}
          cutoffTime={historyTarget.cutoffTime}
          onClose={() => setHistoryTarget(null)}
        />
      )}
    </div>
  );
};
