import React from 'react';

interface EmptyStateProps {
  title?: string;
  message?: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No observations found',
  message = 'No data available for the selected date or filter criteria.',
  actionText,
  onAction,
}) => {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center my-4">
      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-slate-700 font-mono mb-1">{title}</h3>
      <p className="text-xs text-slate-500 max-w-sm mx-auto">{message}</p>
      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex items-center px-3 py-1.5 border border-slate-300 rounded shadow-xs text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 font-mono"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
