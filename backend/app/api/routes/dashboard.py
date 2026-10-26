from datetime import date, datetime, time, timedelta, timezone
from typing import Optional
from zoneinfo import ZoneInfo
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models import ActualGeneration, WindForecast
from app.db.session import get_db
from app.schemas.forecast import (
    CoverageStats,
    DashboardResponse,
    DashboardTimeSeriesPoint,
)
from app.services.alignment_service import (
    build_aligned_observations,
    get_decision_cutoff,
)
from app.services.metrics_service import MetricsService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("", response_model=DashboardResponse)
def get_dashboard_data(
    target_date: Optional[date] = Query(
        default=None,
        alias="date",
        description="Delivery date (defaults to 2026-01-15)",
    ),
    cutoff_hour: Optional[int] = Query(
        default=None,
        ge=0,
        le=23,
        description="Decision cutoff hour in Europe/London timezone",
    ),
    db: Session = Depends(get_db),
) -> DashboardResponse:
    """Return dashboard KPI metrics, aligned hourly time series, and coverage stats."""
    settings = get_settings()
    active_date = target_date or date(2026, 1, 15)
    active_cutoff_hour = (
        cutoff_hour if cutoff_hour is not None else settings.DECISION_CUTOFF_HOUR
    )

    london_tz = ZoneInfo("Europe/London")
    start_local = datetime.combine(active_date, time(0, 0, 0), tzinfo=london_tz)
    end_local = datetime.combine(active_date, time(23, 59, 59), tzinfo=london_tz)

    start_utc = start_local.astimezone(timezone.utc)
    end_utc = end_local.astimezone(timezone.utc) + timedelta(hours=1)

    # Fetch forecasts and actuals for intervals covering this date
    forecasts = (
        db.query(WindForecast)
        .filter(
            WindForecast.start_time >= start_utc, WindForecast.start_time <= end_utc
        )
        .all()
    )

    actuals = (
        db.query(ActualGeneration)
        .filter(
            ActualGeneration.fuel_type == "WIND",
            ActualGeneration.start_time >= start_utc,
            ActualGeneration.start_time <= end_utc,
        )
        .all()
    )

    observations = build_aligned_observations(
        forecasts=forecasts,
        actuals=actuals,
        date_from=active_date,
        date_to=active_date,
        cutoff_hour=active_cutoff_hour,
    )

    metrics = MetricsService.calculate_metrics(observations)

    time_series = [
        DashboardTimeSeriesPoint(
            start_time=obs.delivery_start,
            hour=obs.delivery_hour,
            forecast_mw=obs.forecast_mw,
            actual_mw=obs.actual_mw,
            error_mw=obs.error_mw,
            status=obs.status,
        )
        for obs in observations
    ]

    coverage = CoverageStats(
        total_intervals=metrics.total_intervals,
        matched_intervals=metrics.matched_count,
        missing_forecast=metrics.missing_forecast_count,
        missing_actual=metrics.missing_actual_count,
        coverage_pct=metrics.coverage_pct,
    )

    cutoff_dt = get_decision_cutoff(active_date, active_cutoff_hour)

    return DashboardResponse(
        date=active_date,
        decision_cutoff=cutoff_dt,
        cutoff_hour=active_cutoff_hour,
        metrics=metrics,
        time_series=time_series,
        coverage=coverage,
    )
