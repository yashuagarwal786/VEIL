from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = ROOT / "backend"
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(BACKEND_ROOT))

from app.db.session import Base, SessionLocal, engine
from app.models.investigator import Investigator
from app.security.passwords import hash_password


def _truthy(value: str | None) -> bool:
    return (value or "").strip().lower() in {"1", "true", "yes", "on"}


def main() -> None:
    email = os.getenv("INITIAL_INVESTIGATOR_EMAIL", "").strip().lower()
    password = os.getenv("INITIAL_INVESTIGATOR_PASSWORD", "")
    if not email or not password:
        print("Initial investigator bootstrap skipped: INITIAL_INVESTIGATOR_EMAIL/PASSWORD not set.")
        return

    Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        existing = session.query(Investigator).filter(Investigator.email == email).one_or_none()
        if existing:
            print(f"Initial investigator already exists: {email}")
            return
        investigator_id = os.getenv("INITIAL_INVESTIGATOR_ID", "INV-1000").strip()
        investigator = Investigator(
            investigator_id=investigator_id,
            name=os.getenv("INITIAL_INVESTIGATOR_NAME", "Senior Investigator").strip(),
            email=email,
            role=os.getenv("INITIAL_INVESTIGATOR_ROLE", "SENIOR_INVESTIGATOR").strip(),
            role_label=os.getenv("INITIAL_INVESTIGATOR_ROLE_LABEL", "Senior Investigator").strip(),
            department=os.getenv("INITIAL_INVESTIGATOR_DEPARTMENT", "Investigation Unit").strip(),
            clearance=os.getenv("INITIAL_INVESTIGATOR_CLEARANCE", "Level 3 - Case Intelligence").strip(),
            password_hash=hash_password(password),
            can_view_all_cases=_truthy(os.getenv("INITIAL_INVESTIGATOR_CAN_VIEW_ALL_CASES", "true")),
            can_assign_cases=_truthy(os.getenv("INITIAL_INVESTIGATOR_CAN_ASSIGN_CASES", "false")),
            can_generate_reports=_truthy(os.getenv("INITIAL_INVESTIGATOR_CAN_GENERATE_REPORTS", "true")),
            can_review_audit_trail=_truthy(os.getenv("INITIAL_INVESTIGATOR_CAN_REVIEW_AUDIT", "true")),
        )
        session.add(investigator)
        session.commit()
        print(f"Initial investigator created: {email} ({investigator_id})")


if __name__ == "__main__":
    main()
