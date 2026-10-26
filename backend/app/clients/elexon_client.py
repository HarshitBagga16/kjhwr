import logging
import time
from datetime import date, datetime, time as dt_time, timedelta, timezone
from typing import Any, Dict, List, Optional
import httpx
from app.core.config import get_settings

logger = logging.getLogger(__name__)


class ElexonClient:
    """Client for Elexon BMRS API v1 to fetch FUELHH and WINDFOR streams."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        timeout: Optional[int] = None,
        max_retries: Optional[int] = None,
    ):
        settings = get_settings()
        self.base_url = (base_url or settings.ELEXON_BASE_URL).rstrip("/")
        self.timeout = timeout or settings.ELEXON_TIMEOUT
        self.max_retries = max_retries or settings.ELEXON_MAX_RETRIES
        self._client = httpx.Client(timeout=self.timeout)

    def close(self) -> None:
        """Close the underlying HTTP client session."""
        self._client.close()

    def __enter__(self) -> "ElexonClient":
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        self.close()

    def _request_with_retry(
        self, endpoint: str, params: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Execute HTTP GET request with exponential backoff retry logic."""
        url = f"{self.base_url}{endpoint}"
        last_exception: Optional[Exception] = None

        for attempt in range(1, self.max_retries + 1):
            try:
                logger.info(
                    "Executing Elexon API request",
                    extra={"url": url, "params": params, "attempt": attempt},
                )
                response = self._client.get(url, params=params)

                if response.status_code == 200:
                    data = response.json()
                    if isinstance(data, list):
                        records = data
                    elif (
                        isinstance(data, dict)
                        and "data" in data
                        and isinstance(data["data"], list)
                    ):
                        records = data["data"]
                    else:
                        logger.warning(
                            "Unexpected Elexon API response format",
                            extra={"url": url, "type": type(data).__name__},
                        )
                        records = []

                    logger.info(
                        "Elexon API request succeeded",
                        extra={"url": url, "record_count": len(records)},
                    )
                    return records

                # Non-200 status code
                logger.warning(
                    "Elexon API returned non-200 status",
                    extra={
                        "url": url,
                        "status_code": response.status_code,
                        "attempt": attempt,
                    },
                )
                response.raise_for_status()

            except (httpx.RequestError, httpx.HTTPStatusError) as exc:
                last_exception = exc
                wait_time = 2**attempt
                logger.warning(
                    "Elexon API request failed, backing off",
                    extra={
                        "url": url,
                        "attempt": attempt,
                        "max_retries": self.max_retries,
                        "wait_time": wait_time,
                        "error": str(exc),
                    },
                )
                if attempt < self.max_retries:
                    time.sleep(wait_time)

        logger.error(
            "Elexon API request permanently failed after retries",
            extra={"url": url, "params": params, "error": str(last_exception)},
        )
        raise RuntimeError(
            f"Elexon API failed after {self.max_retries} attempts: {last_exception}"
        )

    def fetch_actual_generation(
        self,
        date_from: date,
        date_to: date,
    ) -> List[Dict[str, Any]]:
        """Fetch FUELHH actual generation for WIND fuel type between given dates.

        Queries the /datasets/FUELHH/stream endpoint using publishDateTimeFrom and
        publishDateTimeTo parameters. Covers the outturn publication window.
        """
        # Ensure UTC bounds covering publication delay
        pub_from = datetime.combine(date_from, dt_time(0, 0, 0), tzinfo=timezone.utc)
        pub_to = datetime.combine(
            date_to, dt_time(23, 59, 59), tzinfo=timezone.utc
        ) + timedelta(hours=4)

        params = {
            "publishDateTimeFrom": pub_from.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "publishDateTimeTo": pub_to.strftime("%Y-%m-%dT%H:%M:%SZ"),
        }

        records = self._request_with_retry("/datasets/FUELHH/stream", params)

        wind_records: List[Dict[str, Any]] = []
        for r in records:
            fuel_type = str(r.get("fuelType", "")).upper()
            if fuel_type == "WIND":
                wind_records.append(r)

        logger.info(
            "Filtered FUELHH WIND records",
            extra={
                "date_from": str(date_from),
                "date_to": str(date_to),
                "total_fetched": len(records),
                "wind_count": len(wind_records),
            },
        )
        return wind_records

    def fetch_wind_forecasts(
        self,
        publish_from: datetime,
        publish_to: datetime,
    ) -> List[Dict[str, Any]]:
        """Fetch WINDFOR wind forecasts published between publish_from and publish_to.

        Returns all published forecast vintages from /datasets/WINDFOR/stream.
        """
        if publish_from.tzinfo is None:
            publish_from = publish_from.replace(tzinfo=timezone.utc)
        else:
            publish_from = publish_from.astimezone(timezone.utc)

        if publish_to.tzinfo is None:
            publish_to = publish_to.replace(tzinfo=timezone.utc)
        else:
            publish_to = publish_to.astimezone(timezone.utc)

        params = {
            "publishDateTimeFrom": publish_from.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "publishDateTimeTo": publish_to.strftime("%Y-%m-%dT%H:%M:%SZ"),
        }

        records = self._request_with_retry("/datasets/WINDFOR/stream", params)
        logger.info(
            "Fetched WINDFOR forecast records",
            extra={
                "publish_from": publish_from.isoformat(),
                "publish_to": publish_to.isoformat(),
                "records_count": len(records),
            },
        )
        return records
