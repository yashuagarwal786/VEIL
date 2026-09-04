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
    india_scam_phones = [
        {"id": 26, "number": "+91-98765-21001", "carrier": "Bharat Mobile TestNet", "metadata": {"synthetic": True, "scenario": "india_voice_phishing", "owner_person_id": 76}},
        {"id": 27, "number": "+91-98765-21002", "carrier": "Bharat Mobile TestNet", "metadata": {"synthetic": True, "scenario": "india_voice_phishing", "owner_person_id": 77}},
        {"id": 28, "number": "+91-98765-21003", "carrier": "Metro India Sandbox", "metadata": {"synthetic": True, "scenario": "india_voice_phishing", "owner_person_id": 78}},
        {"id": 29, "number": "+91-98765-21004", "carrier": "Metro India Sandbox", "metadata": {"synthetic": True, "scenario": "india_voice_phishing", "owner_person_id": 79}},
        {"id": 30, "number": "+91-98765-21005", "carrier": "Civic India Wireless", "metadata": {"synthetic": True, "scenario": "india_voice_phishing", "owner_person_id": 80}},
        {"id": 31, "number": "+91-98765-21006", "carrier": "Civic India Wireless", "metadata": {"synthetic": True, "scenario": "india_voice_phishing", "owner_person_id": 81}},
        {"id": 32, "number": "+91-98765-21007", "carrier": "Bharat Mobile TestNet", "metadata": {"synthetic": True, "scenario": "india_voice_phishing", "owner_person_id": 82}},
    ]
    phones.extend(india_scam_phones)

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
    persons.extend(
        [
            {
                "id": 76,
                "name": "Rohan Malhotra",
                "aliases": ["VoiceDesk-Rohan", "Lead Caller"],
                "phone": "+91-98765-21001",
                "email": "rohan.malhotra@synthetic.veil",
                "date_of_birth": "1991-04-12",
                "address": "Synthetic Call Hub, Gurugram, Haryana",
                "metadata": {"synthetic": True, "network": "india_scam", "role": "call_floor_lead"},
            },
            {
                "id": 77,
                "name": "Kavya Nair",
                "aliases": ["KYC Desk", "Script Handler"],
                "phone": "+91-98765-21002",
                "email": "kavya.nair@synthetic.veil",
                "date_of_birth": "1994-08-23",
                "address": "Synthetic Worksite, Noida, Uttar Pradesh",
                "metadata": {"synthetic": True, "network": "india_scam", "role": "caller"},
            },
            {
                "id": 78,
                "name": "Imran Qureshi",
                "aliases": ["Wallet Bridge", "Account Router"],
                "phone": "+91-98765-21003",
                "email": "imran.qureshi@synthetic.veil",
                "date_of_birth": "1988-02-17",
                "address": "Synthetic Residence, Lucknow, Uttar Pradesh",
                "metadata": {"synthetic": True, "network": "india_scam", "role": "fund_router"},
            },
            {
                "id": 79,
                "name": "Meera Singh",
                "aliases": ["Mule Coordinator"],
                "phone": "+91-98765-21004",
                "email": "meera.singh@synthetic.veil",
                "date_of_birth": "1996-11-05",
                "address": "Synthetic Flat, Jaipur, Rajasthan",
                "metadata": {"synthetic": True, "network": "india_scam", "role": "mule_coordinator"},
            },
            {
                "id": 80,
                "name": "Suresh Pawar",
                "aliases": ["Cashout Point"],
                "phone": "+91-98765-21005",
                "email": "suresh.pawar@synthetic.veil",
                "date_of_birth": "1985-06-19",
                "address": "Synthetic Market Lane, Mumbai, Maharashtra",
                "metadata": {"synthetic": True, "network": "india_scam", "role": "cashout_operator"},
            },
            {
                "id": 81,
                "name": "Asha Verma",
                "aliases": ["Victim A"],
                "phone": "+91-98765-21006",
                "email": "asha.verma@example.test",
                "date_of_birth": "1979-01-30",
                "address": "Synthetic Colony, Pune, Maharashtra",
                "metadata": {"synthetic": True, "network": "india_scam_victim", "role": "victim"},
            },
            {
                "id": 82,
                "name": "Nitin Rao",
                "aliases": ["Victim B"],
                "phone": "+91-98765-21007",
                "email": "nitin.rao@example.test",
                "date_of_birth": "1982-09-14",
                "address": "Synthetic Layout, Bengaluru, Karnataka",
                "metadata": {"synthetic": True, "network": "india_scam_victim", "role": "victim"},
            },
        ]
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
    bank_accounts.extend(
        [
            {"id": 21, "account_number_masked": "****-****-9101", "bank_name": "Bharat Demo Bank", "metadata": {"synthetic": True, "scenario": "india_voice_phishing", "owner_person_id": 78, "account_role": "collection_wallet"}},
            {"id": 22, "account_number_masked": "****-****-9102", "bank_name": "Janata Sandbox Bank", "metadata": {"synthetic": True, "scenario": "india_voice_phishing", "owner_person_id": 79, "account_role": "mule_account"}},
            {"id": 23, "account_number_masked": "****-****-9103", "bank_name": "Metro Cooperative Test Bank", "metadata": {"synthetic": True, "scenario": "india_voice_phishing", "owner_person_id": 80, "account_role": "cashout_account"}},
            {"id": 24, "account_number_masked": "****-****-9201", "bank_name": "Citizen Sample Bank", "metadata": {"synthetic": True, "scenario": "india_voice_phishing", "owner_person_id": 81, "account_role": "victim_account"}},
            {"id": 25, "account_number_masked": "****-****-9202", "bank_name": "South Demo Bank", "metadata": {"synthetic": True, "scenario": "india_voice_phishing", "owner_person_id": 82, "account_role": "victim_account"}},
        ]
    )
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
    locations.extend(
        [
            {"id": 26, "name": "Synthetic Call Hub - Gurugram", "latitude": "28.459500", "longitude": "77.026600", "address": "Gurugram, Haryana, India", "metadata": {"synthetic": True, "scenario": "india_voice_phishing", "site_type": "call_hub"}},
            {"id": 27, "name": "Synthetic Wallet Desk - Noida", "latitude": "28.535500", "longitude": "77.391000", "address": "Noida, Uttar Pradesh, India", "metadata": {"synthetic": True, "scenario": "india_voice_phishing", "site_type": "wallet_desk"}},
            {"id": 28, "name": "Synthetic Cashout Point - Mumbai", "latitude": "19.076000", "longitude": "72.877700", "address": "Mumbai, Maharashtra, India", "metadata": {"synthetic": True, "scenario": "india_voice_phishing", "site_type": "cashout"}},
            {"id": 29, "name": "Synthetic Victim Location - Pune", "latitude": "18.520400", "longitude": "73.856700", "address": "Pune, Maharashtra, India", "metadata": {"synthetic": True, "scenario": "india_voice_phishing", "site_type": "victim_city"}},
            {"id": 30, "name": "Synthetic Victim Location - Bengaluru", "latitude": "12.971600", "longitude": "77.594600", "address": "Bengaluru, Karnataka, India", "metadata": {"synthetic": True, "scenario": "india_voice_phishing", "site_type": "victim_city"}},
        ]
    )
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
    scam_call_pairs = [(76, 81), (77, 81), (76, 82), (77, 82), (76, 78), (78, 79), (79, 80), (77, 78), (76, 79), (78, 80)]
    communications.extend(
        {
            "id": 221 + index,
            "caller_entity_id": caller,
            "receiver_entity_id": receiver,
            "timestamp": _iso(base + timedelta(days=58 + (index // 3), hours=9 + (index % 6), minutes=(index % 4) * 11)),
            "duration_seconds": [95, 180, 420, 760, 1180][index % 5],
            "communication_type": "CALL" if index % 3 != 1 else "SMS",
            "metadata": {"synthetic": True, "scenario": "india_voice_phishing", "call_script": "bank_kyc_update" if receiver in {81, 82} else "internal_coordination"},
        }
        for index, (caller, receiver) in enumerate(scam_call_pairs * 3)
    )

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
    scam_transactions = [
        (81, 78, "78000.00", 29, "victim_to_collection"),
        (82, 78, "124500.00", 30, "victim_to_collection"),
        (78, 79, "95000.00", 27, "collection_to_mule"),
        (79, 80, "88000.00", 28, "mule_to_cashout"),
        (78, 80, "42000.00", 28, "direct_cashout"),
        (81, 79, "36000.00", 29, "second_push_payment"),
    ]
    transactions.extend(
        {
            "id": 151 + index,
            "sender_entity_id": sender,
            "receiver_entity_id": receiver,
            "amount": amount,
            "transaction_type": "UPI_TRANSFER" if index < 2 else "BANK_TRANSFER",
            "timestamp": _iso(base + timedelta(days=59 + index, hours=13 + (index % 4), minutes=17)),
            "metadata": {"synthetic": True, "unusual": True, "location_id": location_id, "scenario": "india_voice_phishing", "stage": stage},
        }
        for index, (sender, receiver, amount, location_id, stage) in enumerate(scam_transactions)
    )

    cases = [
        {
            "id": 1,
            "case_number": "VEIL-2026-001",
            "title": "Project Eclipse",
            "description": "Synthetic investigation with two communities, a bridge entity, repeated contacts, and unusual transfers.",
            "status": "ACTIVE",
            "case_type": "NETWORK_ANALYSIS",
            "priority": "HIGH",
        }
    ]
    cases.append(
        {
            "id": 2,
            "case_number": "CASE-2026-0142",
            "title": "Financial Network Investigation",
            "description": "Synthetic case intake scenario with overlapping FIR, CDR, financial, surveillance, and criminal history sources.",
            "status": "ACTIVE",
            "case_type": "FINANCIAL_FRAUD",
            "priority": "CRITICAL",
        }
    )
    cases.extend(
        {
            "id": i,
            "case_number": f"VEIL-2026-{i:03d}",
            "title": f"Synthetic Case {i:02d}",
            "description": "Synthetic foundation case for development and testing.",
            "status": rng.choice(["ACTIVE", "CLOSED", "ARCHIVED"]),
            "case_type": "GENERAL",
            "priority": rng.choice(["LOW", "MEDIUM", "HIGH"]),
        }
        for i in range(3, 13)
    )
    cases.append(
        {
            "id": 13,
            "case_number": "CYBER-2026-009",
            "title": "India Voice Phishing Call Network",
            "description": "Synthetic cybercrime investigation into callers impersonating bank support teams, targeting people in India, routing funds through mule accounts, and coordinating cash-out activity.",
            "status": "ACTIVE",
            "case_type": "CYBER_FRAUD",
            "priority": "CRITICAL",
        }
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
                "data_category": ["FIR_REPORT", "CDR", "FINANCIAL", "SURVEILLANCE", "CRIMINAL_HISTORY"][i % 5],
                "source_description": "Synthetic source with deterministic provenance for VEIL demo workflows.",
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

    cyber_documents = [
        {
            "id": 31,
            "case_id": 13,
            "filename": "india_voice_phishing_fir.txt",
            "document_type": "FIR",
            "data_category": "FIR_REPORT",
            "source_description": "Synthetic FIR summary describing bank KYC impersonation calls to Indian residents.",
            "text": "Complainants Asha Verma and Nitin Rao reported calls from Rohan Malhotra and Kavya Nair claiming urgent KYC verification. Funds moved to Imran Qureshi and onward to Meera Singh and Suresh Pawar.",
            "processing_status": "COMPLETED",
            "metadata": {"synthetic": True, "scenario": "india_voice_phishing"},
        },
        {
            "id": 32,
            "case_id": 13,
            "filename": "cdr_cluster_india_voice_phishing.txt",
            "document_type": "CALL_LOG",
            "data_category": "CDR",
            "source_description": "Synthetic call-detail cluster connecting caller phones, victims, and fund routers.",
            "text": "Repeated call bursts from +91-98765-21001 and +91-98765-21002 preceded transfers by Asha Verma and Nitin Rao. Internal calls linked Rohan Malhotra, Imran Qureshi, Meera Singh, and Suresh Pawar.",
            "processing_status": "COMPLETED",
            "metadata": {"synthetic": True, "scenario": "india_voice_phishing"},
        },
        {
            "id": 33,
            "case_id": 13,
            "filename": "upi_bank_flow_india_voice_phishing.txt",
            "document_type": "BANK_SUMMARY",
            "data_category": "FINANCIAL",
            "source_description": "Synthetic UPI and bank transfer trail for the voice-phishing scenario.",
            "text": "Victim transfers totaling 238500.00 moved to Imran Qureshi before layered transfers to mule and cashout operators.",
            "processing_status": "COMPLETED",
            "metadata": {"synthetic": True, "scenario": "india_voice_phishing"},
        },
    ]
    documents.extend(cyber_documents)
    evidence.extend(
        [
            {"id": 61, "case_id": 13, "document_id": 31, "evidence_type": "VICTIM_REPORT", "source_reference": "india_voice_phishing_fir:line-4", "content": "Victims described bank KYC impersonation calls followed by payment instructions.", "confidence": 0.94, "metadata": {"synthetic": True, "scenario": "india_voice_phishing"}},
            {"id": 62, "case_id": 13, "document_id": 32, "evidence_type": "COMMUNICATION_PATTERN", "source_reference": "cdr_cluster_india_voice_phishing:line-7", "content": "Call bursts from Rohan Malhotra and Kavya Nair repeatedly preceded victim transfers.", "confidence": 0.91, "metadata": {"synthetic": True, "scenario": "india_voice_phishing"}},
            {"id": 63, "case_id": 13, "document_id": 33, "evidence_type": "TRANSACTION_PATTERN", "source_reference": "upi_bank_flow_india_voice_phishing:line-5", "content": "Funds moved from victims to a collection wallet, then to mule and cash-out operators.", "confidence": 0.93, "metadata": {"synthetic": True, "scenario": "india_voice_phishing"}},
        ]
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
    alerts.extend(
        [
            {
                "id": 3,
                "case_id": 13,
                "entity_id": 78,
                "alert_type": "FUND_ROUTER",
                "severity": "CRITICAL",
                "score": 96.0,
                "explanation": "Imran Qureshi receives victim transfers and forwards funds to mule and cash-out operators.",
                "status": "OPEN",
                "metadata": {"synthetic": True, "scenario": "india_voice_phishing"},
            },
            {
                "id": 4,
                "case_id": 13,
                "entity_id": 76,
                "alert_type": "CALL_SPIKE_BEFORE_TRANSFER",
                "severity": "HIGH",
                "score": 89.0,
                "explanation": "Rohan Malhotra places repeated KYC-script calls shortly before reported victim payment activity.",
                "status": "OPEN",
                "metadata": {"synthetic": True, "scenario": "india_voice_phishing"},
            },
        ]
    )

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
