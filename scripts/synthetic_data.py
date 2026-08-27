from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

SEED = 20260827


def _iso(dt: datetime) -> str:
    return dt.replace(microsecond=0).isoformat()


def generate_dataset() -> dict[str, list[dict[str, Any]]]:
    rng = random.Random(SEED)
    base = datetime(2026, 1, 15, 9, 0, tzinfo=timezone.utc)
    first_names = [
        "Avery",
        "Blair",
        "Casey",
        "Devon",
        "Ellis",
        "Finley",
        "Gray",
        "Harper",
        "Indigo",
        "Jules",
        "Kai",
        "Logan",
        "Marlow",
        "Nico",
        "Oakley",
    ]
    last_names = ["Vale", "Cross", "Stone", "Reed", "Lane", "Frost", "Quill", "Hart", "North", "Pike"]
    carriers = ["Northstar Mobile", "Civic Wireless", "MetroCell", "Blueband"]
    banks = ["Union Demonstration Bank", "Harbor Test Credit", "Civic Sample Bank", "Atlas Sandbox Finance"]

    phones = [
        {
            "id": i,
            "number": f"+1-555-01{i:03d}",
            "carrier": carriers[i % len(carriers)],
            "metadata": {"synthetic": True},
        }
        for i in range(1, 26)
    ]

    persons = []
    for i in range(1, 76):
        name = f"{first_names[i % len(first_names)]} {last_names[i % len(last_names)]} {i:02d}"
        network = "A" if i <= 22 else "B" if i <= 44 else "C" if i <= 60 else "control"
        persons.append(
            {
                "id": i,
                "name": name,
                "aliases": [f"{first_names[i % len(first_names)]}-{i}", f"Node-{network}-{i}"] if i % 9 == 0 else [],
                "phone": phones[(i - 1) % len(phones)]["number"] if i <= 50 else None,
                "email": f"synthetic.person{i:02d}@example.test",
                "date_of_birth": f"19{70 + (i % 25):02d}-{(i % 12) + 1:02d}-{(i % 27) + 1:02d}",
                "address": f"{100 + i} Demo Street, Sample City",
                "metadata": {"synthetic": True, "network": network},
            }
        )

    organizations = [
        {"id": i, "name": f"Demo Organization {i:02d}", "organization_type": rng.choice(["logistics", "retail", "consulting"]), "metadata": {"synthetic": True}}
        for i in range(1, 9)
    ]
    bank_accounts = [
        {
            "id": i,
            "account_number_masked": f"****-****-{7000 + i}",
            "bank_name": banks[i % len(banks)],
            "metadata": {"synthetic": True, "owner_person_id": ((i * 3) % 75) + 1},
        }
        for i in range(1, 21)
    ]
    locations = [
        {
            "id": i,
            "name": f"Demo Location {i:02d}",
            "latitude": str(Decimal("39.000000") + Decimal(i) / Decimal("1000")),
            "longitude": str(Decimal("-77.000000") - Decimal(i) / Decimal("1000")),
            "address": f"{200 + i} Synthetic Avenue, Example District",
            "metadata": {"synthetic": True, "repeated_meeting_site": i in {3, 7, 14}},
        }
        for i in range(1, 26)
    ]
    locations[-1].update({"name": "Demo Location 25 - Remote Activity", "latitude": "40.712800", "longitude": "-74.006000"})
    vehicles = [
        {
            "id": i,
            "registration_number": f"SYN-{2026}-{i:03d}",
            "vehicle_type": rng.choice(["sedan", "van", "truck", "motorcycle"]),
            "metadata": {"synthetic": True, "network": "A" if i <= 6 else "B" if i <= 12 else "control"},
        }
        for i in range(1, 19)
    ]

    chain_a = list(range(1, 12))
    chain_b = list(range(23, 34))
    bridge = 45
    communications = []
    for i in range(1, 221):
        if i <= 90:
            caller, receiver = rng.choice(chain_a), rng.choice(chain_a)
        elif i <= 170:
            caller, receiver = rng.choice(chain_b), rng.choice(chain_b)
        elif i <= 195:
            caller, receiver = bridge, rng.choice(chain_a + chain_b)
        else:
            caller, receiver = rng.randint(1, 75), rng.randint(1, 75)
        if caller == receiver:
            receiver = (receiver % 75) + 1
        communications.append(
            {
                "id": i,
                "caller_entity_id": caller,
                "receiver_entity_id": receiver,
                "timestamp": _iso(base + timedelta(hours=i * 3, minutes=(i % 5) * 7)),
                "duration_seconds": rng.choice([45, 90, 120, 240, 480, 720]),
                "communication_type": rng.choice(["CALL", "SMS", "ENCRYPTED_MESSAGE"]),
                "metadata": {"synthetic": True, "pattern": "bridge" if caller == bridge or receiver == bridge else "community"},
            }
        )
    for index, communication in enumerate(communications[195:215]):
        communication.update({"caller_entity_id": 14, "receiver_entity_id": 45 if index % 2 else 74, "timestamp": _iso(base + timedelta(days=42, hours=(index % 4) + 1)), "duration_seconds": 720, "metadata": {"synthetic": True, "scenario": "P014_communication_spike"}})

    transactions = []
    for i in range(1, 151):
        sender = rng.choice(chain_a if i <= 55 else chain_b if i <= 105 else list(range(1, 76)))
        receiver = bridge if i in {31, 32, 88, 89, 126} else rng.randint(1, 75)
        amount = Decimal(rng.choice(["125.00", "240.50", "780.00", "1500.00", "3400.25"]))
        if i in {31, 88, 126}:
            amount = Decimal("25000.00") + Decimal(i * 100)
        transactions.append(
            {
                "id": i,
                "sender_entity_id": sender,
                "receiver_entity_id": receiver,
                "amount": str(amount),
                "transaction_type": rng.choice(["WIRE", "CASH_DEPOSIT", "MERCHANT_PAYMENT"]),
                "timestamp": _iso(base + timedelta(days=i % 45, hours=i % 24)),
                "metadata": {"synthetic": True, "unusual": amount >= Decimal("25000.00")},
            }
        )
    # P014 has a stable local baseline followed by one deliberately unusual, observable event.
    for index, transaction in enumerate(transactions[:6]):
        transaction.update({"sender_entity_id": 14, "receiver_entity_id": 15 if index < 5 else 74, "amount": str(Decimal("4200.00") + Decimal(index * 200) if index < 5 else Decimal("850000.00")), "timestamp": _iso(base + timedelta(days=index * 3, hours=10 if index < 5 else 2)), "metadata": {"synthetic": True, "location_id": 1 if index < 5 else 25, "scenario": "P014_behavioral_demo"}})

    cases = [
        {
            "id": 1,
            "case_number": "VEIL-2026-001",
            "title": "Project Eclipse",
            "description": "Synthetic investigation with two communities, a bridge entity, repeated contacts, and unusual transfers.",
            "status": "ACTIVE",
        }
    ]
    cases.extend(
        {
            "id": i,
            "case_number": f"VEIL-2026-{i:03d}",
            "title": f"Synthetic Case {i:02d}",
            "description": "Synthetic foundation case for development and testing.",
            "status": rng.choice(["ACTIVE", "CLOSED", "ARCHIVED"]),
        }
        for i in range(2, 13)
    )

    documents = []
    evidence = []
    for i in range(1, 31):
        case_id = 1 if i <= 8 else ((i - 1) % 12) + 1
        documents.append(
            {
                "id": i,
                "case_id": case_id,
                "filename": f"synthetic_source_{i:02d}.txt",
                "document_type": rng.choice(["REPORT", "CALL_LOG", "BANK_SUMMARY", "FIELD_NOTE"]),
                "text": "Synthetic document linking demo entities through communications, locations, or transfers.",
                "processing_status": "COMPLETED",
                "metadata": {"synthetic": True},
            }
        )
        for j in range(2):
            evidence.append(
                {
                    "id": ((i - 1) * 2) + j + 1,
                    "case_id": case_id,
                    "document_id": i,
                    "evidence_type": rng.choice(["COMMUNICATION_PATTERN", "TRANSACTION_PATTERN", "LOCATION_REPEAT"]),
                    "source_reference": f"synthetic_source_{i:02d}:line-{10 + j}",
                    "content": "Synthetic evidence supports a relationship or anomaly for future graph demonstrations.",
                    "confidence": round(rng.uniform(0.62, 0.96), 2),
                    "metadata": {"synthetic": True, "supports_project_eclipse": case_id == 1},
                }
            )

    alerts = [
        {
            "id": 1,
            "case_id": 1,
            "entity_id": bridge,
            "alert_type": "BRIDGE_ENTITY",
            "severity": "HIGH",
            "score": 91.0,
            "explanation": "Synthetic bridge entity links multiple communities in Project Eclipse.",
            "status": "OPEN",
            "metadata": {"synthetic": True},
        },
        {
            "id": 2,
            "case_id": 1,
            "entity_id": 31,
            "alert_type": "UNUSUAL_TRANSACTION",
            "severity": "CRITICAL",
            "score": 94.0,
            "explanation": "Synthetic large transfers exceed the normal demo transaction range.",
            "status": "OPEN",
            "metadata": {"synthetic": True},
        },
    ]

    return {
        "cases": cases,
        "persons": persons,
        "organizations": organizations,
        "phones": phones,
        "bank_accounts": bank_accounts,
        "locations": locations,
        "vehicles": vehicles,
        "communications": communications,
        "transactions": transactions,
        "documents": documents,
        "evidence": evidence,
        "alerts": alerts,
    }
