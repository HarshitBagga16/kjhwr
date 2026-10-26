import csv
from datetime import date, datetime, time, timedelta, timezone
import io
import math
from typing import List, Optional
from zoneinfo import ZoneInfo
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models import ActualGeneration, WindForecast
from app.db.session import get_db
from app.schemas.analytics import (
    AnalyticsSummaryResponse,
    DailyMetricsResponse,
    ErrorPoint,
    ErrorSeriesResponse,
    HourlyProfileResponse,
    PaginatedObservationsResponse,
)
from app.services.alignment_service import (
    AlignedObservation,
    build_aligned_observations,
)
from app.services.metrics_service import MetricsService

router = APIRouter(prefix="/analytics", tags=["Analytics"])


def _fetch_aligned_for_range(
    date_from: date,
    date_to: date,
    cutoff_hour: int,
    db: Session,
) -> List[AlignedObservation]:
    """Helper to query DB and build aligned observations across a date range."""
    london_tz = ZoneInfo("Europe/London")
    start_local = datetime.combine(date_from, time(0, 0, 0), tzinfo=london_tz)
    end_local = datetime.combine(date_to, time(23, 59, 59), tzinfo=london_tz)

    start_utc = start_local.astimezone(timezone.utc)
    end_utc = end_local.astimezone(timezone.utc) + timedelta(hours=1)

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

    return build_aligned_observations(
        forecasts=forecasts,
        actuals=actuals,
        date_from=date_from,
        date_to=date_to,
        cutoff_hour=cutoff_hour,
    )


@router.get("/summary", response_model=AnalyticsSummaryResponse)
def get_analytics_summary(
    from_date: Optional[date] = Query(default=None, alias="from"),
    to_date: Optional[date] = Query(default=None, alias="to"),
    cutoff_hour: Optional[int] = Query(default=None, ge=0, le=23),
    db: Session = Depends(get_db),
) -> AnalyticsSummaryResponse:
    """Calculate aggregate forecast accuracy summary across a delivery date range."""
    settings = get_settings()
    d_from = from_date or date(2026, 1, 1)
    d_to = to_date or date(2026, 1, 31)
    hour = cutoff_hour if cutoff_hour is not None else settings.DECISION_CUTOFF_HOUR

    observations = _fetch_aligned_for_range(d_from, d_to, hour, db)
    metrics = MetricsService.calculate_metrics(observations)

    return AnalyticsSummaryResponse(
        date_from=d_from,
        date_to=d_to,
        cutoff_hour=hour,
        metrics=metrics,
    )


@router.get("/errors", response_model=ErrorSeriesResponse)
def get_error_series(
    from_date: Optional[date] = Query(default=None, alias="from"),
    to_date: Optional[date] = Query(default=None, alias="to"),
    cutoff_hour: Optional[int] = Query(default=None, ge=0, le=23),
    db: Session = Depends(get_db),
) -> ErrorSeriesResponse:
    """Retrieve error time series and distribution points across a delivery date range."""
    settings = get_settings()
    d_from = from_date or date(2026, 1, 1)
    d_to = to_date or date(2026, 1, 31)
    hour = cutoff_hour if cutoff_hour is not None else settings.DECISION_CUTOFF_HOUR

    observations = _fetch_aligned_for_range(d_from, d_to, hour, db)
    series = [
        ErrorPoint(
            delivery_start=obs.delivery_start,
            delivery_date=obs.delivery_date,
            delivery_hour=obs.delivery_hour,
            forecast_mw=obs.forecast_mw,
            actual_mw=obs.actual_mw,
            error_mw=obs.error_mw,
            absolute_error_mw=obs.absolute_error_mw,
            status=obs.status,
        )
        for obs in observations
    ]

    return ErrorSeriesResponse(
        date_from=d_from,
        date_to=d_to,
        cutoff_hour=hour,
        series=series,
    )


@router.get("/hourly-profile", response_model=HourlyProfileResponse)
def get_hourly_profile(
    from_date: Optional[date] = Query(default=None, alias="from"),
    to_date: Optional[date] = Query(default=None, alias="to"),
    cutoff_hour: Optional[int] = Query(default=None, ge=0, le=23),
    db: Session = Depends(get_db),
) -> HourlyProfileResponse:
    """Compute 24-hour diurnal error profile across a delivery date range."""
    settings = get_settings()
    d_from = from_date or date(2026, 1, 1)
    d_to = to_date or date(2026, 1, 31)
    hour = cutoff_hour if cutoff_hour is not None else settings.DECISION_CUTOFF_HOUR

    observations = _fetch_aligned_for_range(d_from, d_to, hour, db)
    hourly_data = MetricsService.calculate_hourly_profile(observations)

    return HourlyProfileResponse(
        date_from=d_from,
        date_to=d_to,
        cutoff_hour=hour,
        hourly=hourly_data,
    )


@router.get("/daily", response_model=DailyMetricsResponse)
def get_daily_metrics(
    from_date: Optional[date] = Query(default=None, alias="from"),
    to_date: Optional[date] = Query(default=None, alias="to"),
    cutoff_hour: Optional[int] = Query(default=None, ge=0, le=23),
    db: Session = Depends(get_db),
) -> DailyMetricsResponse:
    """Compute daily aggregated accuracy KPIs across a delivery date range."""
    settings = get_settings()
    d_from = from_date or date(2026, 1, 1)
    d_to = to_date or date(2026, 1, 31)
    hour = cutoff_hour if cutoff_hour is not None else settings.DECISION_CUTOFF_HOUR

    observations = _fetch_aligned_for_range(d_from, d_to, hour, db)
    daily_data = MetricsService.calculate_daily_metrics(observations)

    return DailyMetricsResponse(
        date_from=d_from,
        date_to=d_to,
        cutoff_hour=hour,
        daily=daily_data,
    )


@router.get("/observations", response_model=PaginatedObservationsResponse)
def get_paginated_observations(
    target_date: Optional[date] = Query(default=None, alias="date"),
    from_date: Optional[date] = Query(default=None, alias="from"),
    to_date: Optional[date] = Query(default=None, alias="to"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=48, ge=1, le=500),
    cutoff_hour: Optional[int] = Query(default=None, ge=0, le=23),
    db: Session = Depends(get_db),
) -> PaginatedObservationsResponse:
    """Retrieve paginated list of aligned observations."""
    settings = get_settings()
    if target_date is not None:
        d_from, d_to = target_date, target_date
    else:
        d_from = from_date or date(2026, 1, 15)
        d_to = to_date or d_from

    hour = cutoff_hour if cutoff_hour is not None else settings.DECISION_CUTOFF_HOUR
    observations = _fetch_aligned_for_range(d_from, d_to, hour, db)

    total_count = len(observations)
    total_pages = max(1, math.ceil(total_count / page_size))
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    sliced = observations[start_idx:end_idx]

    points = [
        ErrorPoint(
            delivery_start=obs.delivery_start,
            delivery_date=obs.delivery_date,
            delivery_hour=obs.delivery_hour,
            forecast_mw=obs.forecast_mw,
            actual_mw=obs.actual_mw,
            error_mw=obs.error_mw,
            absolute_error_mw=obs.absolute_error_mw,
            status=obs.status,
        )
        for obs in sliced
    ]

    return PaginatedObservationsResponse(
        total_count=total_count,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        observations=points,
    )


@router.get("/export")
def export_observations_csv(
    from_date: Optional[date] = Query(default=None, alias="from"),
    to_date: Optional[date] = Query(default=None, alias="to"),
    cutoff_hour: Optional[int] = Query(default=None, ge=0, le=23),
    db: Session = Depends(get_db),
) -> Response:
    """Export aligned forecast-actual observations to CSV format."""
    settings = get_settings()
    d_from = from_date or date(2026, 1, 1)
    d_to = to_date or date(2026, 1, 31)
    hour = cutoff_hour if cutoff_hour is not None else settings.DECISION_CUTOFF_HOUR

    observations = _fetch_aligned_for_range(d_from, d_to, hour, db)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "delivery_start_utc",
            "delivery_date_london",
            "delivery_hour_london",
            "decision_cutoff_utc",
            "forecast_publish_time_utc",
            "forecast_mw",
            "actual_mw",
            "error_mw",
            "absolute_error_mw",
            "status",
        ]
    )

    for obs in observations:
        writer.writerow(
            [
                obs.delivery_start.isoformat(),
                obs.delivery_date.isoformat(),
                obs.delivery_hour,
                obs.decision_cutoff.isoformat(),
                obs.forecast_publish_time.isoformat()
                if obs.forecast_publish_time
                else "",
                obs.forecast_mw if obs.forecast_mw is not None else "",
                obs.actual_mw if obs.actual_mw is not None else "",
                obs.error_mw if obs.error_mw is not None else "",
                obs.absolute_error_mw if obs.absolute_error_mw is not None else "",
                obs.status,
            ]
        )

    csv_content = output.getvalue()
    filename = f"windsight_observations_{d_from.strftime('%Y%m%d')}_{d_to.strftime('%Y%m%d')}.csv"

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
