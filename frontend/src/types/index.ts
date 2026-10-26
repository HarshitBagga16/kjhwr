export type ObservationStatus = 'matched' | 'missing_forecast' | 'missing_actual' | 'missing_both';

export interface AlignedObservation {
  delivery_start: string;
  delivery_date: string;
  delivery_hour: number;
  forecast_mw: number | null;
  actual_mw: number | null;
  error_mw: number | null;
  absolute_error_mw: number | null;
  forecast_publish_time: string | null;
  decision_cutoff: string;
  status: ObservationStatus;
}

export interface ForecastMetrics {
  mae_mw: number | null;
  rmse_mw: number | null;
  bias_mw: number | null;
  wape_pct: number | null;
  mape_pct: number | null;
  mape_note: string | null;
  sample_count: number;
  total_intervals: number;
  matched_count: number;
  missing_forecast_count: number;
  missing_actual_count: number;
  coverage_pct: number;
}

export interface DashboardResponse {
  date: string;
  decision_cutoff_hour: number;
  metrics: ForecastMetrics;
  observations: AlignedObservation[];
  last_ingestion: string | null;
}

export interface DailyMetric {
  date: string;
  mae_mw: number;
  bias_mw: number;
  rmse_mw: number;
  sample_count: number;
}

export interface HourlyProfile {
  hour: number;
  mean_error_mw: number;
  mean_absolute_error_mw: number;
  sample_count: number;
}

export interface AnalyticsSummary {
  date_from: string;
  date_to: string;
  metrics: ForecastMetrics;
  daily_metrics: DailyMetric[];
  hourly_profile: HourlyProfile[];
}

export interface ForecastHistoryItem {
  publish_time: string;
  generation_mw: number;
  is_selected: boolean;
  lead_time_hours: number | null;
}

export interface HealthResponse {
  status: string;
  version: string;
  database: string;
}

export interface ObservationsPaginatedResponse {
  observations: AlignedObservation[];
  total: number;
  page: number;
  page_size: number;
}
