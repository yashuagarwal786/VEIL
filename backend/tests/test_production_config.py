import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_database_url_prefers_managed_service_url() -> None:
    settings = Settings(DATABASE_URL="postgresql://user:pass@db.example/veil")
    assert settings.database_url == "postgresql+psycopg://user:pass@db.example/veil"


def test_production_requires_explicit_secure_configuration() -> None:
    with pytest.raises(ValidationError):
        Settings(APP_ENV="production", DATABASE_URL="postgresql://user:pass@db.example/veil")


def test_production_accepts_scoped_frontend_and_secret() -> None:
    settings = Settings(
        APP_ENV="production",
        DATABASE_URL="postgresql://user:pass@db.example/veil",
        FRONTEND_URL="https://veil.example",
        SECRET_KEY="a-production-secret-longer-than-32-characters",
        CORS_ORIGINS="https://veil.example",
        NEO4J_URI="neo4j+s://demo.databases.neo4j.io",
        NEO4J_PASSWORD="synthetic-production-password",
    )
    assert settings.cors_origins == ["https://veil.example"]


def test_production_can_start_before_neo4j_is_configured() -> None:
    settings = Settings(
        APP_ENV="production",
        DATABASE_URL="postgresql://user:pass@db.example/veil",
        FRONTEND_URL="https://veil.example",
        SECRET_KEY="a-production-secret-longer-than-32-characters",
        CORS_ORIGINS="https://veil.example",
    )
    assert settings.neo4j_configured is False


def test_production_removes_localhost_from_cors() -> None:
    settings = Settings(
        APP_ENV="production",
        DATABASE_URL="postgresql://user:pass@db.example/veil",
        FRONTEND_URL="https://veil.example",
        SECRET_KEY="a-production-secret-longer-than-32-characters",
        NEO4J_URI="neo4j+s://demo.databases.neo4j.io",
        NEO4J_PASSWORD="synthetic-production-password",
    )
    assert settings.cors_origins == ["https://veil.example"]


def test_cors_origins_are_normalized_for_browser_origin_matching() -> None:
    settings = Settings(
        APP_ENV="production",
        DATABASE_URL="postgresql://user:pass@db.example/veil",
        FRONTEND_URL="https://veil.example/",
        SECRET_KEY="a-production-secret-longer-than-32-characters",
        CORS_ORIGINS="https://veil.example/",
        NEO4J_URI="neo4j+s://demo.databases.neo4j.io",
        NEO4J_PASSWORD="synthetic-production-password",
    )
    assert settings.cors_origins == ["https://veil.example"]
