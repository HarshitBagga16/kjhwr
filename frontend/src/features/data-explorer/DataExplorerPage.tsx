import React, { useState, useMemo } from 'react';
import { api } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { DateSelector } from '../../components/ui/DateSelector';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { EmptyState } from '../../components/ui/EmptyState';
import { AlignedObservation, ObservationsPaginatedResponse } from '../../types';

type SortField =
  | 'delivery_start'
  | 'delivery_hour'
  | 'forecast_mw'
  | 'actual_mw'
  | 'error_mw'
  | 'absolute_error_mw'
  | 'forecast_publish_time'
  | 'status';

export const DataExplorerPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>('2026-01-15');
  const [page, setPage] = useState<number>(1);
  const pageSize = 48; // Standard 24 or 48 half-hourly rows per page

  const [sortField, setSortField] = useState<SortField>('delivery_start');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data, loading, error, refetch } = useApi<ObservationsPaginatedResponse>(
    () => api.getObservations(selectedDate, page, pageSize),
    [selectedDate, page, pageSize]
  );

  const rawObservations = data?.observations ?? [];
  const totalRecords = data?.total ?? rawObservations.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  // Client-side filtering & sorting of current page records
  const processedObservations = useMemo(() => {
    let list = [...rawObservations];

    if (statusFilter !== 'all') {
      list = list.filter((item) => item.status === statusFilter);
    }

    list.sort((a: AlignedObservation, b: AlignedObservation) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (aVal === null || aVal === undefined) return sortAsc ? 1 : -1;
      if (bVal === null || bVal === undefined) return sortAsc ? -1 : 1;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortAsc ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });

    return list;
  }, [rawObservations, statusFilter, sortField, sortAsc]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return (
        <span className="text-slate-300 ml-1">
          <svg className="w-3 h-3 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </span>
      );
    }
    return (
      <span className="text-blue-600 ml-1">
        {sortAsc ? '▲' : '▼'}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 font-mono">
            Granular Data Explorer
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Query, filter, and inspect raw half-hourly and hourly aligned time-series datasets
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <DateSelector
            value={selectedDate}
            onChange={(d) => {
              setSelectedDate(d);
              setPage(1);
            }}
            minDate="2026-01-01"
            maxDate="2026-01-31"
            disabled={loading}
          />

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-300 rounded px-2.5 py-1 text-xs font-mono bg-white text-slate-700 shadow-2xs focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="matched">Matched Only</option>
            <option value="missing_forecast">Missing Forecast</option>
            <option value="missing_actual">Missing Actual</option>
            <option value="missing_both">Missing Both</option>
          </select>

          {/* Export CSV button */}
          <button
            type="button"
            onClick={() => api.exportCsv(selectedDate, selectedDate)}
            className="inline-flex items-center px-3 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-xs font-mono font-medium text-slate-700 transition-colors shadow-2xs"
            title="Download CSV for this day"
          >
            <svg className="w-3.5 h-3.5 mr-1.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export Day CSV
          </button>
        </div>
      </div>

      {/* Main Table Content */}
      {loading ? (
        <LoadingSpinner message={`Loading records for ${selectedDate}...`} size="lg" />
      ) : error ? (
        <ErrorDisplay
          title="Failed to load observations table"
          message={error}
          onRetry={refetch}
        />
      ) : processedObservations.length === 0 ? (
        <EmptyState
          title="No records matching criteria"
          message={`No observation records found for ${selectedDate} with status filter '${statusFilter}'.`}
          actionText="Reset Filter"
          onAction={() => setStatusFilter('all')}
        />
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 select-none">
                <tr>
                  <th
                    className="py-2.5 px-3 font-semibold cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('delivery_start')}
                  >
                    Delivery Time {getSortIcon('delivery_start')}
                  </th>
                  <th
                    className="py-2.5 px-3 font-semibold text-right cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('forecast_mw')}
                  >
                    Forecast (MW) {getSortIcon('forecast_mw')}
                  </th>
                  <th
                    className="py-2.5 px-3 font-semibold text-right cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('actual_mw')}
                  >
                    Actual (MW) {getSortIcon('actual_mw')}
                  </th>
                  <th
                    className="py-2.5 px-3 font-semibold text-right cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('error_mw')}
                  >
                    Error (MW) {getSortIcon('error_mw')}
                  </th>
                  <th
                    className="py-2.5 px-3 font-semibold text-right cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('absolute_error_mw')}
                  >
                    |Error| (MW) {getSortIcon('absolute_error_mw')}
                  </th>
                  <th
                    className="py-2.5 px-3 font-semibold cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('forecast_publish_time')}
                  >
                    Published At {getSortIcon('forecast_publish_time')}
                  </th>
                  <th className="py-2.5 px-3 font-semibold">Decision Cutoff</th>
                  <th
                    className="py-2.5 px-3 font-semibold text-center cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('status')}
                  >
                    Status {getSortIcon('status')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedObservations.map((obs, idx) => {
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
                    <tr key={`obs-row-${idx}`} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 font-medium text-slate-800">
                        {timeDisplay}
                      </td>

                      <td className="py-2 px-3 text-right font-medium text-blue-700">
                        {obs.forecast_mw !== null ? obs.forecast_mw.toFixed(1) : '—'}
                      </td>

                      <td className="py-2 px-3 text-right font-medium text-emerald-700">
                        {obs.actual_mw !== null ? obs.actual_mw.toFixed(1) : '—'}
                      </td>

                      <td
                        className={`py-2 px-3 text-right font-semibold ${
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

                      <td className="py-2 px-3 text-right text-slate-700">
                        {obs.absolute_error_mw !== null
                          ? obs.absolute_error_mw.toFixed(1)
                          : '—'}
                      </td>

                      <td className="py-2 px-3 text-slate-500 text-[11px]">
                        {publishedDisplay}
                      </td>

                      <td className="py-2 px-3 text-slate-500 text-[11px]">
                        {cutoffDisplay}
                      </td>

                      <td className="py-2 px-3 text-center">
                        <StatusBadge status={obs.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs font-mono">
            <span className="text-slate-500">
              Showing {processedObservations.length} of {totalRecords} records
            </span>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 transition-colors shadow-2xs"
              >
                Previous
              </button>

              <span className="text-slate-600 px-1">
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 transition-colors shadow-2xs"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
