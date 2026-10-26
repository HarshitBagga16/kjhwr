from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel
from app.services.metrics_service import DailyMetrics, ForecastMetrics, HourlyProfile


class AnalyticsSummaryResponse(BaseModel):
    """Aggregate analytics summary over a delivery date range."""

    date_from: date
    date_to: date
    cutoff_hour: int
    metrics: ForecastMetrics


class ErrorPoint(BaseModel):
    """Single point for error time series and distribution."""

    delivery_start: datetime
    delivery_date: date
    delivery_hour: int
    forecast_mw: Optional[float] = None
    actual_mw: Optional[float] = None
    error_mw: Optional[float] = None
    absolute_error_mw: Optional[float] = None
    status: str


class ErrorSeriesResponse(BaseModel):
    """Time-series of forecast errors for analytics charting."""

    date_from: date
    date_to: date
    cutoff_hour: int
    series: List[ErrorPoint]


class DailyMetricsResponse(BaseModel):
    """List of daily aggregated accuracy metrics across date range."""

    date_from: date
    date_to: date
    cutoff_hour: int
    daily: List[DailyMetrics]


class HourlyProfileResponse(BaseModel):
    """Diurnal profile metrics across 24 hours of the day."""

    date_from: date
    date_to: date
    cutoff_hour: int
    hourly: List[HourlyProfile]


class ExportRow(BaseModel):
    """Schema for individual exported observation records."""

    delivery_start: str
    delivery_date: str
    delivery_hour: int
    decision_cutoff: str
    forecast_publish_time: Optional[str] = None
    forecast_mw: Optional[float] = None
    actual_mw: Optional[float] = None
    error_mw: Optional[float] = None
    absolute_error_mw: Optional[float] = None
    status: str


class PaginatedObservationsResponse(BaseModel):
    """Paginated response for observations table."""

    total_count: int
    page: int
    page_size: int
    total_pages: int
    observations: List[ErrorPoint]
