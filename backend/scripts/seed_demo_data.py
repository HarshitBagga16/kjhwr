"""Script to populate explicitly labelled demonstration records for January 2026.

DISCLAIMER: This script generates SYNTHETIC demonstration records for offline
testing, sandbox verification, and UI demonstrations when live Elexon API access
is unavailable. Synthetic records are never confused with genuine Elexon observations.

Usage:
    python -m scripts.seed_demo_data
"""

from datetime import date, datetime, timedelta, timezone
import logging
import math
import sys
from app.core.logging import setup_logging
from app.db.models import ActualGeneration, IngestionRun, WindForecast
from app.db.session import Base, SessionLocal, engine

setup_logging("INFO")
logger = logging.getLogger("scripts.seed_demo_data")


def seed_demo_data():
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        existing_forecasts = db.query(WindForecast).count()
        if existing_forecasts > 0:
            logger.info(
                f"Database already contains {existing_forecasts} forecast records. Skipping seed."
            )
            return

        logger.info("Seeding synthetic demonstration records for January 2026...")

        # 31 days in January 2026
        start_date = date(2026, 1, 1)
        end_date = date(2026, 1, 31)

        forecasts_to_add = []
        actuals_to_add = []

        curr_date = start_date
        while curr_date <= end_date:
            day_offset = (curr_date - start_date).days
            # Seasonal base wind pattern in MW with diurnal fluctuation
            base_wind = 12000.0 + 4000.0 * math.sin(day_offset / 3.0)

            for hour in range(24):
                dt_utc = datetime(
                    curr_date.year,
                    curr_date.month,
                    curr_date.day,
                    hour,
                    0,
                    0,
                    tzinfo=timezone.utc,
                )
                hourly_wind = max(
                    2000.0, base_wind + 2500.0 * math.cos(hour * math.pi / 12.0)
                )

                # 1. Hourly Wind Forecasts with revisions
                # Vintage 1: Published day before at 18:00
                pub_v1 = dt_utc - timedelta(days=1, hours=6)
                gen_v1 = hourly_wind * 1.05 + 200.0  # slight overforecast
                forecasts_to_add.append(
                    WindForecast(
                        start_time=dt_utc,
                        publish_time=pub_v1,
                        generation_mw=round(gen_v1, 2),
                    )
                )

                # Vintage 2: Published day of delivery at 07:30 (before 09:00 cutoff)
                pub_v2 = datetime(
                    curr_date.year,
                    curr_date.month,
                    curr_date.day,
                    7,
                    30,
                    0,
                    tzinfo=timezone.utc,
                )
                gen_v2 = hourly_wind * 1.02 + 80.0  # closer forecast
                forecasts_to_add.append(
                    WindForecast(
                        start_time=dt_utc,
                        publish_time=pub_v2,
                        generation_mw=round(gen_v2, 2),
                    )
                )

                # Vintage 3: Published day of delivery at 11:30 (after 09:00 cutoff - should be excluded by PIT cutoff)
                pub_v3 = datetime(
                    curr_date.year,
                    curr_date.month,
                    curr_date.day,
                    11,
                    30,
                    0,
                    tzinfo=timezone.utc,
                )
                gen_v3 = hourly_wind * 0.99
                forecasts_to_add.append(
                    WindForecast(
                        start_time=dt_utc,
                        publish_time=pub_v3,
                        generation_mw=round(gen_v3, 2),
                    )
                )

                # 2. Half-hourly Actual Generation (2 records per hour)
                # First half hour
                actual_hh1 = hourly_wind * (1.0 + 0.02 * math.sin(hour))
                actuals_to_add.append(
                    ActualGeneration(
                        start_time=dt_utc,
                        generation_mw=round(actual_hh1, 2),
                        fuel_type="WIND",
                        settlement_date=curr_date,
                        settlement_period=hour * 2 + 1,
                        publish_time=dt_utc + timedelta(minutes=45),
                    )
                )

                # Second half hour
                actual_hh2 = hourly_wind * (1.0 + 0.03 * math.cos(hour))
                actuals_to_add.append(
                    ActualGeneration(
                        start_time=dt_utc + timedelta(minutes=30),
                        generation_mw=round(actual_hh2, 2),
                        fuel_type="WIND",
                        settlement_date=curr_date,
                        settlement_period=hour * 2 + 2,
                        publish_time=dt_utc + timedelta(minutes=75),
                    )
                )

            curr_date += timedelta(days=1)

        db.bulk_save_objects(forecasts_to_add)
        db.bulk_save_objects(actuals_to_add)

        # Audit run record explicitly labelling data as synthetic demo
        demo_run = IngestionRun(
            dataset="DEMO_SYNTHETIC",
            status="success",
            records_fetched=len(forecasts_to_add) + len(actuals_to_add),
            records_inserted=len(forecasts_to_add) + len(actuals_to_add),
            error_summary="DEMO MODE: Synthetic records populated for local offline demonstration.",
            date_from=start_date,
            date_to=end_date,
        )
        db.add(demo_run)
        db.commit()

        logger.info(
            "Demo seeding completed successfully.",
            extra={
                "forecasts_seeded": len(forecasts_to_add),
                "actuals_seeded": len(actuals_to_add),
                "date_range": "2026-01-01 to 2026-01-31",
            },
        )
    except Exception as exc:
        db.rollback()
        logger.error(f"Seeding failed: {exc}", exc_info=True)
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    seed_demo_data()
