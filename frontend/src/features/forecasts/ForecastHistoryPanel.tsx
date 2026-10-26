import React from 'react';
import { api } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { ForecastHistoryItem } from '../../types';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';

interface ForecastHistoryPanelProps {
  deliveryStart: string;
  cutoffTime?: string;
  onClose: () => void;
}

export const ForecastHistoryPanel: React.FC<ForecastHistoryPanelProps> = ({
  deliveryStart,
  cutoffTime,
  onClose,
}) => {
  const { data, loading, error, refetch } = useApi<{ history: ForecastHistoryItem[] }>(
    () => api.getForecastHistory(deliveryStart),
    [deliveryStart]
  );

  const history = data?.history ?? [];

  // Format delivery time for header
  let formattedDelivery = deliveryStart;
  try {
    const d = new Date(deliveryStart);
    formattedDelivery = `${d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Europe/London',
    })} at ${d.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/London',
    })} UTC`;
  } catch {
    formattedDelivery = deliveryStart;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="bg-[#1e3a5f] text-white px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-300 font-mono">
                Forecast Evolution Vintage History
              </span>
            </div>
            <h2 className="text-base font-bold font-mono text-white mt-0.5">
              Delivery Interval: {formattedDelivery}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors"
            aria-label="Close dialog"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Explain Cutoff Selection Logic */}
        <div className="bg-blue-50/70 border-b border-blue-100 px-6 py-3 text-xs text-blue-900">
          <p className="flex items-start space-x-2">
            <svg
              className="w-4 h-4 text-blue-600 shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>
              <strong>Desk Methodology:</strong> The active operational forecast is the latest
              published WINDFOR release prior to the <strong>09:00 London</strong> day-ahead decision cutoff{' '}
              {cutoffTime ? `(${cutoffTime})` : ''}.
            </span>
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <LoadingSpinner message="Fetching forecast vintages..." size="md" />
          ) : error ? (
            <ErrorDisplay
              title="Could not load forecast history"
              message={error}
              onRetry={refetch}
            />
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-xs font-mono text-slate-500">
              No historical vintages published for this interval prior to cutoff.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Publish Time (UTC)</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Generation</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Lead Time</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((item, idx) => {
                    const pubDate = new Date(item.publish_time);
                    const formattedPub = `${pubDate.toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                    })} ${pubDate.toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}`;

                    return (
                      <tr
                        key={`vintage-${idx}`}
                        className={`transition-colors ${
                          item.is_selected
                            ? 'bg-blue-50/70 hover:bg-blue-100/60 font-semibold text-blue-950'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <td className="py-2 px-3">
                          <div className="flex items-center space-x-1.5">
                            {item.is_selected && (
                              <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                            )}
                            <span>{formattedPub}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right">
                          {item.generation_mw.toFixed(1)} MW
                        </td>
                        <td className="py-2 px-3 text-right text-slate-500">
                          {item.lead_time_hours !== null
                            ? `${item.lead_time_hours.toFixed(1)} hrs`
                            : '—'}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {item.is_selected ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-600 text-white shadow-2xs">
                              Selected
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">Archived</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between">
          <span className="text-xs font-mono text-slate-400">Total Vintages: {history.length}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-xs font-mono font-medium text-slate-700 transition-colors shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
