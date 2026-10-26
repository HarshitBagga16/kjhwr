import {
  HealthResponse,
  DashboardResponse,
  AlignedObservation,
  ForecastHistoryItem,
  AnalyticsSummary,
  ObservationsPaginatedResponse,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '';

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error ${response.status}: ${error}`);
  }
  return response.json();
}

export const api = {
  getHealth: () => fetchApi<HealthResponse>('/api/health'),
  getDashboard: (date: string) => fetchApi<DashboardResponse>(`/api/dashboard?date=${date}`),
  getForecasts: (date: string) => fetchApi<{ observations: AlignedObservation[] }>(`/api/forecasts?date=${date}`),
  getForecastHistory: (startTime: string) =>
    fetchApi<{ history: ForecastHistoryItem[] }>(`/api/forecasts/${encodeURIComponent(startTime)}/history`),
  getAnalyticsSummary: (from: string, to: string) =>
    fetchApi<AnalyticsSummary>(`/api/analytics/summary?from=${from}&to=${to}`),
  getErrors: (from: string, to: string) =>
    fetchApi<{ errors: AlignedObservation[] }>(`/api/analytics/errors?from=${from}&to=${to}`),
  getObservations: (date: string, page: number = 1, pageSize: number = 48) =>
    fetchApi<ObservationsPaginatedResponse>(
      `/api/analytics/observations?date=${date}&page=${page}&page_size=${pageSize}`
    ),
  exportCsv: (from: string, to: string) => {
    window.open(`${API_BASE}/api/analytics/export?from=${from}&to=${to}`, '_blank');
  },
};
