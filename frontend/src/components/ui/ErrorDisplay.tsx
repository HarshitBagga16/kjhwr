import React from 'react';

interface ErrorDisplayProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  title = 'Failed to load data',
  message = 'An unexpected error occurred while communicating with the server.',
  onRetry,
}) => {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-6 text-center my-4">
      <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" strokeWidth="2" />
          <path strokeWidth="2" d="M12 8v4m0 4h.01" />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-rose-900 font-mono mb-1">{title}</h3>
      <p className="text-xs text-rose-700 max-w-md mx-auto mb-4">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center px-3 py-1.5 border border-rose-300 rounded shadow-xs text-xs font-medium text-rose-800 bg-white hover:bg-rose-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 font-mono"
        >
          <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Retry Request
        </button>
      )}
    </div>
  );
};
