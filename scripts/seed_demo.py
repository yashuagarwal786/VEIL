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

from app.db.session import Base, SessionLocal, engine
from app.models.alert import Alert
from app.models.bank_account import BankAccount
from app.models.case import Case
from app.models.communication import Communication
from app.models.document import Document
from app.models.entity import CaseEntity
from app.models.evidence import Evidence
from app.models.location import Location
from app.models.organization import Organization
from app.models.person import Person
from app.models.phone import Phone
from app.models.transaction import Transaction
from app.models.vehicle import Vehicle
from scripts.synthetic_data import generate_dataset

SYNTHETIC_DIR = ROOT / "data" / "synthetic"
DATASET_PATH = SYNTHETIC_DIR / "demo_dataset.json"


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


def seed(reset: bool = False, export_only: bool = False) -> dict[str, int]:
    dataset = generate_dataset()
    export_dataset(dataset)
    if export_only:
        return {key: len(value) for key, value in dataset.items()}

    if reset:
        reset_demo_data()

    with SessionLocal() as session:
        if session.query(Case).filter(Case.case_number == "VEIL-2026-001").one_or_none():
            return {key: len(value) for key, value in dataset.items()}

        session.add_all(
            Case(
                case_number=row["case_number"],
                title=row["title"],
                description=row["description"],
                status=row["status"],
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
                document_type=row["document_type"],
                text=row["text"],
                processing_status=row["processing_status"],
                metadata_=_metadata(row),
            )
            for row in dataset["documents"]
        )
        session.flush()
        documents = {doc.filename: doc.id for doc in session.query(Document).all()}

        session.add_all(
            Evidence(
                case_id=cases[dataset["cases"][row["case_id"] - 1]["case_number"]],
                document_id=documents[f"synthetic_source_{row['document_id']:02d}.txt"],
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
        session.commit()

    return {key: len(value) for key, value in dataset.items()}


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
