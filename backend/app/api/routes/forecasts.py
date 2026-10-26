from datetime import date, datetime, time, timedelta, timezone
from typing import List, Optional
from zoneinfo import ZoneInfo
from dateutil import parser as date_parser
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models import ActualGeneration, WindForecast
from app.db.session import get_db
from app.schemas.forecast import (
    ForecastDetailResponse,
    ForecastHistoryItem,
    ObservationResponse,
)
from app.services.alignment_service import (
    build_aligned_observations,
    get_decision_cutoff,
    select_latest_eligible_forecast,
)

router = APIRouter(prefix="/forecasts", tags=["Forecasts"])


@router.get("", response_model=List[ObservationResponse])
def get_forecasts_for_date(
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
) -> List[ObservationResponse]:
    """Retrieve all aligned observations for the specified delivery date."""
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

    return [
        ObservationResponse(
            delivery_start=obs.delivery_start,
            delivery_date=obs.delivery_date,
            delivery_hour=obs.delivery_hour,
            forecast_mw=obs.forecast_mw,
            actual_mw=obs.actual_mw,
            error_mw=obs.error_mw,
            absolute_error_mw=obs.absolute_error_mw,
            forecast_publish_time=obs.forecast_publish_time,
            decision_cutoff=obs.decision_cutoff,
            status=obs.status,
        )
        for obs in observations
    ]


@router.get("/{start_time}/history", response_model=ForecastDetailResponse)
def get_forecast_history(
    start_time: str,
    cutoff_hour: Optional[int] = Query(
        default=None,
        ge=0,
        le=23,
        description="Decision cutoff hour in Europe/London timezone",
    ),
    db: Session = Depends(get_db),
) -> ForecastDetailResponse:
    """Retrieve all historical forecast vintages for a specific delivery interval."""
    try:
        dt = date_parser.isoparse(start_time)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        else:
            dt = dt.astimezone(timezone.utc)
    except Exception:
        raise HTTPException(
            status_code=400, detail="Invalid ISO 8601 start_time format"
        )

    settings = get_settings()
    active_cutoff_hour = (
        cutoff_hour if cutoff_hour is not None else settings.DECISION_CUTOFF_HOUR
    )

    # Delivery date in Europe/London
    london_tz = ZoneInfo("Europe/London")
    delivery_date = dt.astimezone(london_tz).date()
    cutoff_dt = get_decision_cutoff(delivery_date, active_cutoff_hour)

    # Fetch all forecast vintages for this start_time
    forecasts = (
        db.query(WindForecast)
        .filter(WindForecast.start_time == dt)
        .order_by(WindForecast.publish_time.asc())
        .all()
    )

    # Fetch actuals for the interval (dt and dt + 30m)
    hh1 = dt
    hh2 = dt + timedelta(minutes=30)
    actual_rows = (
        db.query(ActualGeneration)
        .filter(
            ActualGeneration.fuel_type == "WIND",
            ActualGeneration.start_time.in_([hh1, hh2]),
        )
        .all()
    )

    actual_mw: Optional[float] = None
    if actual_rows:
        actual_mw = round(
            sum(r.generation_mw for r in actual_rows) / len(actual_rows), 2
        )

    selected = select_latest_eligible_forecast(forecasts, dt, cutoff_dt)

    selected_mw: Optional[float] = None
    selected_pub: Optional[datetime] = None
    error_mw: Optional[float] = None

    if selected is not None:
        selected_mw = round(selected.generation_mw, 2)
        selected_pub = selected.publish_time
        if actual_mw is not None:
            error_mw = round(selected_mw - actual_mw, 2)

    history_items = []
    for f in forecasts:
        f_pub = (
            f.publish_time
            if f.publish_time.tzinfo
            else f.publish_time.replace(tzinfo=timezone.utc)
        )
        history_items.append(
            ForecastHistoryItem(
                publish_time=f_pub,
                generation_mw=round(f.generation_mw, 2),
                is_eligible=f_pub <= cutoff_dt,
                cutoff_time=cutoff_dt,
            )
        )

    return ForecastDetailResponse(
        start_time=dt,
        selected_publish_time=selected_pub,
        selected_generation_mw=selected_mw,
        actual_generation_mw=actual_mw,
        error_mw=error_mw,
        cutoff_time=cutoff_dt,
        history=history_items,
    )
