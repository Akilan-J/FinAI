from typing import Annotated, Any, List, Optional
from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict
from dotenv import load_dotenv

# Load .env file into environment variables
load_dotenv()

# Known insecure defaults shipped in .env.example — used only to detect
# misconfiguration when ENVIRONMENT=production, never trusted as real secrets.
INSECURE_DEFAULT_SECRET_KEY = "super_secret_session_signing_key_finai_2026"
INSECURE_DEFAULT_DATABASE_URL = "postgresql+asyncpg://finai_user:finai_password@localhost:5432/finai_db"


class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "FinAI"

    # development | production — gates secret-strength checks, cookie
    # security flags, and how much detail error responses expose.
    ENVIRONMENT: str = "development"

    # Public URL of the frontend, used to build links sent in emails.
    FRONTEND_URL: str = "http://localhost:3000"

    # CORS Origins
    BACKEND_CORS_ORIGINS: Annotated[List[str], NoDecode] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Database
    DATABASE_URL: str = INSECURE_DEFAULT_DATABASE_URL

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_ALWAYS_EAGER: bool = False

    # JWT Security
    SECRET_KEY: str = INSECURE_DEFAULT_SECRET_KEY
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # API Keys
    OPENROUTER_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None

    # Outbound email (password reset, etc.). When SMTP_HOST is unset, the
    # email service logs the message instead of sending it — useful for
    # local dev, but reset links are never returned in API responses either way.
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: str = "no-reply@finai.local"
    SMTP_USE_TLS: bool = True

    # Optional error tracking — only enabled if a DSN is provided.
    SENTRY_DSN: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def split_cors_origins(cls, v: Any) -> Any:
        # NoDecode means this always arrives as a raw string when sourced
        # from an env var. Accept a JSON list or a plain comma-separated
        # string (easy to paste into a platform's env-var UI).
        if isinstance(v, str):
            stripped = v.strip()
            if stripped.startswith("["):
                import json

                return json.loads(stripped)
            return [origin.strip() for origin in stripped.split(",") if origin.strip()]
        return v

    @field_validator("DATABASE_URL")
    @classmethod
    def normalize_database_url(cls, v: str) -> str:
        # Managed Postgres providers (Railway, Heroku, etc.) hand out
        # postgres:// or postgresql:// URLs; SQLAlchemy's async engine needs
        # the +asyncpg driver suffix.
        if v.startswith("postgres://"):
            return "postgresql+asyncpg://" + v[len("postgres://"):]
        if v.startswith("postgresql://"):
            return "postgresql+asyncpg://" + v[len("postgresql://"):]
        return v

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    def validate_production_secrets(self) -> None:
        """Fail fast on startup rather than silently running insecure in prod."""
        if not self.is_production:
            return
        if self.SECRET_KEY == INSECURE_DEFAULT_SECRET_KEY:
            raise RuntimeError(
                "SECRET_KEY is set to the insecure default value. "
                "Set a unique SECRET_KEY via environment variable before running in production."
            )
        if self.DATABASE_URL == INSECURE_DEFAULT_DATABASE_URL:
            raise RuntimeError(
                "DATABASE_URL is set to the insecure default value. "
                "Set a real DATABASE_URL via environment variable before running in production."
            )


settings = Settings()
