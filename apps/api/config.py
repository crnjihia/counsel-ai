from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from typing import Optional

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DEBUG: bool = Field(default=False)
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://counsel:counsel_secret@localhost:5432/counsel_db",
        description="Async SQLAlchemy database connection string"
    )
    REDIS_URL: str = Field(
        default="redis://localhost:6379/0",
        description="Redis connection URL for session caching and rate limits"
    )
    ANTHROPIC_API_KEY: str = Field(
        default="mock-key-for-local-testing",
        description="Anthropic Claude API Key"
    )
    ANTHROPIC_MODEL: str = Field(
        default="claude-3-5-sonnet-20241022",
        description="Claude model version"
    )
    DAILY_TOKEN_CAP: int = Field(
        default=100_000,
        description="Max allowed tokens per user per calendar day"
    )
    UPLOAD_DIR: str = Field(
        default="./uploads",
        description="Local directory for storing uploaded document PDFs"
    )

settings = Settings()