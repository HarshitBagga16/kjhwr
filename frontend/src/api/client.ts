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
  getForecasts: async (date: string): Promise<{ observations: AlignedObservation[] }> => {
    const res = await fetchApi<AlignedObservation[] | { observations: AlignedObservation[] }>(
      `/api/forecasts?date=${date}`
    );
    if (Array.isArray(res)) {
      return { observations: res };
    }
    return res;
  },
  getForecastHistory: (startTime: string) =>
    fetchApi<{ history: ForecastHistoryItem[] }>(`/api/forecasts/${encodeURIComponent(startTime)}/history`),
  getAnalyticsSummary: (from: string, to: string) =>
    fetchApi<AnalyticsSummary>(`/api/analytics/summary?from=${from}&to=${to}`),
  getErrors: async (from: string, to: string): Promise<{ errors: AlignedObservation[] }> => {
    const res = await fetchApi<{ series?: AlignedObservation[]; errors?: AlignedObservation[] }>(
      `/api/analytics/errors?from=${from}&to=${to}`
    );
    const list = res.errors ?? res.series ?? [];
    return { errors: list };
  },
  getObservations: async (date: string, page: number = 1, pageSize: number = 48): Promise<ObservationsPaginatedResponse> => {
    const res = await fetchApi<{ observations?: AlignedObservation[]; total?: number; total_count?: number; page?: number; page_size?: number }>(
      `/api/analytics/observations?date=${date}&page=${page}&page_size=${pageSize}`
    );
    return {
      observations: res.observations ?? [],
      total: res.total ?? res.total_count ?? 0,
      page: res.page ?? page,
      page_size: res.page_size ?? pageSize,
    };
  },
  exportCsv: (from: string, to: string) => {
    window.open(`${API_BASE}/api/analytics/export?from=${from}&to=${to}`, '_blank');
  },
};
