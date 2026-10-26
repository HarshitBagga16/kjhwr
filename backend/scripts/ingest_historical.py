"""CLI script to trigger historical Elexon data ingestion for January 2026.

Usage:
    python -m scripts.ingest_historical --date-from 2026-01-01 --date-to 2026-01-31
"""

import argparse
from datetime import date, datetime, timedelta, timezone
import logging
import sys

from app.core.logging import setup_logging
from app.db.session import SessionLocal
from app.services.ingestion_service import IngestionService

setup_logging("INFO")
logger = logging.getLogger("scripts.ingest_historical")


def parse_args():
    parser = argparse.ArgumentParser(description="Ingest historical Elexon data")
    parser.add_argument(
        "--date-from",
        type=lambda d: datetime.strptime(d, "%Y-%m-%d").date(),
        default=date(2026, 1, 1),
        help="Start date YYYY-MM-DD (default 2026-01-01)",
    )
    parser.add_argument(
        "--date-to",
        type=lambda d: datetime.strptime(d, "%Y-%m-%d").date(),
        default=date(2026, 1, 31),
        help="End date YYYY-MM-DD (default 2026-01-31)",
    )
    parser.add_argument(
        "--dataset",
        choices=["all", "actuals", "forecasts"],
        default="all",
        help="Datasets to ingest",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    logger.info(
        "Starting historical ingestion",
        extra={"date_from": str(args.date_from), "date_to": str(args.date_to)},
    )

    db = SessionLocal()
    service = IngestionService()

    try:
        # Ingest Actuals (FUELHH WIND)
        if args.dataset in ("all", "actuals"):
            logger.info("Ingesting FUELHH actual generation...")
            run_actuals = service.ingest_actuals(args.date_from, args.date_to, db)
            logger.info(
                "Actuals ingestion completed",
                extra={
                    "status": run_actuals.status,
                    "fetched": run_actuals.records_fetched,
                    "inserted": run_actuals.records_inserted,
                },
            )

        # Ingest Forecasts (WINDFOR)
        if args.dataset in ("all", "forecasts"):
            logger.info("Ingesting WINDFOR wind forecasts...")
            # Query publish window covering from 2 days prior through end of period
            pub_from = datetime.combine(
                args.date_from - timedelta(days=2),
                datetime.min.time(),
                tzinfo=timezone.utc,
            )
            pub_to = datetime.combine(
                args.date_to + timedelta(days=1),
                datetime.max.time(),
                tzinfo=timezone.utc,
            )
            run_forecasts = service.ingest_forecasts(pub_from, pub_to, db)
            logger.info(
                "Forecasts ingestion completed",
                extra={
                    "status": run_forecasts.status,
                    "fetched": run_forecasts.records_fetched,
                    "inserted": run_forecasts.records_inserted,
                },
            )

        logger.info("Historical ingestion finished successfully.")
    except Exception as exc:
        logger.error(f"Ingestion failed: {exc}", exc_info=True)
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
