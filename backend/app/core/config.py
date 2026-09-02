from functools import lru_cache

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _normalize_origin(origin: str) -> str:
    return origin.strip().rstrip("/")


class Settings(BaseSettings):
    app_env: str = Field(default="development", alias="APP_ENV")
    database_url_raw: str | None = Field(default=None, alias="DATABASE_URL")
    frontend_url: str | None = Field(default=None, alias="FRONTEND_URL")
    secret_key: str = Field(default="development-only-change-me", alias="SECRET_KEY")

    postgres_host: str = Field(default="localhost", alias="POSTGRES_HOST")
    postgres_port: int = Field(default=5432, alias="POSTGRES_PORT")
    postgres_db: str = Field(default="veil", alias="POSTGRES_DB")
    postgres_user: str = Field(default="veil", alias="POSTGRES_USER")
    postgres_password: str = Field(default="change_me", alias="POSTGRES_PASSWORD")

    neo4j_uri: str = Field(default="bolt://localhost:7687", alias="NEO4J_URI")
    neo4j_user: str = Field(default="neo4j", alias="NEO4J_USER")
    neo4j_password: str = Field(default="change_me", alias="NEO4J_PASSWORD")

    api_base_url: str = Field(default="http://localhost:8000", alias="API_BASE_URL")
    anomaly_contamination: float = Field(default=0.08, alias="ANOMALY_CONTAMINATION")
    anomaly_estimators: int = Field(default=100, alias="ANOMALY_ESTIMATORS")
    anomaly_random_state: int = Field(default=20260827, alias="ANOMALY_RANDOM_STATE")
    cors_origins_raw: str = Field(
        default="http://localhost:5173,http://127.0.0.1:5173",
        alias="CORS_ORIGINS",
    )

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def database_url(self) -> str:
        if self.database_url_raw:
            url = self.database_url_raw
            if url.startswith("postgres://"):
                return url.replace("postgres://", "postgresql+psycopg://", 1)
            if url.startswith("postgresql://"):
                return url.replace("postgresql://", "postgresql+psycopg://", 1)
            return url
        return (
            f"postgresql+psycopg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def cors_origins(self) -> list[str]:
        origins = [_normalize_origin(origin) for origin in self.cors_origins_raw.split(",") if origin.strip()]
        if self.app_env.lower() == "production":
            origins = [origin for origin in origins if not origin.startswith(("http://localhost", "http://127.0.0.1"))]
        frontend_origin = _normalize_origin(self.frontend_url) if self.frontend_url else None
        if frontend_origin and frontend_origin not in origins:
            origins.append(frontend_origin)
        return origins

    @property
    def neo4j_configured(self) -> bool:
        return self.neo4j_password != "change_me" and self.neo4j_uri != "bolt://localhost:7687"

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        if self.app_env.lower() == "production":
            if not self.database_url_raw:
                raise ValueError("DATABASE_URL is required in production")
            if not self.frontend_url:
                raise ValueError("FRONTEND_URL is required in production")
            if self.secret_key == "development-only-change-me" or len(self.secret_key) < 32:
                raise ValueError("SECRET_KEY must be a production secret of at least 32 characters")
            if "*" in self.cors_origins:
                raise ValueError("Wildcard CORS origins are not allowed in production")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
