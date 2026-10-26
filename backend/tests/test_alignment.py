from datetime import date, datetime, timezone
from app.services.alignment_service import (
    build_aligned_observations,
    get_decision_cutoff,
    select_latest_eligible_forecast,
)


def test_get_decision_cutoff():
    d = date(2026, 1, 15)
    cutoff = get_decision_cutoff(d, cutoff_hour=9)
    assert cutoff.tzinfo == timezone.utc
    assert cutoff == datetime(2026, 1, 15, 9, 0, 0, tzinfo=timezone.utc)

    # Test custom cutoff hour
    cutoff_17 = get_decision_cutoff(d, cutoff_hour=17)
    assert cutoff_17 == datetime(2026, 1, 15, 17, 0, 0, tzinfo=timezone.utc)


def test_select_latest_eligible_forecast():
    delivery_time = datetime(2026, 1, 15, 12, 0, 0, tzinfo=timezone.utc)
    cutoff = datetime(2026, 1, 15, 9, 0, 0, tzinfo=timezone.utc)

    vintages = [
        {
            "start_time": delivery_time,
            "publish_time": datetime(2026, 1, 15, 6, 0, 0, tzinfo=timezone.utc),
            "generation_mw": 1200.0,
        },
        {
            "start_time": delivery_time,
            "publish_time": datetime(2026, 1, 15, 8, 30, 0, tzinfo=timezone.utc),
            "generation_mw": 1400.0,
        },
        {
            "start_time": delivery_time,
            "publish_time": datetime(2026, 1, 15, 9, 15, 0, tzinfo=timezone.utc),
            "generation_mw": 1600.0,
        },
    ]

    selected = select_latest_eligible_forecast(vintages, delivery_time, cutoff)
    assert selected is not None
    assert selected["publish_time"] == datetime(
        2026, 1, 15, 8, 30, 0, tzinfo=timezone.utc
    )
    assert selected["generation_mw"] == 1400.0


def test_select_latest_eligible_forecast_none_eligible():
    delivery_time = datetime(2026, 1, 15, 12, 0, 0, tzinfo=timezone.utc)
    cutoff = datetime(2026, 1, 15, 9, 0, 0, tzinfo=timezone.utc)

    vintages = [
        {
            "start_time": delivery_time,
            "publish_time": datetime(2026, 1, 15, 10, 0, 0, tzinfo=timezone.utc),
            "generation_mw": 1500.0,
        }
    ]
    selected = select_latest_eligible_forecast(vintages, delivery_time, cutoff)
    assert selected is None


def test_build_aligned_observations_averages_half_hourly_actuals():
    d = date(2026, 1, 15)
    t10_00 = datetime(2026, 1, 15, 10, 0, 0, tzinfo=timezone.utc)
    t10_30 = datetime(2026, 1, 15, 10, 30, 0, tzinfo=timezone.utc)

    forecasts = [
        {
            "start_time": t10_00,
            "publish_time": datetime(2026, 1, 15, 8, 0, 0, tzinfo=timezone.utc),
            "generation_mw": 500.0,
        }
    ]

    actuals = [
        {"start_time": t10_00, "generation_mw": 400.0},
        {"start_time": t10_30, "generation_mw": 600.0},
    ]

    observations = build_aligned_observations(forecasts, actuals, d, d, cutoff_hour=9)
    assert len(observations) == 24

    obs_10 = next(o for o in observations if o.delivery_hour == 10)
    assert obs_10.status == "matched"
    assert obs_10.forecast_mw == 500.0
    # Average of 400 and 600 is 500
    assert obs_10.actual_mw == 500.0
    # Error = forecast - actual = 500 - 500 = 0
    assert obs_10.error_mw == 0.0
    assert obs_10.absolute_error_mw == 0.0


def test_error_sign_convention_overforecasting():
    d = date(2026, 1, 15)
    t11_00 = datetime(2026, 1, 15, 11, 0, 0, tzinfo=timezone.utc)

    forecasts = [
        {
            "start_time": t11_00,
            "publish_time": datetime(2026, 1, 15, 8, 0, 0, tzinfo=timezone.utc),
            "generation_mw": 750.0,
        }
    ]

    actuals = [
        {"start_time": t11_00, "generation_mw": 650.0},
    ]

    observations = build_aligned_observations(forecasts, actuals, d, d, cutoff_hour=9)
    obs_11 = next(o for o in observations if o.delivery_hour == 11)

    assert obs_11.status == "matched"
    assert obs_11.forecast_mw == 750.0
    assert obs_11.actual_mw == 650.0
    # Positive error indicates overforecasting
    assert obs_11.error_mw == 100.0
    assert obs_11.absolute_error_mw == 100.0


def test_error_sign_convention_underforecasting():
    d = date(2026, 1, 15)
    t11_00 = datetime(2026, 1, 15, 11, 0, 0, tzinfo=timezone.utc)

    forecasts = [
        {
            "start_time": t11_00,
            "publish_time": datetime(2026, 1, 15, 8, 0, 0, tzinfo=timezone.utc),
            "generation_mw": 600.0,
        }
    ]

    actuals = [
        {"start_time": t11_00, "generation_mw": 750.0},
    ]

    observations = build_aligned_observations(forecasts, actuals, d, d, cutoff_hour=9)
    obs_11 = next(o for o in observations if o.delivery_hour == 11)

    assert obs_11.status == "matched"
    assert obs_11.forecast_mw == 600.0
    assert obs_11.actual_mw == 750.0
    # Negative error indicates underforecasting
    assert obs_11.error_mw == -150.0
    assert obs_11.absolute_error_mw == 150.0


def test_missing_data_status_flags():
    d = date(2026, 1, 15)
    t14_00 = datetime(2026, 1, 15, 14, 0, 0, tzinfo=timezone.utc)
    t15_00 = datetime(2026, 1, 15, 15, 0, 0, tzinfo=timezone.utc)

    # 14:00 has actual only -> missing_forecast
    # 15:00 has forecast only -> missing_actual
    # 16:00 has neither -> missing_both
    forecasts = [
        {
            "start_time": t15_00,
            "publish_time": datetime(2026, 1, 15, 8, 0, 0, tzinfo=timezone.utc),
            "generation_mw": 800.0,
        }
    ]
    actuals = [
        {"start_time": t14_00, "generation_mw": 700.0},
    ]

    observations = build_aligned_observations(forecasts, actuals, d, d, cutoff_hour=9)

    obs_14 = next(o for o in observations if o.delivery_hour == 14)
    assert obs_14.status == "missing_forecast"
    assert obs_14.forecast_mw is None
    assert obs_14.actual_mw == 700.0

    obs_15 = next(o for o in observations if o.delivery_hour == 15)
    assert obs_15.status == "missing_actual"
    assert obs_15.forecast_mw == 800.0
    assert obs_15.actual_mw is None

    obs_16 = next(o for o in observations if o.delivery_hour == 16)
    assert obs_16.status == "missing_both"
    assert obs_16.forecast_mw is None
    assert obs_16.actual_mw is None
