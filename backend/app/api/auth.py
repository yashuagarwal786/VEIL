from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.investigator import Investigator
from app.security.passwords import verify_password

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
