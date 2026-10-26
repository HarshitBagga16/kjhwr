from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel
from app.services.metrics_service import ForecastMetrics


class ForecastHistoryItem(BaseModel):
    """A single historical forecast vintage for a delivery interval."""

    publish_time: datetime
    generation_mw: float
    is_eligible: bool
    cutoff_time: datetime


class ForecastDetailResponse(BaseModel):
    """Full vintage history and selected forecast for a specific delivery interval."""

    start_time: datetime
    selected_publish_time: Optional[datetime] = None
    selected_generation_mw: Optional[float] = None
    actual_generation_mw: Optional[float] = None
    error_mw: Optional[float] = None
    cutoff_time: datetime
    history: List[ForecastHistoryItem]


class ObservationResponse(BaseModel):
    """Single aligned hourly observation item."""

    delivery_start: datetime
    delivery_date: date
    delivery_hour: int
    forecast_mw: Optional[float] = None
    actual_mw: Optional[float] = None
    error_mw: Optional[float] = None
    absolute_error_mw: Optional[float] = None
    forecast_publish_time: Optional[datetime] = None
    decision_cutoff: datetime
    status: str


class CoverageStats(BaseModel):
    """Breakdown of data availability and coverage."""

    total_intervals: int
    matched_intervals: int
    missing_forecast: int
    missing_actual: int
    coverage_pct: float


class DashboardTimeSeriesPoint(BaseModel):
    """Single time-step data point for dashboard visualization."""

    start_time: datetime
    hour: int
    forecast_mw: Optional[float] = None
    actual_mw: Optional[float] = None
    error_mw: Optional[float] = None
    status: str


class DashboardResponse(BaseModel):
    """Payload for operational dashboard view on a given delivery date."""

    date: date
    decision_cutoff: datetime
    cutoff_hour: int
    metrics: ForecastMetrics
    time_series: List[DashboardTimeSeriesPoint]
    coverage: CoverageStats
