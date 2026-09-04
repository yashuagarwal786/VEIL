from __future__ import annotations

import logging
from dataclasses import dataclass
from decimal import Decimal
from typing import Any

from sqlalchemy.orm import Session

from app.graph.ids import graph_id
from app.graph.models import GraphNode
from app.graph.repository import GraphRepository
from app.models.alert import Alert
from app.models.bank_account import BankAccount
from app.models.case import Case
from app.models.communication import Communication
from app.models.document import Document
from app.models.entity import CaseEntity
from app.models.evidence import Evidence
from app.models.extraction import ExtractedRelationship
from app.models.location import Location
from app.models.organization import Organization
from app.models.person import Person
from app.models.phone import Phone
from app.models.transaction import Transaction
from app.models.vehicle import Vehicle
from app.nlp.normalizer import normalize_name

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class GraphSyncResult:
    nodes_created: int
    relationships_created: int
    cases_represented: int


def _normalize_name(value: str) -> str:
    return " ".join(value.lower().strip().split())


def _serializable(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value


class GraphSyncService:
    def __init__(self, session: Session, repository: GraphRepository | None = None) -> None:
        self.session = session
        self.repository = repository or GraphRepository()
        self.node_count = 0
        self.relationship_count = 0

    def sync_all(self, reset: bool = False) -> GraphSyncResult:
        logger.info("Starting graph synchronization")
        if reset:
            self.repository.clear_graph()
        self.repository.create_constraints()

        cases = self.session.query(Case).all()
        for case in cases:
            self._sync_case(case)

        self._sync_entities()
        self._sync_case_entities()
        self._sync_identity_assets()
        self._sync_communications()
        self._sync_transactions()
        self._sync_transaction_locations()
        self._sync_evidence_relationships()
        self._sync_extracted_relationships()
        logger.info("Graph synchronization completed")
        return GraphSyncResult(self.node_count, self.relationship_count, len(cases))

    def _node(self, label: str, source_id: int, properties: dict[str, Any]) -> GraphNode:
        return GraphNode(label=label, key=graph_id(label, source_id), properties={"id": graph_id(label, source_id), **properties})

    def _upsert_node(self, node: GraphNode) -> None:
        self.repository.upsert_node(node)
        self.node_count += 1

    def _upsert_relationship(self, start: GraphNode, rel_type: str, end: GraphNode, properties: dict[str, Any]) -> None:
        self.repository.upsert_relationship(start, rel_type, end, properties={key: _serializable(value) for key, value in properties.items()})
        self.relationship_count += 1

    def _sync_case(self, case: Case) -> None:
        self._upsert_node(
            self._node(
                "Case",
                case.id,
                {"source_id": case.id, "case_number": case.case_number, "title": case.title, "label": case.case_number},
            )
        )

    def _sync_entities(self) -> None:
        persons = self.session.query(Person).all()
        case_ids_by_person = self._case_ids_by_entity("person")
        for person in persons:
            self._upsert_node(
                self._node(
                    "Person",
                    person.id,
                    {
                        "source_id": person.id,
                        "name": person.name,
                        "label": person.name,
                        "normalized_name": _normalize_name(person.name),
                        "aliases": person.aliases or [],
                        "case_ids": case_ids_by_person.get(person.id, []),
                    },
                )
            )
        for organization in self.session.query(Organization).all():
            self._upsert_node(self._node("Organization", organization.id, {"source_id": organization.id, "name": organization.name, "label": organization.name, "organization_type": organization.organization_type}))
        for phone in self.session.query(Phone).all():
            self._upsert_node(self._node("Phone", phone.id, {"source_id": phone.id, "number": phone.number, "label": phone.number}))
        for account in self.session.query(BankAccount).all():
            self._upsert_node(self._node("BankAccount", account.id, {"source_id": account.id, "account_number_masked": account.account_number_masked, "bank_name": account.bank_name, "label": account.account_number_masked}))
        for vehicle in self.session.query(Vehicle).all():
            self._upsert_node(self._node("Vehicle", vehicle.id, {"source_id": vehicle.id, "registration_number": vehicle.registration_number, "vehicle_type": vehicle.vehicle_type, "label": vehicle.registration_number}))
        for location in self.session.query(Location).all():
            self._upsert_node(self._node("Location", location.id, {"source_id": location.id, "name": location.name, "label": location.name, "latitude": _serializable(location.latitude), "longitude": _serializable(location.longitude)}))
        for document in self.session.query(Document).all():
            doc_node = self._node("Document", document.id, {"source_id": document.id, "filename": document.filename, "document_type": document.document_type, "label": document.filename})
            case_node = self._node("Case", document.case_id, {})
            self._upsert_node(doc_node)
            self._upsert_relationship(doc_node, "LINKED_TO_CASE", case_node, {"id": f"DOC_CASE_{document.id}_{document.case_id}", "source_id": f"DOC_{document.id}", "source_document_id": graph_id("Document", document.id), "confidence": 1.0})

    def _case_ids_by_entity(self, entity_type: str) -> dict[int, list[str]]:
        values: dict[int, list[str]] = {}
        rows = self.session.query(CaseEntity).filter(CaseEntity.entity_type == entity_type).all()
        for row in rows:
            values.setdefault(row.entity_id, []).append(graph_id("Case", row.case_id))
        return values

    def _sync_case_entities(self) -> None:
        for row in self.session.query(CaseEntity).all():
            label = row.entity_type[:1].upper() + row.entity_type[1:]
            if label == "Person":
                start = self._node("Person", row.entity_id, {})
            else:
                continue
            case = self._node("Case", row.case_id, {})
            self._upsert_relationship(start, "LINKED_TO_CASE", case, {"id": f"CASE_ENTITY_{row.case_id}_{row.entity_type}_{row.entity_id}", "source_id": f"CASE_ENTITY_{row.id}", "confidence": 1.0})

    def _sync_identity_assets(self) -> None:
        people_by_phone = {person.phone: person.id for person in self.session.query(Person).all() if person.phone}
        for phone in self.session.query(Phone).all():
            owner_id = (phone.metadata_ or {}).get("owner_person_id") or people_by_phone.get(phone.number)
            if not owner_id:
                continue
            self._upsert_relationship(
                self._node("Person", int(owner_id), {}),
                "HAS_PHONE",
                self._node("Phone", phone.id, {}),
                {
                    "id": f"PERSON_PHONE_{owner_id}_{phone.id}",
                    "source_id": f"PHONE_{phone.id}",
                    "confidence": 0.96,
                    "scenario": (phone.metadata_ or {}).get("scenario"),
                },
            )
        for account in self.session.query(BankAccount).all():
            owner_id = (account.metadata_ or {}).get("owner_person_id")
            if not owner_id:
                continue
            self._upsert_relationship(
                self._node("Person", int(owner_id), {}),
                "OWNS_ACCOUNT",
                self._node("BankAccount", account.id, {}),
                {
                    "id": f"PERSON_ACCOUNT_{owner_id}_{account.id}",
                    "source_id": f"BANK_ACCOUNT_{account.id}",
                    "confidence": 0.92,
                    "account_role": (account.metadata_ or {}).get("account_role"),
                    "scenario": (account.metadata_ or {}).get("scenario"),
                },
            )

    def _sync_communications(self) -> None:
        for comm in self.session.query(Communication).all():
            start = self._node("Person", comm.caller_entity_id, {})
            end = self._node("Person", comm.receiver_entity_id, {})
            self._upsert_relationship(
                start,
                "CALLS" if comm.communication_type == "CALL" else "COMMUNICATED_WITH",
                end,
                {
                    "id": f"COMM_{comm.id:03d}",
                    "source_id": f"COMM_{comm.id:03d}",
                    "communication_id": comm.id,
                    "communication_type": comm.communication_type,
                    "timestamp": comm.timestamp,
                    "duration_seconds": comm.duration_seconds,
                    "confidence": 0.97,
                },
            )

    def _sync_transaction_locations(self) -> None:
        for tx in self.session.query(Transaction).all():
            location_id = (tx.metadata_ or {}).get("location_id")
            if not location_id:
                continue
            self._upsert_relationship(
                self._node("Person", tx.sender_entity_id, {}),
                "OBSERVED_AT",
                self._node("Location", int(location_id), {}),
                {
                    "id": f"TX_LOCATION_{tx.id:03d}",
                    "source_id": f"TX_{tx.id:03d}",
                    "transaction_id": tx.id,
                    "amount": tx.amount,
                    "timestamp": tx.timestamp,
                    "confidence": 0.88,
                    "scenario": (tx.metadata_ or {}).get("scenario"),
                },
            )

    def _sync_transactions(self) -> None:
        for tx in self.session.query(Transaction).all():
            self._upsert_relationship(
                self._node("Person", tx.sender_entity_id, {}),
                "TRANSFERRED_TO",
                self._node("Person", tx.receiver_entity_id, {}),
                {
                    "id": f"TX_{tx.id:03d}",
                    "source_id": f"TX_{tx.id:03d}",
                    "transaction_id": tx.id,
                    "amount": tx.amount,
                    "transaction_type": tx.transaction_type,
                    "timestamp": tx.timestamp,
                    "confidence": 0.95,
                    "unusual": bool((tx.metadata_ or {}).get("unusual")),
                },
            )

    def _sync_evidence_relationships(self) -> None:
        for evidence in self.session.query(Evidence).all():
            if not evidence.document_id:
                continue
            self._upsert_relationship(
                self._node("Document", evidence.document_id, {}),
                "MENTIONED_IN",
                self._node("Case", evidence.case_id, {}),
                {
                    "id": f"EVIDENCE_{evidence.id:03d}",
                    "source_id": f"EVIDENCE_{evidence.id:03d}",
                    "source_document_id": graph_id("Document", evidence.document_id),
                    "evidence_id": evidence.id,
                    "evidence_type": evidence.evidence_type,
                    "confidence": evidence.confidence,
                    "source_reference": evidence.source_reference,
                },
            )

    def _sync_extracted_relationships(self) -> None:
        people = {normalize_name(person.name): person.id for person in self.session.query(Person).all()}
        for relationship in self.session.query(ExtractedRelationship).all():
            if relationship.review_status.value == "REJECTED":
                continue
            source_id = people.get(normalize_name(relationship.source_entity_text))
            target_id = people.get(normalize_name(relationship.target_entity_text))
            if not source_id or not target_id:
                continue
            self._upsert_relationship(
                self._node("Person", source_id, {}),
                relationship.relationship_type,
                self._node("Person", target_id, {}),
                {
                    "id": relationship.graph_relationship_id or f"DOC_REL_{relationship.id}",
                    "source_id": f"EXTRACTED_REL_{relationship.id}",
                    "source_document_id": graph_id("Document", relationship.document_id),
                    "evidence_id": relationship.evidence_id,
                    "confidence": relationship.confidence,
                    "source_text": relationship.source_text,
                    "source_reference": relationship.source_reference,
                },
            )
