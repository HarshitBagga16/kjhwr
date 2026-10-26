from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.routes import admin, analytics, dashboard, forecasts
from app.core.config import get_settings
from app.core.logging import setup_logging
from app.db.session import get_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context for startup and shutdown routines."""
    settings = get_settings()
    setup_logging(settings.LOG_LEVEL)
    yield


settings = get_settings()

app = FastAPI(
    title="WindSight API",
    description="UK Wind Generation Forecast Intelligence Platform API providing alignment, tracking, and accuracy analytics.",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers under /api
app.include_router(dashboard.router, prefix="/api")
app.include_router(forecasts.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(admin.router, prefix="/api")


@app.get("/api/health", tags=["Health"])
def health_check(db: Session = Depends(get_db)) -> dict:
    """Verify system liveness and database connectivity."""
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:
        db_status = f"unhealthy: {exc}"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "WindSight API",
        "version": "1.0.0",
    }
