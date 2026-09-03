from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy import select
from sqlalchemy import func

from app.db.session import SessionLocal
from app.models.investigator import Investigator
from app.security.passwords import verify_password
from app.security.passwords import hash_password

router = APIRouter()


class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if "@" not in normalized:
            raise ValueError("Email address is required")
        return normalized


class InitialSetupRequest(LoginRequest):
    name: str
    investigator_id: str = "INV-1042"
    role: str = "SENIOR_INVESTIGATOR"
    role_label: str = "Senior Investigator"
    department: str = "Digital Intelligence Unit"
    clearance: str = "Level 3 - Case Intelligence"

    @field_validator("name")
    @classmethod
    def require_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Investigator name is required")
        return normalized

    @field_validator("password")
    @classmethod
    def require_secure_password(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters")
        return value


def investigator_row(item: Investigator) -> dict:
    return {
        "id": item.investigator_id,
        "name": item.name,
        "email": item.email,
        "role": item.role,
        "role_label": item.role_label,
        "department": item.department,
        "clearance": item.clearance,
        "status": item.status,
        "last_login": item.last_login,
        "permissions": {
            "canViewAllCases": item.can_view_all_cases,
            "canAssignCases": item.can_assign_cases,
            "canGenerateReports": item.can_generate_reports,
            "canReviewAuditTrail": item.can_review_audit_trail,
        },
    }


@router.post("/login")
def login(payload: LoginRequest) -> dict:
    with SessionLocal() as session:
        investigator = session.scalar(select(Investigator).where(Investigator.email == payload.email.lower(), Investigator.status == "ACTIVE"))
        if not investigator or not verify_password(payload.password, investigator.password_hash):
            raise HTTPException(401, "Invalid investigator credentials")
        investigator.last_login = datetime.now(timezone.utc)
        session.commit()
        session.refresh(investigator)
        return {"investigator": investigator_row(investigator), "token_type": "synthetic-session", "access_token": investigator.investigator_id}


@router.get("/setup-required")
def setup_required() -> dict:
    with SessionLocal() as session:
        total = session.scalar(select(func.count()).select_from(Investigator)) or 0
        return {"required": total == 0}


@router.post("/setup")
def setup(payload: InitialSetupRequest) -> dict:
    with SessionLocal() as session:
        total = session.scalar(select(func.count()).select_from(Investigator)) or 0
        if total:
            raise HTTPException(409, "Initial investigator setup is already complete")
        investigator = Investigator(
            investigator_id=payload.investigator_id.strip() or "INV-1042",
            name=payload.name,
            email=payload.email.lower(),
            role=payload.role,
            role_label=payload.role_label,
            department=payload.department,
            clearance=payload.clearance,
            password_hash=hash_password(payload.password),
            can_view_all_cases=True,
            can_assign_cases=False,
            can_generate_reports=True,
            can_review_audit_trail=True,
        )
        session.add(investigator)
        session.commit()
        session.refresh(investigator)
        return {"investigator": investigator_row(investigator), "token_type": "synthetic-session", "access_token": investigator.investigator_id}


@router.get("/investigators")
def investigators() -> list[dict]:
    with SessionLocal() as session:
        rows = session.scalars(select(Investigator).where(Investigator.status == "ACTIVE").order_by(Investigator.name)).all()
        return [investigator_row(item) for item in rows]


@router.get("/me/{investigator_id}")
def me(investigator_id: str) -> dict:
    with SessionLocal() as session:
        investigator = session.scalar(select(Investigator).where(Investigator.investigator_id == investigator_id))
        if not investigator:
            raise HTTPException(404, "Investigator not found")
        return investigator_row(investigator)
