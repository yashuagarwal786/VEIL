from fastapi.testclient import TestClient
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.db.base  # noqa: F401
from app.db.session import Base
from app.main import app
from app.models.alert import Alert
from app.models.analytics_result import AnalyticsResult
from app.models.case import Case
from app.models.communication import Communication
from app.models.document import Document
from app.models.entity import CaseEntity
from app.models.evidence import Evidence
from app.models.location import Location
from app.models.person import Person
from app.models.transaction import Transaction


def test_workspace_routes_are_registered() -> None:
    paths = TestClient(app).get("/openapi.json").json()["paths"]

    assert "/api/workspace/dashboard" in paths
    assert "/api/workspace/cases/{case_id}" in paths
    assert "/api/workspace/entities/{entity_id}" in paths
    assert "/api/workspace/evidence" in paths
    assert "/api/workspace/timeline" in paths
    assert "/api/workspace/locations" in paths
    assert "/api/workspace/search" in paths


def test_workspace_end_to_end_read_flow(monkeypatch) -> None:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine)
    now = datetime(2026, 7, 14, 2, 0, tzinfo=timezone.utc)
    with TestingSession() as session:
        case = Case(case_number="VEIL-2026-001", title="Project Eclipse", description="Synthetic demo", status="ACTIVE")
        session.add(case); session.flush()
        person = Person(name="Rahul Sharma", aliases=["R. Sharma"], phone="+91-555-0101", email="rahul@example.test")
        session.add(person); session.flush()
        session.add(CaseEntity(case_id=case.id, entity_type="person", entity_id=person.id))
        location = Location(name="Jaipur Station", latitude=Decimal("26.9124"), longitude=Decimal("75.7873"))
        session.add(location); session.flush()
        transaction = Transaction(sender_entity_id=person.id, receiver_entity_id=45, amount=Decimal("850000"), transaction_type="WIRE", timestamp=now, metadata_={"location_id": location.id, "unusual": True})
        session.add(transaction)
        session.add(Communication(caller_entity_id=person.id, receiver_entity_id=45, timestamp=now, duration_seconds=720, communication_type="CALL", metadata_={}))
        document = Document(case_id=case.id, filename="eclipse.txt", document_type="TXT", text="Observed transaction", processing_status="COMPLETED", metadata_={})
        session.add(document); session.flush()
        session.add(Evidence(case_id=case.id, document_id=document.id, evidence_type="TRANSACTION_PATTERN", source_reference="line 1", content="Observed transaction source", confidence=0.9))
        session.add(AnalyticsResult(case_id=case.id, entity_id=person.id, analysis_type="INVESTIGATION_PRIORITY", score=84, result={"data_sufficiency": "MEDIUM", "explanations": ["Elevated observed activity"]}, model_name="transparent_weighted_priority", model_version="1.0"))
        session.add(Alert(case_id=case.id, entity_id=person.id, alert_type="TRANSACTION_ANOMALY", severity="HIGH", score=91, explanation="Observed amount differs from baseline", status="OPEN", metadata_={}))
        session.commit()
    monkeypatch.setattr("app.api.workspace.SessionLocal", TestingSession)
    client = TestClient(app)

    assert client.get("/api/workspace/dashboard?case_id=1").json()["metrics"]["entities"] == 1
    assert client.get("/api/workspace/cases/1").json()["title"] == "Project Eclipse"
    assert client.get("/api/workspace/entities/P001?case_id=1").json()["priority"]["score"] == 84
    assert client.get("/api/workspace/evidence?case_id=1").json()[0]["document_name"] == "eclipse.txt"
    assert {item["type"] for item in client.get("/api/workspace/timeline?case_id=1").json()} >= {"TRANSACTION", "COMMUNICATION", "DOCUMENT", "ALERT"}
    assert client.get("/api/workspace/locations?case_id=1").json()[0]["name"] == "Jaipur Station"
    assert client.get("/api/workspace/search?query=Rahul").json()[0]["url"] == "/entities/P001"
