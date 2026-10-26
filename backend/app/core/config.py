from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """WindSight Application Settings."""

    DATABASE_URL: str = "postgresql://windsight:windsight@localhost:5432/windsight"
    ELEXON_BASE_URL: str = "https://data.elexon.co.uk/bmrs/api/v1"
    ELEXON_TIMEOUT: int = 30
    ELEXON_MAX_RETRIES: int = 3
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    DECISION_CUTOFF_HOUR: int = 9  # Hour in Europe/London timezone
    ADMIN_API_KEY: str = ""
    LOG_LEVEL: str = "INFO"

    model_config = SettingsConfigDict(
        env_prefix="WINDSIGHT_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """Return cached settings instance."""
    return Settings()
