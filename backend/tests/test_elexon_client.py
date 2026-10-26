from datetime import date, datetime, timezone
import pytest
from app.clients.elexon_client import ElexonClient


def test_fetch_actual_generation_filters_wind(httpx_mock):
    httpx_mock.add_response(
        url="https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream?publishDateTimeFrom=2026-01-15T00%3A00%3A00Z&publishDateTimeTo=2026-01-16T03%3A59%3A59Z",
        json=[
            {
                "fuelType": "WIND",
                "generation": 14500,
                "startTime": "2026-01-15T12:00:00Z",
            },
            {
                "fuelType": "CCGT",
                "generation": 3200,
                "startTime": "2026-01-15T12:00:00Z",
            },
            {
                "fuelType": "NUCLEAR",
                "generation": 4200,
                "startTime": "2026-01-15T12:00:00Z",
            },
        ],
    )

    client = ElexonClient(base_url="https://data.elexon.co.uk/bmrs/api/v1")
    records = client.fetch_actual_generation(date(2026, 1, 15), date(2026, 1, 15))

    assert len(records) == 1
    assert records[0]["fuelType"] == "WIND"
    assert records[0]["generation"] == 14500


def test_fetch_wind_forecasts(httpx_mock):
    pub_from = datetime(2026, 1, 14, 0, 0, 0, tzinfo=timezone.utc)
    pub_to = datetime(2026, 1, 15, 0, 0, 0, tzinfo=timezone.utc)

    httpx_mock.add_response(
        url="https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream?publishDateTimeFrom=2026-01-14T00%3A00%3A00Z&publishDateTimeTo=2026-01-15T00%3A00%3A00Z",
        json=[
            {
                "dataset": "WINDFOR",
                "publishTime": "2026-01-14T12:00:00Z",
                "startTime": "2026-01-15T10:00:00Z",
                "generation": 13200,
            },
            {
                "dataset": "WINDFOR",
                "publishTime": "2026-01-14T18:00:00Z",
                "startTime": "2026-01-15T10:00:00Z",
                "generation": 13800,
            },
        ],
    )

    client = ElexonClient(base_url="https://data.elexon.co.uk/bmrs/api/v1")
    records = client.fetch_wind_forecasts(pub_from, pub_to)

    assert len(records) == 2
    assert records[0]["generation"] == 13200
    assert records[1]["generation"] == 13800


def test_elexon_client_retries_and_succeeds(httpx_mock, monkeypatch):
    import time

    monkeypatch.setattr(time, "sleep", lambda x: None)

    # First attempt returns 500, second succeeds with 200
    httpx_mock.add_response(
        url="https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream?publishDateTimeFrom=2026-01-15T00%3A00%3A00Z&publishDateTimeTo=2026-01-16T03%3A59%3A59Z",
        status_code=500,
    )
    httpx_mock.add_response(
        url="https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream?publishDateTimeFrom=2026-01-15T00%3A00%3A00Z&publishDateTimeTo=2026-01-16T03%3A59%3A59Z",
        json=[{"fuelType": "WIND", "generation": 15000}],
    )

    client = ElexonClient(
        base_url="https://data.elexon.co.uk/bmrs/api/v1", max_retries=3
    )
    records = client.fetch_actual_generation(date(2026, 1, 15), date(2026, 1, 15))

    assert len(records) == 1
    assert records[0]["generation"] == 15000


def test_elexon_client_exhausts_retries(httpx_mock, monkeypatch):
    import time

    monkeypatch.setattr(time, "sleep", lambda x: None)

    # All attempts fail with 503
    for _ in range(3):
        httpx_mock.add_response(
            url="https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream?publishDateTimeFrom=2026-01-15T00%3A00%3A00Z&publishDateTimeTo=2026-01-16T03%3A59%3A59Z",
            status_code=503,
        )

    client = ElexonClient(
        base_url="https://data.elexon.co.uk/bmrs/api/v1", max_retries=3
    )
    with pytest.raises(RuntimeError, match="Elexon API failed after 3 attempts"):
        client.fetch_actual_generation(date(2026, 1, 15), date(2026, 1, 15))
