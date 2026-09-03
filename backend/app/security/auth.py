from __future__ import annotations

from fastapi import Header, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.case import Case
from app.models.investigator import Investigator


def token_from_header(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Authentication required.")
    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required.")
    return token


def get_investigator_from_token(session: Session, token: str) -> Investigator:
    investigator = session.scalar(select(Investigator).where(Investigator.investigator_id == token, Investigator.status == "ACTIVE"))
    if not investigator:
        raise HTTPException(status_code=401, detail="Invalid investigator session.")
    return investigator


def can_access_case(investigator: Investigator, case: Case) -> bool:
    if investigator.can_view_all_cases or investigator.role in {"ADMINISTRATOR", "SUPERVISOR"}:
        return True
    return case.assigned_investigator_id == investigator.investigator_id or case.created_by_investigator_id == investigator.investigator_id


def require_case_access(session: Session, investigator: Investigator, case_id: int) -> Case:
    case = session.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")
    if not can_access_case(investigator, case):
        raise HTTPException(status_code=403, detail="You are not authorized to access this case.")
    return case


def require_admin(investigator: Investigator) -> None:
    if not investigator.can_assign_cases and investigator.role not in {"ADMINISTRATOR", "SUPERVISOR"}:
        raise HTTPException(status_code=403, detail="Administrator or supervisor access required.")
