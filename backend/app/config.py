"""Application configuration management using pydantic-settings."""

from typing import List
from functools import lru_cache

from pydantic_settings import BaseSettings
from pydantic import field_validator


class Settings(BaseSettings):
    """Application settings loaded from environment variables or .env file."""

    # Database
    DATABASE_URL: str = "sqlite:///./dev.db"

    # Redis / Celery
    REDIS_URL: str = "redis://localhost:6379/0"

    # Storage
    STORAGE_PATH: str = "storage"

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Application
    APP_NAME: str = "PodCraft API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True

    # Security
    SECRET_KEY: str = "change-me-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # TTS Provider Configuration
    TTS_PROVIDER_PRIMARY: str = "minimax"
    TTS_MINIMAX_API_KEY: str = ""
    TTS_MINIMAX_API_BASE: str = "https://api.minimax.chat"
    TTS_MINIMAX_MAX_QPS: int = 10
    TTS_EDGETTS_ENABLED: bool = True

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: str) -> str:
        """Ensure CORS_ORIGINS is a valid comma-separated string."""
        if isinstance(v, list):
            return ",".join(v)
        return v

    def get_cors_origins_list(self) -> List[str]:
        """Parse CORS_ORIGINS string into a list of URLs."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Return cached settings instance."""
    return Settings()
