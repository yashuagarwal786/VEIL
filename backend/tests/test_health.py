from fastapi.testclient import TestClient

from app.api import health as health_api
from app.main import app


def test_health_endpoint() -> None:
    client = TestClient(app)
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "VEIL API"}


def test_neo4j_health_reports_disconnected_when_not_configured(monkeypatch) -> None:
    monkeypatch.setattr(health_api.settings, "neo4j_uri", "bolt://localhost:7687")
    monkeypatch.setattr(health_api.settings, "neo4j_password", "change_me")

    client = TestClient(app)
    response = client.get("/api/health/neo4j")

    assert response.status_code == 200
    assert response.json() == {
        "status": "error",
        "graph": "disconnected",
        "detail": "Neo4j is not configured.",
    }
