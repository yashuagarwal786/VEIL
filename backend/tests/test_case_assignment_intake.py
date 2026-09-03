from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.db.base  # noqa: F401
from app.db.session import Base
from app.main import app
from app.models.case import Case
from app.models.investigator import Investigator
from app.security.passwords import hash_password


def _empty_auth_client(monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine)
    monkeypatch.setattr("app.api.auth.SessionLocal", TestingSession)
    return TestClient(app)


def _client(monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine)
    with TestingSession() as session:
        session.add_all(
            [
                Investigator(
                    investigator_id="INV-1042",
                    name="Yash Agarwal",
                    email="yash.agarwal@synthetic.veil",
                    role="SENIOR_INVESTIGATOR",
                    role_label="Senior Investigator",
                    department="Digital Intelligence Unit",
                    clearance="Level 3",
                    password_hash=hash_password("veil-demo-1042", salt="testsalt1042"),
                    can_view_all_cases=False,
                    can_generate_reports=True,
                ),
                Investigator(
                    investigator_id="INV-2031",
                    name="Aarav Mehta",
                    email="aarav.mehta@synthetic.veil",
                    role="INVESTIGATOR",
                    role_label="Investigator",
                    department="Financial Crimes Cell",
                    clearance="Level 2",
                    password_hash=hash_password("veil-demo-2031", salt="testsalt2031"),
                    can_view_all_cases=False,
                    can_generate_reports=True,
                ),
            ]
        )
        session.add(
            Case(
                case_number="CASE-2026-0142",
                title="Financial Network Investigation",
                description="Synthetic assignment test",
                status="ACTIVE",
                case_type="FINANCIAL_FRAUD",
                priority="HIGH",
                created_by_investigator_id="INV-1042",
                assigned_investigator_id="INV-1042",
                assigned_at=datetime.now(timezone.utc),
            )
        )
        session.commit()
    monkeypatch.setattr("app.api.auth.SessionLocal", TestingSession)
    monkeypatch.setattr("app.api.workspace.SessionLocal", TestingSession)
    return TestClient(app)


def test_investigator_login_and_assigned_case_access(monkeypatch) -> None:
    client = _client(monkeypatch)
    login = client.post("/api/auth/login", json={"email": "yash.agarwal@synthetic.veil", "password": "veil-demo-1042"})
    assert login.status_code == 200
    token = login.json()["access_token"]
    response = client.get("/api/workspace/cases", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()[0]["case_number"] == "CASE-2026-0142"


def test_first_run_investigator_setup(monkeypatch) -> None:
    client = _empty_auth_client(monkeypatch)
    assert client.get("/api/auth/setup-required").json() == {"required": True}
    response = client.post(
        "/api/auth/setup",
        json={
            "name": "Yash Agarwal",
            "email": "yash.agarwal@example.com",
            "password": "strong-pass-1042",
            "investigator_id": "INV-1042",
        },
    )
    assert response.status_code == 200
    assert response.json()["access_token"] == "INV-1042"
    assert client.get("/api/auth/setup-required").json() == {"required": False}
    assert client.post(
        "/api/auth/setup",
        json={"name": "Second", "email": "second@example.com", "password": "strong-pass-2031"},
    ).status_code == 409


def test_invalid_login_and_unauthorized_case_access(monkeypatch) -> None:
    client = _client(monkeypatch)
    assert client.post("/api/auth/login", json={"email": "yash.agarwal@synthetic.veil", "password": "bad"}).status_code == 401
    response = client.get("/api/workspace/cases/1", headers={"Authorization": "Bearer INV-2031"})
    assert response.status_code == 403


def test_invalid_case_source_upload_rejected(monkeypatch) -> None:
    client = _client(monkeypatch)
    response = client.post(
        "/api/workspace/cases/1/sources",
        headers={"Authorization": "Bearer INV-1042"},
        files={"file": ("bad.exe", b"not allowed", "application/octet-stream")},
        data={"data_category": "FIR_REPORT", "source_description": "bad file"},
    )
    assert response.status_code == 400
