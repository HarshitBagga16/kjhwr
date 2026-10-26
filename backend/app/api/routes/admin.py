import secrets
from datetime import date, datetime, time, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models import IngestionRun
from app.db.session import get_db
from app.services.ingestion_service import IngestionService

router = APIRouter(prefix="/admin", tags=["Admin"])


class IngestRequestBody(BaseModel):
    """Payload for triggering on-demand dataset ingestion."""

    date_from: date
    date_to: date
    datasets: Optional[List[str]] = ["FUELHH", "WINDFOR"]


class IngestionRunResponse(BaseModel):
    """Schema for ingestion run status response."""

    id: int
    started_at: datetime
    finished_at: Optional[datetime] = None
    dataset: str
    status: str
    records_fetched: int
    records_inserted: int
    error_summary: Optional[str] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None

    class Config:
        from_attributes = True


def verify_admin_key(
    x_admin_api_key: Optional[str] = Header(default=None, alias="X-Admin-API-Key"),
) -> None:
    """Enforce admin API key authentication if configured."""
    settings = get_settings()
    if settings.ADMIN_API_KEY:
        if not x_admin_api_key or not secrets.compare_digest(
            x_admin_api_key.encode("utf-8"), settings.ADMIN_API_KEY.encode("utf-8")
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or missing X-Admin-API-Key header",
            )


@router.post("/ingest", response_model=List[IngestionRunResponse])
def trigger_ingestion(
    payload: IngestRequestBody,
    db: Session = Depends(get_db),
    _auth: None = Depends(verify_admin_key),
) -> List[IngestionRunResponse]:
    """Trigger data ingestion for FUELHH and/or WINDFOR across specified dates."""
    if payload.date_from > payload.date_to:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="date_from must be earlier than or equal to date_to",
        )

    service = IngestionService()
    runs: List[IngestionRun] = []
    datasets = [d.upper() for d in (payload.datasets or ["FUELHH", "WINDFOR"])]

    if "FUELHH" in datasets:
        actuals_run = service.ingest_actuals(payload.date_from, payload.date_to, db)
        runs.append(actuals_run)

    if "WINDFOR" in datasets:
        # Forecasts for delivery date range need publish window starting a few days prior
        pub_from = datetime.combine(
            payload.date_from - timedelta(days=2),
            time(0, 0, 0),
            tzinfo=timezone.utc,
        )
        pub_to = datetime.combine(
            payload.date_to + timedelta(days=1),
            time(0, 0, 0),
            tzinfo=timezone.utc,
        )
        forecast_run = service.ingest_forecasts(pub_from, pub_to, db)
        runs.append(forecast_run)

    return runs


@router.get("/ingestion-status", response_model=List[IngestionRunResponse])
def get_ingestion_status(
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> List[IngestionRunResponse]:
    """Retrieve recent data ingestion runs and audit history."""
    runs = (
        db.query(IngestionRun)
        .order_by(IngestionRun.started_at.desc())
        .limit(limit)
        .all()
    )
    return runs
