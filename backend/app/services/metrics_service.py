from collections import defaultdict
from datetime import date
import math
from typing import List, Optional
from pydantic import BaseModel

from app.services.alignment_service import AlignedObservation


class ForecastMetrics(BaseModel):
    """Aggregated forecast accuracy KPIs."""

    mae_mw: Optional[float] = None
    rmse_mw: Optional[float] = None
    bias_mw: Optional[float] = None  # positive = overforecasting
    wape_pct: Optional[float] = None
    mape_pct: Optional[float] = None  # None if zero or near-zero actuals exist
    mape_note: Optional[str] = None  # Explanation if MAPE is excluded
    sample_count: int = 0
    total_intervals: int = 0
    matched_count: int = 0
    missing_forecast_count: int = 0
    missing_actual_count: int = 0
    coverage_pct: float = 0.0


class DailyMetrics(BaseModel):
    """Daily aggregated accuracy metrics."""

    delivery_date: date
    mae_mw: Optional[float] = None
    rmse_mw: Optional[float] = None
    bias_mw: Optional[float] = None
    wape_pct: Optional[float] = None
    sample_count: int = 0
    total_intervals: int = 0
    coverage_pct: float = 0.0


class HourlyProfile(BaseModel):
    """Aggregated diurnal profile metrics grouped by hour of the day (0-23)."""

    hour: int  # 0 to 23
    mae_mw: Optional[float] = None
    mean_absolute_error_mw: Optional[float] = None
    rmse_mw: Optional[float] = None
    bias_mw: Optional[float] = None
    mean_error_mw: Optional[float] = None
    mean_forecast_mw: Optional[float] = None
    mean_actual_mw: Optional[float] = None
    sample_count: int = 0


class MetricsService:
    """Service to compute energy forecast accuracy metrics."""

    @staticmethod
    def calculate_metrics(observations: List[AlignedObservation]) -> ForecastMetrics:
        """Calculate forecast accuracy metrics from aligned observations.

        Handles edge cases: empty datasets, zero actuals, missing values.
        """
        total_intervals = len(observations)
        matched = [o for o in observations if o.status == "matched"]
        matched_count = len(matched)
        missing_forecast_count = sum(
            1 for o in observations if o.status == "missing_forecast"
        )
        missing_actual_count = sum(
            1 for o in observations if o.status == "missing_actual"
        )
        coverage_pct = (
            round((matched_count / total_intervals) * 100.0, 2)
            if total_intervals > 0
            else 0.0
        )

        if not matched:
            return ForecastMetrics(
                sample_count=0,
                total_intervals=total_intervals,
                matched_count=0,
                missing_forecast_count=missing_forecast_count,
                missing_actual_count=missing_actual_count,
                coverage_pct=coverage_pct,
            )

        errors = [o.error_mw for o in matched if o.error_mw is not None]
        abs_errors = [
            o.absolute_error_mw for o in matched if o.absolute_error_mw is not None
        ]
        actuals = [o.actual_mw for o in matched if o.actual_mw is not None]

        n = len(errors)
        if n == 0:
            return ForecastMetrics(
                sample_count=0,
                total_intervals=total_intervals,
                matched_count=matched_count,
                missing_forecast_count=missing_forecast_count,
                missing_actual_count=missing_actual_count,
                coverage_pct=coverage_pct,
            )

        mae = sum(abs_errors) / n
        bias = sum(errors) / n
        mse = sum(e**2 for e in errors) / n
        rmse = math.sqrt(mse)

        # WAPE = sum(|forecast - actual|) / sum(actual) * 100
        sum_actual = sum(actuals)
        wape: Optional[float] = None
        if sum_actual > 0:
            wape = round((sum(abs_errors) / sum_actual) * 100.0, 2)

        # MAPE = 1/n * sum(|forecast - actual| / actual) * 100
        # Check for zero or negative values
        has_zero_actual = any(a <= 0.001 for a in actuals)
        mape: Optional[float] = None
        mape_note: Optional[str] = None
        if has_zero_actual:
            mape_note = "MAPE omitted because one or more actual generation periods were zero or near-zero, which causes infinite/unstable distortion."
        else:
            ape_sum = sum(
                abs(o.error_mw) / o.actual_mw
                for o in matched
                if o.error_mw is not None and o.actual_mw is not None
            )
            mape = round((ape_sum / n) * 100.0, 2)

        return ForecastMetrics(
            mae_mw=round(mae, 2),
            rmse_mw=round(rmse, 2),
            bias_mw=round(bias, 2),
            wape_pct=wape,
            mape_pct=mape,
            mape_note=mape_note,
            sample_count=n,
            total_intervals=total_intervals,
            matched_count=matched_count,
            missing_forecast_count=missing_forecast_count,
            missing_actual_count=missing_actual_count,
            coverage_pct=coverage_pct,
        )

    @staticmethod
    def calculate_daily_metrics(
        observations: List[AlignedObservation],
    ) -> List[DailyMetrics]:
        """Calculate metrics grouped by delivery date."""
        grouped: dict[date, List[AlignedObservation]] = defaultdict(list)
        for obs in observations:
            grouped[obs.delivery_date].append(obs)

        results: List[DailyMetrics] = []
        for delivery_date in sorted(grouped.keys()):
            day_obs = grouped[delivery_date]
            total_int = len(day_obs)
            matched = [o for o in day_obs if o.status == "matched"]
            n = len(matched)
            coverage = round((n / total_int) * 100.0, 2) if total_int > 0 else 0.0

            if n == 0:
                results.append(
                    DailyMetrics(
                        delivery_date=delivery_date,
                        sample_count=0,
                        total_intervals=total_int,
                        coverage_pct=coverage,
                    )
                )
                continue

            errors = [o.error_mw for o in matched if o.error_mw is not None]
            abs_errors = [
                o.absolute_error_mw for o in matched if o.absolute_error_mw is not None
            ]
            actuals = [o.actual_mw for o in matched if o.actual_mw is not None]

            mae = round(sum(abs_errors) / n, 2)
            bias = round(sum(errors) / n, 2)
            rmse = round(math.sqrt(sum(e**2 for e in errors) / n), 2)
            sum_actual = sum(actuals)
            wape = (
                round((sum(abs_errors) / sum_actual) * 100.0, 2)
                if sum_actual > 0
                else None
            )

            results.append(
                DailyMetrics(
                    delivery_date=delivery_date,
                    mae_mw=mae,
                    rmse_mw=rmse,
                    bias_mw=bias,
                    wape_pct=wape,
                    sample_count=n,
                    total_intervals=total_int,
                    coverage_pct=coverage,
                )
            )

        return results

    @staticmethod
    def calculate_hourly_profile(
        observations: List[AlignedObservation],
    ) -> List[HourlyProfile]:
        """Calculate diurnal profile: average errors and generation by hour of day (0-23)."""
        grouped: dict[int, List[AlignedObservation]] = defaultdict(list)
        for obs in observations:
            grouped[obs.delivery_hour].append(obs)

        profile: List[HourlyProfile] = []
        for hour in range(24):
            hour_obs = grouped.get(hour, [])
            matched = [o for o in hour_obs if o.status == "matched"]
            n = len(matched)

            if n == 0:
                profile.append(HourlyProfile(hour=hour, sample_count=0))
                continue

            errors = [o.error_mw for o in matched if o.error_mw is not None]
            abs_errors = [
                o.absolute_error_mw for o in matched if o.absolute_error_mw is not None
            ]
            forecasts = [o.forecast_mw for o in matched if o.forecast_mw is not None]
            actuals = [o.actual_mw for o in matched if o.actual_mw is not None]

            mae = round(sum(abs_errors) / n, 2)
            bias = round(sum(errors) / n, 2)
            rmse = round(math.sqrt(sum(e**2 for e in errors) / n), 2)
            mean_f = round(sum(forecasts) / len(forecasts), 2) if forecasts else None
            mean_a = round(sum(actuals) / len(actuals), 2) if actuals else None

            profile.append(
                HourlyProfile(
                    hour=hour,
                    mae_mw=mae,
                    mean_absolute_error_mw=mae,
                    rmse_mw=rmse,
                    bias_mw=bias,
                    mean_error_mw=bias,
                    mean_forecast_mw=mean_f,
                    mean_actual_mw=mean_a,
                    sample_count=n,
                )
            )

        return profile
