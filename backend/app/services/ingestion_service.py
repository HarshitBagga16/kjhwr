import logging
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from dateutil import parser as date_parser
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from app.clients.elexon_client import ElexonClient
from app.db.models import ActualGeneration, IngestionRun, WindForecast

logger = logging.getLogger(__name__)


def _parse_utc_datetime(val: Any) -> Optional[datetime]:
    """Parse string or datetime to UTC aware datetime."""
    if val is None:
        return None
    if isinstance(val, datetime):
        if val.tzinfo is None:
            return val.replace(tzinfo=timezone.utc)
        return val.astimezone(timezone.utc)
    try:
        dt = date_parser.isoparse(str(val))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception as e:
        logger.warning(
            "Failed to parse datetime", extra={"raw_value": val, "error": str(e)}
        )
        return None


def _parse_date(val: Any) -> Optional[date]:
    """Parse string or date to date object."""
    if val is None:
        return None
    if isinstance(val, date) and not isinstance(val, datetime):
        return val
    if isinstance(val, datetime):
        return val.date()
    try:
        return date_parser.parse(str(val)).date()
    except Exception:
        return None


class IngestionService:
    """Service to fetch and store FUELHH actuals and WINDFOR forecasts idempotently."""

    def __init__(self, client: Optional[ElexonClient] = None):
        self.client = client or ElexonClient()

    def _insert_actuals_chunk(self, records: List[Dict[str, Any]], db: Session) -> int:
        """Batch insert actual generation records with ON CONFLICT DO NOTHING."""
        if not records:
            return 0

        dialect_name = db.bind.dialect.name if db.bind else "postgresql"
        inserted_count = 0

        if dialect_name == "postgresql":
            stmt = pg_insert(ActualGeneration).values(records)
            stmt = stmt.on_conflict_do_nothing(
                index_elements=["start_time", "fuel_type"]
            )
            result = db.execute(stmt)
            inserted_count = result.rowcount if result.rowcount > 0 else 0
        elif dialect_name == "sqlite":
            stmt = sqlite_insert(ActualGeneration).values(records)
            stmt = stmt.on_conflict_do_nothing(
                index_elements=["start_time", "fuel_type"]
            )
            result = db.execute(stmt)
            inserted_count = result.rowcount if result.rowcount > 0 else 0
        else:
            for rec in records:
                exists = (
                    db.query(ActualGeneration)
                    .filter_by(
                        start_time=rec["start_time"],
                        fuel_type=rec["fuel_type"],
                    )
                    .first()
                )
                if not exists:
                    db.add(ActualGeneration(**rec))
                    inserted_count += 1

        db.commit()
        return inserted_count

    def _insert_forecasts_chunk(
        self, records: List[Dict[str, Any]], db: Session
    ) -> int:
        """Batch insert wind forecast records with ON CONFLICT DO NOTHING."""
        if not records:
            return 0

        dialect_name = db.bind.dialect.name if db.bind else "postgresql"
        inserted_count = 0

        if dialect_name == "postgresql":
            stmt = pg_insert(WindForecast).values(records)
            stmt = stmt.on_conflict_do_nothing(
                index_elements=["start_time", "publish_time"]
            )
            result = db.execute(stmt)
            inserted_count = result.rowcount if result.rowcount > 0 else 0
        elif dialect_name == "sqlite":
            stmt = sqlite_insert(WindForecast).values(records)
            stmt = stmt.on_conflict_do_nothing(
                index_elements=["start_time", "publish_time"]
            )
            result = db.execute(stmt)
            inserted_count = result.rowcount if result.rowcount > 0 else 0
        else:
            for rec in records:
                exists = (
                    db.query(WindForecast)
                    .filter_by(
                        start_time=rec["start_time"],
                        publish_time=rec["publish_time"],
                    )
                    .first()
                )
                if not exists:
                    db.add(WindForecast(**rec))
                    inserted_count += 1

        db.commit()
        return inserted_count

    def ingest_actuals(
        self, date_from: date, date_to: date, db: Session
    ) -> IngestionRun:
        """Fetch and store FUELHH WIND records in 1-day chunks."""
        run = IngestionRun(
            dataset="FUELHH",
            status="running",
            date_from=date_from,
            date_to=date_to,
            records_fetched=0,
            records_inserted=0,
        )
        db.add(run)
        db.commit()
        db.refresh(run)

        total_fetched = 0
        total_inserted = 0
        errors: List[str] = []

        curr_date = date_from
        while curr_date <= date_to:
            chunk_to = curr_date  # 1-day chunk
            logger.info(
                "Ingesting FUELHH actuals chunk",
                extra={"chunk_date": str(curr_date), "run_id": run.id},
            )
            try:
                raw_records = self.client.fetch_actual_generation(curr_date, chunk_to)
                total_fetched += len(raw_records)

                clean_records: List[Dict[str, Any]] = []
                for item in raw_records:
                    start_dt = _parse_utc_datetime(item.get("startTime"))
                    gen = item.get("generation")
                    if start_dt is None or gen is None:
                        continue
                    try:
                        gen_float = float(gen)
                    except (ValueError, TypeError):
                        continue

                    pub_dt = _parse_utc_datetime(item.get("publishTime"))
                    settle_date = _parse_date(item.get("settlementDate"))
                    settle_period = item.get("settlementPeriod")
                    if settle_period is not None:
                        try:
                            settle_period = int(settle_period)
                        except (ValueError, TypeError):
                            settle_period = None

                    clean_records.append(
                        {
                            "start_time": start_dt,
                            "generation_mw": gen_float,
                            "fuel_type": "WIND",
                            "settlement_date": settle_date,
                            "settlement_period": settle_period,
                            "publish_time": pub_dt,
                        }
                    )

                inserted = self._insert_actuals_chunk(clean_records, db)
                total_inserted += inserted

            except Exception as exc:
                err_msg = f"Error ingesting FUELHH for {curr_date}: {exc}"
                logger.error(err_msg, exc_info=True)
                errors.append(err_msg)

            curr_date += timedelta(days=1)

        run.finished_at = datetime.now(timezone.utc)
        run.records_fetched = total_fetched
        run.records_inserted = total_inserted
        if errors:
            run.error_summary = "\n".join(errors)
            run.status = "partial_failure" if total_inserted > 0 else "failed"
        else:
            run.status = "success"

        db.commit()
        db.refresh(run)
        return run

    def ingest_forecasts(
        self,
        publish_from: datetime,
        publish_to: datetime,
        db: Session,
    ) -> IngestionRun:
        """Fetch and store WINDFOR forecast records chunked by publish date."""
        if publish_from.tzinfo is None:
            publish_from = publish_from.replace(tzinfo=timezone.utc)
        if publish_to.tzinfo is None:
            publish_to = publish_to.replace(tzinfo=timezone.utc)

        run = IngestionRun(
            dataset="WINDFOR",
            status="running",
            date_from=publish_from.date(),
            date_to=publish_to.date(),
            records_fetched=0,
            records_inserted=0,
        )
        db.add(run)
        db.commit()
        db.refresh(run)

        total_fetched = 0
        total_inserted = 0
        errors: List[str] = []

        # Chunk by 1-day windows
        curr_start = publish_from
        while curr_start < publish_to:
            curr_end = min(curr_start + timedelta(days=1), publish_to)
            logger.info(
                "Ingesting WINDFOR forecasts chunk",
                extra={
                    "chunk_start": curr_start.isoformat(),
                    "chunk_end": curr_end.isoformat(),
                    "run_id": run.id,
                },
            )
            try:
                raw_records = self.client.fetch_wind_forecasts(curr_start, curr_end)
                total_fetched += len(raw_records)

                clean_records: List[Dict[str, Any]] = []
                for item in raw_records:
                    start_dt = _parse_utc_datetime(item.get("startTime"))
                    pub_dt = _parse_utc_datetime(item.get("publishTime"))
                    gen = item.get("generation")
                    if start_dt is None or pub_dt is None or gen is None:
                        continue
                    try:
                        gen_float = float(gen)
                    except (ValueError, TypeError):
                        continue

                    clean_records.append(
                        {
                            "start_time": start_dt,
                            "publish_time": pub_dt,
                            "generation_mw": gen_float,
                        }
                    )

                inserted = self._insert_forecasts_chunk(clean_records, db)
                total_inserted += inserted

            except Exception as exc:
                err_msg = (
                    f"Error ingesting WINDFOR for {curr_start} to {curr_end}: {exc}"
                )
                logger.error(err_msg, exc_info=True)
                errors.append(err_msg)

            curr_start = curr_end

        run.finished_at = datetime.now(timezone.utc)
        run.records_fetched = total_fetched
        run.records_inserted = total_inserted
        if errors:
            run.error_summary = "\n".join(errors)
            run.status = "partial_failure" if total_inserted > 0 else "failed"
        else:
            run.status = "success"

        db.commit()
        db.refresh(run)
        return run
