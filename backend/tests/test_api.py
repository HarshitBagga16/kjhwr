import csv
from datetime import datetime, timezone
import io
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.models import ActualGeneration, Base, WindForecast
from app.db.session import get_db
from app.main import app

# In-memory SQLite database for test execution
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "WindSight API"


def test_dashboard_endpoint_empty():
    response = client.get("/api/dashboard?date=2026-01-15")
    assert response.status_code == 200
    data = response.json()
    assert data["date"] == "2026-01-15"
    assert len(data["time_series"]) == 24
    assert data["metrics"]["sample_count"] == 0
    assert data["coverage"]["coverage_pct"] == 0.0


def test_dashboard_endpoint_with_data():
    db = TestingSessionLocal()
    t_start = datetime(2026, 1, 15, 10, 0, 0, tzinfo=timezone.utc)
    t_pub = datetime(2026, 1, 15, 8, 0, 0, tzinfo=timezone.utc)

    # Insert forecast
    wf = WindForecast(start_time=t_start, publish_time=t_pub, generation_mw=1250.0)
    db.add(wf)

    # Insert actuals for 10:00 and 10:30
    a1 = ActualGeneration(start_time=t_start, generation_mw=1200.0, fuel_type="WIND")
    a2 = ActualGeneration(
        start_time=datetime(2026, 1, 15, 10, 30, 0, tzinfo=timezone.utc),
        generation_mw=1300.0,
        fuel_type="WIND",
    )
    db.add_all([a1, a2])
    db.commit()

    response = client.get("/api/dashboard?date=2026-01-15")
    assert response.status_code == 200
    data = response.json()
    assert data["metrics"]["matched_count"] == 1
    # Actual mean = 1250, Forecast = 1250 => Error = 0
    assert data["metrics"]["mae_mw"] == 0.0


def test_forecast_history_endpoint():
    db = TestingSessionLocal()
    t_start = datetime(2026, 1, 15, 12, 0, 0, tzinfo=timezone.utc)
    t_pub1 = datetime(2026, 1, 15, 6, 0, 0, tzinfo=timezone.utc)
    t_pub2 = datetime(2026, 1, 15, 8, 30, 0, tzinfo=timezone.utc)

    db.add_all(
        [
            WindForecast(start_time=t_start, publish_time=t_pub1, generation_mw=800.0),
            WindForecast(start_time=t_start, publish_time=t_pub2, generation_mw=850.0),
        ]
    )
    db.commit()

    iso_str = "2026-01-15T12:00:00Z"
    response = client.get(f"/api/forecasts/{iso_str}/history")
    assert response.status_code == 200
    data = response.json()
    assert len(data["history"]) == 2
    assert data["selected_generation_mw"] == 850.0


def test_analytics_endpoints():
    response = client.get("/api/analytics/summary?from=2026-01-01&to=2026-01-31")
    assert response.status_code == 200
    assert "metrics" in response.json()

    response_errors = client.get("/api/analytics/errors?from=2026-01-01&to=2026-01-31")
    assert response_errors.status_code == 200
    assert "series" in response_errors.json()

    response_hourly = client.get(
        "/api/analytics/hourly-profile?from=2026-01-01&to=2026-01-31"
    )
    assert response_hourly.status_code == 200
    assert len(response_hourly.json()["hourly"]) == 24

    response_daily = client.get("/api/analytics/daily?from=2026-01-01&to=2026-01-05")
    assert response_daily.status_code == 200
    assert len(response_daily.json()["daily"]) == 5

    response_csv = client.get("/api/analytics/export?from=2026-01-01&to=2026-01-02")
    assert response_csv.status_code == 200
    assert "text/csv" in response_csv.headers["content-type"]
    assert "delivery_start_utc" in response_csv.text

    # Verify CSV format and structure
    reader = csv.DictReader(io.StringIO(response_csv.text))
    expected_fields = [
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
    assert reader.fieldnames == expected_fields
    rows = list(reader)
    # 2 days * 24 hours = 48 observations
    assert len(rows) == 48


def test_paginated_observations_endpoint():
    response = client.get(
        "/api/analytics/observations?date=2026-01-15&page=1&page_size=10"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total_count"] == 24
    assert data["page"] == 1
    assert data["page_size"] == 10
    assert data["total_pages"] == 3
    assert len(data["observations"]) == 10


def test_admin_ingest_auth_protection(monkeypatch):
    from app.core.config import get_settings

    settings = get_settings()
    monkeypatch.setattr(settings, "ADMIN_API_KEY", "super-secret-admin-key")

    # Missing header -> 401
    resp_missing = client.post(
        "/api/admin/ingest",
        json={"date_from": "2026-01-01", "date_to": "2026-01-02"},
    )
    assert resp_missing.status_code == 401

    # Wrong key -> 401
    resp_wrong = client.post(
        "/api/admin/ingest",
        json={"date_from": "2026-01-01", "date_to": "2026-01-02"},
        headers={"X-Admin-API-Key": "wrong-key"},
    )
    assert resp_wrong.status_code == 401
