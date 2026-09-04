from __future__ import annotations

import argparse
import json
import sys
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = ROOT / "backend"
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(BACKEND_ROOT))

import app.db.base  # noqa: F401
from app.db.session import Base, SessionLocal, engine
from app.models.alert import Alert
from app.models.bank_account import BankAccount
from app.models.case import Case
from app.models.communication import Communication
from app.models.document import Document
from app.models.entity import CaseEntity
from app.models.evidence import Evidence
from app.models.investigator import Investigator
from app.models.location import Location
from app.models.organization import Organization
from app.models.person import Person
from app.models.phone import Phone
from app.models.transaction import Transaction
from app.models.vehicle import Vehicle
from app.security.passwords import hash_password
from scripts.synthetic_data import generate_dataset

SYNTHETIC_DIR = ROOT / "data" / "synthetic"
DATASET_PATH = SYNTHETIC_DIR / "demo_dataset.json"

DEMO_INVESTIGATORS = [
    {
        "investigator_id": "INV-1042",
        "name": "Yash Agarwal",
        "email": "yash.agarwal@synthetic.veil",
        "role": "SENIOR_INVESTIGATOR",
        "role_label": "Senior Investigator",
        "department": "Digital Intelligence Unit",
        "clearance": "Level 3 - Case Intelligence",
        "password": "veil-demo-1042",
        "can_view_all_cases": True,
        "can_assign_cases": False,
        "can_generate_reports": True,
        "can_review_audit_trail": True,
    },
    {
        "investigator_id": "INV-2031",
        "name": "Aarav Mehta",
        "email": "aarav.mehta@synthetic.veil",
        "role": "INVESTIGATOR",
        "role_label": "Investigator",
        "department": "Financial Crimes Cell",
        "clearance": "Level 2 - Evidence Review",
        "password": "veil-demo-2031",
        "can_view_all_cases": False,
        "can_assign_cases": False,
        "can_generate_reports": True,
        "can_review_audit_trail": False,
    },
    {
        "investigator_id": "INV-0001",
        "name": "Operations Admin",
        "email": "admin@synthetic.veil",
        "role": "ADMINISTRATOR",
        "role_label": "Administrator",
        "department": "VEIL Operations",
        "clearance": "Level 4 - Administration",
        "password": "veil-admin-0001",
        "can_view_all_cases": True,
        "can_assign_cases": True,
        "can_generate_reports": True,
        "can_review_audit_trail": True,
    },
]


def export_dataset(dataset: dict[str, list[dict[str, Any]]]) -> None:
    SYNTHETIC_DIR.mkdir(parents=True, exist_ok=True)
    DATASET_PATH.write_text(json.dumps(dataset, indent=2), encoding="utf-8")


def _metadata(row: dict[str, Any]) -> dict[str, Any] | None:
    return row.get("metadata")


def _date(value: str) -> date:
    return date.fromisoformat(value)


def _datetime(value: str) -> datetime:
    return datetime.fromisoformat(value)


def _decimal(value: str) -> Decimal:
    return Decimal(value)


def reset_demo_data() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def seed_investigators(session) -> None:
    existing = {row.email for row in session.query(Investigator).all()}
    for row in DEMO_INVESTIGATORS:
        if row["email"] in existing:
            continue
        payload = {key: value for key, value in row.items() if key != "password"}
        payload["password_hash"] = hash_password(row["password"])
        session.add(Investigator(**payload))


def backfill_assignment_metadata(session) -> None:
    if not session.query(Case).filter(Case.case_number == "CASE-2026-0142").one_or_none():
        session.add(
            Case(
                case_number="CASE-2026-0142",
                title="Financial Network Investigation",
                description="Synthetic case intake scenario with overlapping FIR, CDR, financial, surveillance, and criminal history sources.",
                status="ACTIVE",
                case_type="FINANCIAL_FRAUD",
                priority="CRITICAL",
                created_by_investigator_id="INV-0001",
                assigned_investigator_id="INV-1042",
                assigned_at=_datetime("2026-09-03T09:00:00+00:00"),
                jurisdiction="Synthetic Demonstration Region",
                sensitivity="SYNTHETIC_DEMO",
            )
        )
        session.flush()
    for case in session.query(Case).all():
        if not case.created_by_investigator_id:
            case.created_by_investigator_id = "INV-0001"
        if not case.assigned_investigator_id:
            case.assigned_investigator_id = "INV-1042" if case.id in {1, 2} or case.id % 2 == 0 else "INV-2031"
        if not case.assigned_at:
            case.assigned_at = _datetime("2026-09-03T09:00:00+00:00")
        if not case.case_type:
            case.case_type = "GENERAL"
        if not case.priority:
            case.priority = "HIGH" if case.id in {1, 2} else "MEDIUM"
        if not case.sensitivity:
            case.sensitivity = "SYNTHETIC_DEMO"
    categories = ["FIR_REPORT", "CDR", "FINANCIAL", "SURVEILLANCE", "CRIMINAL_HISTORY"]
    for document in session.query(Document).all():
        document.original_filename = document.original_filename or document.filename
        document.data_category = document.data_category or categories[document.id % len(categories)]
        document.source_description = document.source_description or "Synthetic source with deterministic provenance for VEIL demo workflows."
        document.uploaded_by_investigator_id = document.uploaded_by_investigator_id or "INV-1042"
        document.checksum_sha256 = document.checksum_sha256 or f"synthetic-{document.id:056d}"[-64:]


def seed_missing_india_cyber_case(session, dataset: dict[str, list[dict[str, Any]]]) -> None:
    if session.query(Case).filter(Case.case_number == "CYBER-2026-009").one_or_none():
        case = session.query(Case).filter(Case.case_number == "CYBER-2026-009").one()
        existing_entities = {
            row.entity_id
            for row in session.query(CaseEntity).filter(
                CaseEntity.case_id == case.id,
                CaseEntity.entity_type == "person",
            )
        }
        session.add_all(
            CaseEntity(case_id=case.id, entity_type="person", entity_id=entity_id)
            for entity_id in [76, 77, 78, 79, 80, 81, 82]
            if entity_id not in existing_entities
        )
        return

    case_row = next(row for row in dataset["cases"] if row["case_number"] == "CYBER-2026-009")
    case = Case(
        case_number=case_row["case_number"],
        title=case_row["title"],
        description=case_row["description"],
        status=case_row["status"],
        case_type=case_row.get("case_type", "CYBER_FRAUD"),
        priority=case_row.get("priority", "CRITICAL"),
        created_by_investigator_id="INV-0001",
        assigned_investigator_id="INV-1042",
        assigned_at=_datetime("2026-09-03T09:00:00+00:00"),
        jurisdiction="Synthetic Demonstration Region",
        sensitivity="SYNTHETIC_DEMO",
    )
    session.add(case)
    session.flush()

    existing_phones = {row.number for row in session.query(Phone).all()}
    session.add_all(
        Phone(number=row["number"], carrier=row["carrier"], metadata_=_metadata(row))
        for row in dataset["phones"]
        if (row.get("metadata") or {}).get("scenario") == "india_voice_phishing" and row["number"] not in existing_phones
    )
    existing_people = {row.email for row in session.query(Person).all()}
    session.add_all(
        Person(
            id=row["id"],
            name=row["name"],
            aliases=row["aliases"],
            phone=row["phone"],
            email=row["email"],
            date_of_birth=_date(row["date_of_birth"]),
            address=row["address"],
            metadata_=_metadata(row),
        )
        for row in dataset["persons"]
        if (row.get("metadata") or {}).get("network", "").startswith("india_scam") and row["email"] not in existing_people
    )
    existing_accounts = {row.account_number_masked for row in session.query(BankAccount).all()}
    session.add_all(
        BankAccount(id=row["id"], account_number_masked=row["account_number_masked"], bank_name=row["bank_name"], metadata_=_metadata(row))
        for row in dataset["bank_accounts"]
        if (row.get("metadata") or {}).get("scenario") == "india_voice_phishing" and row["account_number_masked"] not in existing_accounts
    )
    existing_locations = {row.name for row in session.query(Location).all()}
    session.add_all(
        Location(id=row["id"], name=row["name"], latitude=_decimal(row["latitude"]), longitude=_decimal(row["longitude"]), address=row["address"], metadata_=_metadata(row))
        for row in dataset["locations"]
        if (row.get("metadata") or {}).get("scenario") == "india_voice_phishing" and row["name"] not in existing_locations
    )
    session.flush()

    existing_communication_ids = {row.id for row in session.query(Communication.id).all()}
    session.add_all(
        Communication(
            id=row["id"],
            caller_entity_id=row["caller_entity_id"],
            receiver_entity_id=row["receiver_entity_id"],
            timestamp=_datetime(row["timestamp"]),
            duration_seconds=row["duration_seconds"],
            communication_type=row["communication_type"],
            metadata_=_metadata(row),
        )
        for row in dataset["communications"]
        if (row.get("metadata") or {}).get("scenario") == "india_voice_phishing" and row["id"] not in existing_communication_ids
    )
    existing_transaction_ids = {row.id for row in session.query(Transaction.id).all()}
    session.add_all(
        Transaction(
            id=row["id"],
            sender_entity_id=row["sender_entity_id"],
            receiver_entity_id=row["receiver_entity_id"],
            amount=_decimal(row["amount"]),
            transaction_type=row["transaction_type"],
            timestamp=_datetime(row["timestamp"]),
            metadata_=_metadata(row),
        )
        for row in dataset["transactions"]
        if (row.get("metadata") or {}).get("scenario") == "india_voice_phishing" and row["id"] not in existing_transaction_ids
    )
    existing_filenames = {row.filename for row in session.query(Document).all()}
    session.add_all(
        Document(
            id=row["id"],
            case_id=case.id,
            filename=row["filename"],
            original_filename=row["filename"],
            document_type=row["document_type"],
            data_category=row.get("data_category", "OTHER"),
            source_description=row.get("source_description"),
            uploaded_by_investigator_id="INV-1042",
            text=row["text"],
            processing_status=row["processing_status"],
            checksum_sha256=f"synthetic-{row['id']:056d}"[-64:],
            metadata_=_metadata(row),
        )
        for row in dataset["documents"]
        if row["case_id"] == 13 and row["filename"] not in existing_filenames
    )
    existing_evidence_ids = {row.id for row in session.query(Evidence.id).all()}
    session.add_all(
        Evidence(
            id=row["id"],
            case_id=case.id,
            document_id=row["document_id"],
            evidence_type=row["evidence_type"],
            source_reference=row["source_reference"],
            content=row["content"],
            confidence=row["confidence"],
            metadata_=_metadata(row),
        )
        for row in dataset["evidence"]
        if row["case_id"] == 13 and row["id"] not in existing_evidence_ids
    )
    existing_alert_ids = {row.id for row in session.query(Alert.id).all()}
    session.add_all(
        Alert(id=row["id"], case_id=case.id, entity_id=row["entity_id"], alert_type=row["alert_type"], severity=row["severity"], score=row["score"], explanation=row["explanation"], status=row["status"], metadata_=_metadata(row))
        for row in dataset["alerts"]
        if row["case_id"] == 13 and row["id"] not in existing_alert_ids
    )
    session.add_all(CaseEntity(case_id=case.id, entity_type="person", entity_id=entity_id) for entity_id in [76, 77, 78, 79, 80, 81, 82])


def seed(reset: bool = False, export_only: bool = False) -> dict[str, int]:
    dataset = generate_dataset()
    export_dataset(dataset)
    if export_only:
        return {**{key: len(value) for key, value in dataset.items()}, "investigators": len(DEMO_INVESTIGATORS)}

    if reset:
        reset_demo_data()
    else:
        Base.metadata.create_all(bind=engine)

    with SessionLocal() as session:
        seed_investigators(session)
        if session.query(Case).filter(Case.case_number == "VEIL-2026-001").one_or_none():
            seed_missing_india_cyber_case(session, dataset)
            backfill_assignment_metadata(session)
            session.commit()
            return {**{key: len(value) for key, value in dataset.items()}, "investigators": len(DEMO_INVESTIGATORS)}

        session.add_all(
            Case(
                case_number=row["case_number"],
                title=row["title"],
                description=row["description"],
                status=row["status"],
                case_type=row.get("case_type", "GENERAL"),
                priority=row.get("priority", "MEDIUM"),
                created_by_investigator_id="INV-0001",
                assigned_investigator_id="INV-1042" if row["id"] in {1, 2} or row["id"] % 2 == 0 else "INV-2031",
                assigned_at=_datetime("2026-09-03T09:00:00+00:00"),
                jurisdiction="Synthetic Demonstration Region",
                sensitivity="SYNTHETIC_DEMO",
            )
            for row in dataset["cases"]
        )
        session.flush()
        cases = {case.case_number: case.id for case in session.query(Case).all()}

        session.add_all(
            Person(
                name=row["name"],
                aliases=row["aliases"],
                phone=row["phone"],
                email=row["email"],
                date_of_birth=_date(row["date_of_birth"]),
                address=row["address"],
                metadata_=_metadata(row),
            )
            for row in dataset["persons"]
        )
        session.add_all(
            Organization(name=row["name"], organization_type=row["organization_type"], metadata_=_metadata(row))
            for row in dataset["organizations"]
        )
        session.add_all(Phone(number=row["number"], carrier=row["carrier"], metadata_=_metadata(row)) for row in dataset["phones"])
        session.add_all(
            BankAccount(account_number_masked=row["account_number_masked"], bank_name=row["bank_name"], metadata_=_metadata(row))
            for row in dataset["bank_accounts"]
        )
        session.add_all(
            Location(
                name=row["name"],
                latitude=_decimal(row["latitude"]),
                longitude=_decimal(row["longitude"]),
                address=row["address"],
                metadata_=_metadata(row),
            )
            for row in dataset["locations"]
        )
        session.add_all(
            Vehicle(registration_number=row["registration_number"], vehicle_type=row["vehicle_type"], metadata_=_metadata(row))
            for row in dataset["vehicles"]
        )
        session.add_all(
            Transaction(
                sender_entity_id=row["sender_entity_id"],
                receiver_entity_id=row["receiver_entity_id"],
                amount=_decimal(row["amount"]),
                transaction_type=row["transaction_type"],
                timestamp=_datetime(row["timestamp"]),
                metadata_=_metadata(row),
            )
            for row in dataset["transactions"]
        )
        session.add_all(
            Communication(
                caller_entity_id=row["caller_entity_id"],
                receiver_entity_id=row["receiver_entity_id"],
                timestamp=_datetime(row["timestamp"]),
                duration_seconds=row["duration_seconds"],
                communication_type=row["communication_type"],
                metadata_=_metadata(row),
            )
            for row in dataset["communications"]
        )
        session.flush()

        session.add_all(
            Document(
                case_id=cases[dataset["cases"][row["case_id"] - 1]["case_number"]],
                filename=row["filename"],
                original_filename=row["filename"],
                document_type=row["document_type"],
                data_category=row.get("data_category", "OTHER"),
                source_description=row.get("source_description"),
                uploaded_by_investigator_id="INV-1042",
                text=row["text"],
                processing_status=row["processing_status"],
                checksum_sha256=f"synthetic-{row['id']:056d}"[-64:],
                metadata_=_metadata(row),
            )
            for row in dataset["documents"]
        )
        session.flush()
        documents = {doc.filename: doc.id for doc in session.query(Document).all()}
        document_filename_by_dataset_id = {row["id"]: row["filename"] for row in dataset["documents"]}

        session.add_all(
            Evidence(
                case_id=cases[dataset["cases"][row["case_id"] - 1]["case_number"]],
                document_id=documents[document_filename_by_dataset_id[row["document_id"]]],
                evidence_type=row["evidence_type"],
                source_reference=row["source_reference"],
                content=row["content"],
                confidence=row["confidence"],
                metadata_=_metadata(row),
            )
            for row in dataset["evidence"]
        )
        session.add_all(
            Alert(
                case_id=cases[dataset["cases"][row["case_id"] - 1]["case_number"]],
                entity_id=row["entity_id"],
                alert_type=row["alert_type"],
                severity=row["severity"],
                score=row["score"],
                explanation=row["explanation"],
                status=row["status"],
                metadata_=_metadata(row),
            )
            for row in dataset["alerts"]
        )
        project_eclipse_id = cases["VEIL-2026-001"]
        session.add_all(
            CaseEntity(case_id=project_eclipse_id, entity_type="person", entity_id=entity_id)
            for entity_id in [1, 2, 3, 4, 5, 14, 15, 23, 24, 25, 31, 32, 45, 74]
        )
        cyber_scam_id = cases.get("CYBER-2026-009")
        if cyber_scam_id:
            session.add_all(
                CaseEntity(case_id=cyber_scam_id, entity_type="person", entity_id=entity_id)
                for entity_id in [76, 77, 78, 79, 80, 81, 82]
            )
        backfill_assignment_metadata(session)
        session.commit()

    return {**{key: len(value) for key, value in dataset.items()}, "investigators": len(DEMO_INVESTIGATORS)}


def sync_graph(reset: bool = False) -> tuple[int, int, int]:
    from app.graph.sync import GraphSyncService

    with SessionLocal() as session:
        result = GraphSyncService(session).sync_all(reset=reset)
        return result.nodes_created, result.relationships_created, result.cases_represented


def print_summary(counts: dict[str, int]) -> None:
    labels = [
        ("Cases", "cases"),
        ("Persons", "persons"),
        ("Phones", "phones"),
        ("Accounts", "bank_accounts"),
        ("Locations", "locations"),
        ("Transactions", "transactions"),
        ("Communications", "communications"),
        ("Documents", "documents"),
        ("Evidence", "evidence"),
        ("Alerts", "alerts"),
        ("Investigators", "investigators"),
    ]
    print("VEIL Demo Seed")
    print("----------------")
    for label, key in labels:
        print(f"{label}: {counts[key]}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed deterministic VEIL demo data.")
    parser.add_argument("--reset", action="store_true", help="Drop and recreate tables before seeding.")
    parser.add_argument("--export-only", action="store_true", help="Only write data/synthetic/demo_dataset.json.")
    parser.add_argument("--sync-graph", action="store_true", help="Synchronize seeded relational data into Neo4j.")
    args = parser.parse_args()
    counts = seed(reset=args.reset, export_only=args.export_only)
    print_summary(counts)
    if args.sync_graph and not args.export_only:
        nodes, relationships, cases = sync_graph(reset=args.reset)
        print("")
        print("VEIL Graph Seed")
        print("----------------")
        print(f"Nodes created: {nodes}")
        print(f"Relationships created: {relationships}")
        print(f"Cases represented: {cases}")


if __name__ == "__main__":
    main()
