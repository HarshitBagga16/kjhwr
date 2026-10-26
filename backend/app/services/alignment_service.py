from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Union
from zoneinfo import ZoneInfo
from pydantic import BaseModel

from app.db.models import ActualGeneration, WindForecast


class AlignedObservation(BaseModel):
    """Aligned forecast-actual observation for an hourly delivery interval."""

    delivery_start: datetime  # UTC start of hourly delivery interval
    delivery_date: date  # Europe/London business delivery date
    delivery_hour: int  # 0-23 in Europe/London timezone
    forecast_mw: Optional[float] = None
    actual_mw: Optional[float] = None
    error_mw: Optional[float] = None  # forecast - actual (positive = overforecasting)
    absolute_error_mw: Optional[float] = None
    forecast_publish_time: Optional[datetime] = None
    decision_cutoff: datetime  # UTC cutoff timestamp applied
    status: str  # 'matched', 'missing_forecast', 'missing_actual', 'missing_both'


def get_decision_cutoff(delivery_date: date, cutoff_hour: int = 9) -> datetime:
    """Get the purchase decision cutoff for a delivery date.

    Default: 09:00 Europe/London on the delivery date.
    For day-ahead procurement, the decision must be made before this time
    on the day before or on the delivery day itself.

    Returns the cutoff as a UTC datetime.
    """
    london_tz = ZoneInfo("Europe/London")
    cutoff_local = datetime(
        delivery_date.year,
        delivery_date.month,
        delivery_date.day,
        cutoff_hour,
        0,
        0,
        tzinfo=london_tz,
    )
    return cutoff_local.astimezone(timezone.utc)


def _get_attr(obj: Any, attr: str) -> Any:
    """Extract attribute from dict or ORM object."""
    if isinstance(obj, dict):
        return obj.get(attr)
    return getattr(obj, attr, None)


def select_latest_eligible_forecast(
    forecasts: List[Union[Dict[str, Any], WindForecast]],
    delivery_start_time: datetime,
    decision_cutoff: datetime,
) -> Optional[Union[Dict[str, Any], WindForecast]]:
    """Select the forecast with the latest publish_time that is <= decision_cutoff.

    For a given delivery interval (start_time), finds all forecasts published
    on or before the decision cutoff, then selects the one with the latest
    publish_time (most recent information available at decision time).

    Returns None if no eligible forecast exists.
    """
    if delivery_start_time.tzinfo is None:
        delivery_start_time = delivery_start_time.replace(tzinfo=timezone.utc)
    if decision_cutoff.tzinfo is None:
        decision_cutoff = decision_cutoff.replace(tzinfo=timezone.utc)

    eligible: List[Union[Dict[str, Any], WindForecast]] = []
    for f in forecasts:
        f_start = _get_attr(f, "start_time")
        f_pub = _get_attr(f, "publish_time")

        if f_start is None or f_pub is None:
            continue

        if f_start.tzinfo is None:
            f_start = f_start.replace(tzinfo=timezone.utc)
        else:
            f_start = f_start.astimezone(timezone.utc)

        if f_pub.tzinfo is None:
            f_pub = f_pub.replace(tzinfo=timezone.utc)
        else:
            f_pub = f_pub.astimezone(timezone.utc)

        if f_start == delivery_start_time and f_pub <= decision_cutoff:
            eligible.append(f)

    if not eligible:
        return None

    # Return forecast with maximum publish_time
    def _pub_key(x: Any) -> datetime:
        p = _get_attr(x, "publish_time")
        if p.tzinfo is None:
            p = p.replace(tzinfo=timezone.utc)
        return p.astimezone(timezone.utc)

    return max(eligible, key=_pub_key)


def build_aligned_observations(
    forecasts: List[Union[Dict[str, Any], WindForecast]],
    actuals: List[Union[Dict[str, Any], ActualGeneration]],
    date_from: date,
    date_to: date,
    cutoff_hour: int = 9,
) -> List[AlignedObservation]:
    """Build aligned forecast-actual pairs for a date range.

    For each hourly delivery interval:
    1. Determine the decision cutoff (09:00 London time on delivery date)
    2. Find the latest eligible forecast (publish_time <= cutoff)
    3. Find actual generation (average of two half-hourly FUELHH records)
    4. Create AlignedObservation with full traceability

    WINDFOR forecasts are hourly. FUELHH actuals are half-hourly.
    We average the two half-hourly actuals (e.g., 09:00 and 09:30) to get
    the hourly actual matching the WINDFOR forecast for 09:00.
    """
    london_tz = ZoneInfo("Europe/London")

    # Index forecasts by normalized UTC start_time
    forecasts_by_start: Dict[datetime, List[Any]] = defaultdict(list)
    for f in forecasts:
        st = _get_attr(f, "start_time")
        if st is not None:
            if st.tzinfo is None:
                st = st.replace(tzinfo=timezone.utc)
            else:
                st = st.astimezone(timezone.utc)
            forecasts_by_start[st].append(f)

    # Index actuals by normalized UTC start_time
    actuals_by_start: Dict[datetime, float] = {}
    for a in actuals:
        st = _get_attr(a, "start_time")
        gen = _get_attr(a, "generation_mw")
        if st is not None and gen is not None:
            if st.tzinfo is None:
                st = st.replace(tzinfo=timezone.utc)
            else:
                st = st.astimezone(timezone.utc)
            try:
                actuals_by_start[st] = float(gen)
            except (ValueError, TypeError):
                pass

    observations: List[AlignedObservation] = []

    curr_date = date_from
    while curr_date <= date_to:
        decision_cutoff = get_decision_cutoff(curr_date, cutoff_hour)

        for hour in range(24):
            local_dt = datetime(
                curr_date.year,
                curr_date.month,
                curr_date.day,
                hour,
                0,
                0,
                tzinfo=london_tz,
            )
            utc_start = local_dt.astimezone(timezone.utc)

            # 1. Select latest eligible forecast
            eligible_forecasts = forecasts_by_start.get(utc_start, [])
            chosen_forecast = select_latest_eligible_forecast(
                eligible_forecasts,
                utc_start,
                decision_cutoff,
            )

            forecast_mw: Optional[float] = None
            forecast_pub: Optional[datetime] = None
            if chosen_forecast is not None:
                gen = _get_attr(chosen_forecast, "generation_mw")
                if gen is not None:
                    forecast_mw = round(float(gen), 2)
                pub = _get_attr(chosen_forecast, "publish_time")
                if pub is not None:
                    forecast_pub = (
                        pub if pub.tzinfo else pub.replace(tzinfo=timezone.utc)
                    )

            # 2. Compute hourly actual generation from two half-hourly periods
            hh1 = utc_start
            hh2 = utc_start + timedelta(minutes=30)
            actual_vals = []
            if hh1 in actuals_by_start:
                actual_vals.append(actuals_by_start[hh1])
            if hh2 in actuals_by_start:
                actual_vals.append(actuals_by_start[hh2])

            actual_mw: Optional[float] = None
            if actual_vals:
                actual_mw = round(sum(actual_vals) / len(actual_vals), 2)

            # 3. Determine status and calculate error
            error_mw: Optional[float] = None
            absolute_error_mw: Optional[float] = None

            if forecast_mw is not None and actual_mw is not None:
                status = "matched"
                error_mw = round(forecast_mw - actual_mw, 2)
                absolute_error_mw = round(abs(error_mw), 2)
            elif forecast_mw is None and actual_mw is not None:
                status = "missing_forecast"
            elif forecast_mw is not None and actual_mw is None:
                status = "missing_actual"
            else:
                status = "missing_both"

            observations.append(
                AlignedObservation(
                    delivery_start=utc_start,
                    delivery_date=curr_date,
                    delivery_hour=hour,
                    forecast_mw=forecast_mw,
                    actual_mw=actual_mw,
                    error_mw=error_mw,
                    absolute_error_mw=absolute_error_mw,
                    forecast_publish_time=forecast_pub,
                    decision_cutoff=decision_cutoff,
                    status=status,
                )
            )

        curr_date += timedelta(days=1)

    return observations
