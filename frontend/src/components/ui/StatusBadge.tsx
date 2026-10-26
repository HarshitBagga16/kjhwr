import React from 'react';
import { ObservationStatus } from '../../types';

interface StatusBadgeProps {
  status: ObservationStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'matched':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-emerald-500"></span>
          Matched
        </span>
      );
    case 'missing_forecast':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium font-mono bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-amber-500"></span>
          Missing Forecast
        </span>
      );
    case 'missing_actual':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium font-mono bg-rose-50 text-rose-700 border border-rose-200">
          <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-rose-500"></span>
          Missing Actual
        </span>
      );
    case 'missing_both':
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium font-mono bg-slate-100 text-slate-600 border border-slate-300">
          <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-slate-400"></span>
          Missing Both
        </span>
      );
  }
};
