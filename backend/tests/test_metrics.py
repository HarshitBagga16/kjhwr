from datetime import date, datetime, timezone
from app.services.alignment_service import AlignedObservation
from app.services.metrics_service import MetricsService


def test_calculate_metrics_standard():
    dt = datetime(2026, 1, 15, 10, 0, 0, tzinfo=timezone.utc)
    cutoff = datetime(2026, 1, 15, 9, 0, 0, tzinfo=timezone.utc)

    # obs1: forecast 100, actual 80 => error +20, abs_error 20
    # obs2: forecast 120, actual 140 => error -20, abs_error 20
    obs = [
        AlignedObservation(
            delivery_start=dt,
            delivery_date=date(2026, 1, 15),
            delivery_hour=10,
            forecast_mw=100.0,
            actual_mw=80.0,
            error_mw=20.0,
            absolute_error_mw=20.0,
            decision_cutoff=cutoff,
            status="matched",
        ),
        AlignedObservation(
            delivery_start=dt,
            delivery_date=date(2026, 1, 15),
            delivery_hour=11,
            forecast_mw=120.0,
            actual_mw=140.0,
            error_mw=-20.0,
            absolute_error_mw=20.0,
            decision_cutoff=cutoff,
            status="matched",
        ),
    ]

    metrics = MetricsService.calculate_metrics(obs)
    # MAE = (20 + 20) / 2 = 20.0
    assert metrics.mae_mw == 20.0
    # Bias = (20 - 20) / 2 = 0.0
    assert metrics.bias_mw == 0.0
    # RMSE = sqrt((400 + 400) / 2) = 20.0
    assert metrics.rmse_mw == 20.0
    # WAPE = sum(|e|) / sum(actual) * 100 = 40 / 220 * 100 = 18.18%
    assert metrics.wape_pct == 18.18
    assert metrics.sample_count == 2
    assert metrics.matched_count == 2
    assert metrics.coverage_pct == 100.0


def test_calculate_metrics_zero_actual_mape_handling():
    dt = datetime(2026, 1, 15, 10, 0, 0, tzinfo=timezone.utc)
    cutoff = datetime(2026, 1, 15, 9, 0, 0, tzinfo=timezone.utc)

    obs = [
        AlignedObservation(
            delivery_start=dt,
            delivery_date=date(2026, 1, 15),
            delivery_hour=10,
            forecast_mw=50.0,
            actual_mw=0.0,
            error_mw=50.0,
            absolute_error_mw=50.0,
            decision_cutoff=cutoff,
            status="matched",
        )
    ]

    metrics = MetricsService.calculate_metrics(obs)
    # MAPE should be None when actual is 0 to avoid division by zero
    assert metrics.mape_pct is None
    assert metrics.mape_note is not None
    assert "omitted" in metrics.mape_note.lower()


def test_calculate_daily_metrics():
    cutoff = datetime(2026, 1, 15, 9, 0, 0, tzinfo=timezone.utc)
    obs = [
        AlignedObservation(
            delivery_start=datetime(2026, 1, 15, 1, 0, 0, tzinfo=timezone.utc),
            delivery_date=date(2026, 1, 15),
            delivery_hour=1,
            forecast_mw=100.0,
            actual_mw=90.0,
            error_mw=10.0,
            absolute_error_mw=10.0,
            decision_cutoff=cutoff,
            status="matched",
        ),
        AlignedObservation(
            delivery_start=datetime(2026, 1, 16, 1, 0, 0, tzinfo=timezone.utc),
            delivery_date=date(2026, 1, 16),
            delivery_hour=1,
            forecast_mw=200.0,
            actual_mw=180.0,
            error_mw=20.0,
            absolute_error_mw=20.0,
            decision_cutoff=cutoff,
            status="matched",
        ),
    ]

    daily = MetricsService.calculate_daily_metrics(obs)
    assert len(daily) == 2
    assert daily[0].delivery_date == date(2026, 1, 15)
    assert daily[0].mae_mw == 10.0
    assert daily[1].delivery_date == date(2026, 1, 16)
    assert daily[1].mae_mw == 20.0


def test_calculate_hourly_profile():
    cutoff = datetime(2026, 1, 15, 9, 0, 0, tzinfo=timezone.utc)
    obs = [
        AlignedObservation(
            delivery_start=datetime(2026, 1, 15, 14, 0, 0, tzinfo=timezone.utc),
            delivery_date=date(2026, 1, 15),
            delivery_hour=14,
            forecast_mw=300.0,
            actual_mw=250.0,
            error_mw=50.0,
            absolute_error_mw=50.0,
            decision_cutoff=cutoff,
            status="matched",
        )
    ]

    profile = MetricsService.calculate_hourly_profile(obs)
    assert len(profile) == 24
    h14 = next(p for p in profile if p.hour == 14)
    assert h14.sample_count == 1
    assert h14.mae_mw == 50.0
    assert h14.bias_mw == 50.0
    assert h14.mean_forecast_mw == 300.0
    assert h14.mean_actual_mw == 250.0
