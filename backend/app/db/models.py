from sqlalchemy import (
    Column,
    Integer,
    Float,
    String,
    Date,
    DateTime,
    Text,
    UniqueConstraint,
    Index,
    func,
)
from app.db.session import Base


class ActualGeneration(Base):
    """Actual outturn generation records (primarily FUELHH WIND)."""

    __tablename__ = "actual_generation"

    id = Column(Integer, primary_key=True, autoincrement=True)
    start_time = Column(DateTime(timezone=True), nullable=False)  # UTC
    generation_mw = Column(Float, nullable=False)
    fuel_type = Column(String(20), nullable=False, default="WIND")
    settlement_date = Column(Date, nullable=True)
    settlement_period = Column(Integer, nullable=True)
    publish_time = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("start_time", "fuel_type", name="uq_actual_start_fuel"),
        Index("ix_actual_start_time", "start_time"),
    )


class WindForecast(Base):
    """Wind generation forecast records across historical vintages (WINDFOR)."""

    __tablename__ = "wind_forecasts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    start_time = Column(
        DateTime(timezone=True), nullable=False
    )  # delivery interval UTC
    publish_time = Column(
        DateTime(timezone=True), nullable=False
    )  # when forecast was published
    generation_mw = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint(
            "start_time", "publish_time", name="uq_forecast_start_publish"
        ),
        Index("ix_forecast_start_time", "start_time"),
        Index("ix_forecast_publish_time", "publish_time"),
    )


class IngestionRun(Base):
    """Audit log tracking dataset ingestion execution and status."""

    __tablename__ = "ingestion_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    finished_at = Column(DateTime(timezone=True), nullable=True)
    dataset = Column(String(20), nullable=False)  # 'FUELHH' or 'WINDFOR'
    status = Column(
        String(20), nullable=False, default="running"
    )  # running, success, failed
    records_fetched = Column(Integer, default=0)
    records_inserted = Column(Integer, default=0)
    error_summary = Column(Text, nullable=True)
    date_from = Column(Date, nullable=True)
    date_to = Column(Date, nullable=True)
