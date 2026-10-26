"""Initial tables for actuals, forecasts, and ingestion runs

Revision ID: 0001_initial_tables
Revises:
Create Date: 2026-10-26 10:50:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0001_initial_tables"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # actual_generation table
    op.create_table(
        "actual_generation",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("generation_mw", sa.Float(), nullable=False),
        sa.Column(
            "fuel_type", sa.String(length=20), server_default="WIND", nullable=False
        ),
        sa.Column("settlement_date", sa.Date(), nullable=True),
        sa.Column("settlement_period", sa.Integer(), nullable=True),
        sa.Column("publish_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=True,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("start_time", "fuel_type", name="uq_actual_start_fuel"),
    )
    op.create_index(
        "ix_actual_start_time", "actual_generation", ["start_time"], unique=False
    )

    # wind_forecasts table
    op.create_table(
        "wind_forecasts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("publish_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("generation_mw", sa.Float(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=True,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "start_time", "publish_time", name="uq_forecast_start_publish"
        ),
    )
    op.create_index(
        "ix_forecast_publish_time", "wind_forecasts", ["publish_time"], unique=False
    )
    op.create_index(
        "ix_forecast_start_time", "wind_forecasts", ["start_time"], unique=False
    )

    # ingestion_runs table
    op.create_table(
        "ingestion_runs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=True,
        ),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("dataset", sa.String(length=20), nullable=False),
        sa.Column(
            "status", sa.String(length=20), server_default="running", nullable=False
        ),
        sa.Column("records_fetched", sa.Integer(), server_default="0", nullable=True),
        sa.Column("records_inserted", sa.Integer(), server_default="0", nullable=True),
        sa.Column("error_summary", sa.Text(), nullable=True),
        sa.Column("date_from", sa.Date(), nullable=True),
        sa.Column("date_to", sa.Date(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("ingestion_runs")
    op.drop_index("ix_forecast_start_time", table_name="wind_forecasts")
    op.drop_index("ix_forecast_publish_time", table_name="wind_forecasts")
    op.drop_table("wind_forecasts")
    op.drop_index("ix_actual_start_time", table_name="actual_generation")
    op.drop_table("actual_generation")
