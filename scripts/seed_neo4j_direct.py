from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any

from neo4j import GraphDatabase, Driver

ROOT = Path(__file__).resolve().parents[1]
DATASET_PATH = ROOT / "data" / "synthetic" / "demo_dataset.json"

PREFIX_MAP = {
    "Person": "P",
    "Organization": "ORG",
    "Phone": "PH",
    "BankAccount": "BA",
    "Vehicle": "VEH",
    "Location": "LOC",
    "Case": "C",
    "Document": "DOC",
}


def graph_id(label: str, source_id: int | str) -> str:
    prefix = PREFIX_MAP[label]
    return f"{prefix}{int(source_id):03d}"


def normalize_name(value: str) -> str:
    return " ".join(value.lower().strip().split())


def create_constraints(driver: Driver) -> None:
    print("Creating constraints and indexes...")
    labels = ["Person", "Organization", "Phone", "BankAccount", "Vehicle", "Location", "Case", "Document"]
    with driver.session() as session:
        for label in labels:
            session.run(f"CREATE CONSTRAINT {label.lower()}_id IF NOT EXISTS FOR (n:{label}) REQUIRE n.id IS UNIQUE")
        session.run("CREATE INDEX person_label IF NOT EXISTS FOR (n:Person) ON (n.label)")
        session.run("CREATE INDEX person_norm_name IF NOT EXISTS FOR (n:Person) ON (n.normalized_name)")
        session.run("CREATE INDEX case_number IF NOT EXISTS FOR (n:Case) ON (n.case_number)")
    print("Constraints and indexes verified.")


def clear_graph(driver: Driver) -> None:
    print("Clearing existing Neo4j graph...")
    with driver.session() as session:
        session.run("MATCH (n) DETACH DELETE n")
    print("Graph cleared.")


def seed_graph(driver: Driver, dataset: dict[str, list[dict[str, Any]]]) -> dict[str, int]:
    create_constraints(driver)

    node_count = 0
    rel_count = 0

    with driver.session() as session:
        print("Seeding Case nodes...")
        for case in dataset.get("cases", []):
            cid = graph_id("Case", case["id"])
            session.run(
                """
                MERGE (n:Case {id: $id})
                SET n += {
                    source_id: $source_id,
                    case_number: $case_number,
                    title: $title,
                    label: $label,
                    description: $description,
                    status: $status,
                    case_type: $case_type,
                    priority: $priority
                }
                """,
                {
                    "id": cid,
                    "source_id": case["id"],
                    "case_number": case["case_number"],
                    "title": case["title"],
                    "label": case["case_number"],
                    "description": case.get("description", ""),
                    "status": case.get("status", "ACTIVE"),
                    "case_type": case.get("case_type", "GENERAL"),
                    "priority": case.get("priority", "MEDIUM"),
                },
            )
            node_count += 1

        print("Seeding Person nodes...")
        case_ids_by_person: dict[int, list[str]] = {
            1: ["C001"], 2: ["C001"], 3: ["C001"], 4: ["C001"], 5: ["C001"],
            14: ["C001"], 15: ["C001"], 23: ["C001"], 24: ["C001"], 25: ["C001"],
            31: ["C001"], 32: ["C001"], 45: ["C001"], 74: ["C001"],
            76: ["C002"], 77: ["C002"], 78: ["C002"], 79: ["C002"],
            80: ["C002"], 81: ["C002"], 82: ["C002"],
        }

        for person in dataset.get("persons", []):
            pid = graph_id("Person", person["id"])
            c_ids = case_ids_by_person.get(person["id"], [])
            session.run(
                """
                MERGE (n:Person {id: $id})
                SET n += {
                    source_id: $source_id,
                    name: $name,
                    label: $label,
                    normalized_name: $normalized_name,
                    aliases: $aliases,
                    case_ids: $case_ids
                }
                """,
                {
                    "id": pid,
                    "source_id": person["id"],
                    "name": person["name"],
                    "label": person["name"],
                    "normalized_name": normalize_name(person["name"]),
                    "aliases": person.get("aliases") or [],
                    "case_ids": c_ids,
                },
            )
            node_count += 1

            for cid in c_ids:
                session.run(
                    """
                    MATCH (p:Person {id: $pid}), (c:Case {id: $cid})
                    MERGE (p)-[r:LINKED_TO_CASE {id: $rel_id}]->(c)
                    SET r.confidence = 1.0
                    """,
                    {"pid": pid, "cid": cid, "rel_id": f"CASE_ENTITY_{cid}_person_{pid}"},
                )
                rel_count += 1

        print("Seeding Organizations...")
        for org in dataset.get("organizations", []):
            oid = graph_id("Organization", org["id"])
            session.run(
                """
                MERGE (n:Organization {id: $id})
                SET n += {
                    source_id: $source_id,
                    name: $name,
                    label: $label,
                    organization_type: $org_type
                }
                """,
                {
                    "id": oid,
                    "source_id": org["id"],
                    "name": org["name"],
                    "label": org["name"],
                    "org_type": org.get("organization_type", "COMMERCIAL"),
                },
            )
            node_count += 1

        print("Seeding Phones...")
        people_by_phone = {p["phone"]: p["id"] for p in dataset.get("persons", []) if p.get("phone")}
        for phone in dataset.get("phones", []):
            phid = graph_id("Phone", phone["id"])
            session.run(
                """
                MERGE (n:Phone {id: $id})
                SET n += {
                    source_id: $source_id,
                    number: $number,
                    label: $label
                }
                """,
                {
                    "id": phid,
                    "source_id": phone["id"],
                    "number": phone["number"],
                    "label": phone["number"],
                },
            )
            node_count += 1

            meta = phone.get("metadata") or {}
            owner_id = meta.get("owner_person_id") or people_by_phone.get(phone["number"])
            if owner_id:
                pid = graph_id("Person", owner_id)
                session.run(
                    """
                    MATCH (p:Person {id: $pid}), (ph:Phone {id: $phid})
                    MERGE (p)-[r:HAS_PHONE {id: $rel_id}]->(ph)
                    SET r += {
                        source_id: $source_id,
                        confidence: 0.96,
                        scenario: $scenario
                    }
                    """,
                    {
                        "pid": pid,
                        "phid": phid,
                        "rel_id": f"PERSON_PHONE_{owner_id}_{phone['id']}",
                        "source_id": f"PHONE_{phone['id']}",
                        "scenario": meta.get("scenario"),
                    },
                )
                rel_count += 1

        print("Seeding Bank Accounts...")
        for acc in dataset.get("bank_accounts", []):
            baid = graph_id("BankAccount", acc["id"])
            session.run(
                """
                MERGE (n:BankAccount {id: $id})
                SET n += {
                    source_id: $source_id,
                    account_number_masked: $masked,
                    bank_name: $bank_name,
                    label: $label
                }
                """,
                {
                    "id": baid,
                    "source_id": acc["id"],
                    "masked": acc["account_number_masked"],
                    "bank_name": acc["bank_name"],
                    "label": acc["account_number_masked"],
                },
            )
            node_count += 1

            meta = acc.get("metadata") or {}
            owner_id = meta.get("owner_person_id")
            if owner_id:
                pid = graph_id("Person", owner_id)
                session.run(
                    """
                    MATCH (p:Person {id: $pid}), (ba:BankAccount {id: $baid})
                    MERGE (p)-[r:OWNS_ACCOUNT {id: $rel_id}]->(ba)
                    SET r += {
                        source_id: $source_id,
                        confidence: 0.92,
                        account_role: $role,
                        scenario: $scenario
                    }
                    """,
                    {
                        "pid": pid,
                        "baid": baid,
                        "rel_id": f"PERSON_ACCOUNT_{owner_id}_{acc['id']}",
                        "source_id": f"BANK_ACCOUNT_{acc['id']}",
                        "role": meta.get("account_role"),
                        "scenario": meta.get("scenario"),
                    },
                )
                rel_count += 1

        print("Seeding Locations...")
        for loc in dataset.get("locations", []):
            lid = graph_id("Location", loc["id"])
            session.run(
                """
                MERGE (n:Location {id: $id})
                SET n += {
                    source_id: $source_id,
                    name: $name,
                    label: $label,
                    latitude: $latitude,
                    longitude: $longitude
                }
                """,
                {
                    "id": lid,
                    "source_id": loc["id"],
                    "name": loc["name"],
                    "label": loc["name"],
                    "latitude": float(loc["latitude"]) if loc.get("latitude") is not None else None,
                    "longitude": float(loc["longitude"]) if loc.get("longitude") is not None else None,
                },
            )
            node_count += 1

        print("Seeding Vehicles...")
        for veh in dataset.get("vehicles", []):
            vid = graph_id("Vehicle", veh["id"])
            session.run(
                """
                MERGE (n:Vehicle {id: $id})
                SET n += {
                    source_id: $source_id,
                    registration_number: $reg,
                    vehicle_type: $type,
                    label: $label
                }
                """,
                {
                    "id": vid,
                    "source_id": veh["id"],
                    "reg": veh["registration_number"],
                    "type": veh.get("vehicle_type", "CAR"),
                    "label": veh["registration_number"],
                },
            )
            node_count += 1

        print("Seeding Documents...")
        for doc in dataset.get("documents", []):
            docid = graph_id("Document", doc["id"])
            session.run(
                """
                MERGE (n:Document {id: $id})
                SET n += {
                    source_id: $source_id,
                    filename: $filename,
                    document_type: $doc_type,
                    label: $label
                }
                """,
                {
                    "id": docid,
                    "source_id": doc["id"],
                    "filename": doc["filename"],
                    "doc_type": doc.get("document_type", "REPORT"),
                    "label": doc["filename"],
                },
            )
            node_count += 1

            cid = graph_id("Case", doc["case_id"])
            session.run(
                """
                MATCH (d:Document {id: $docid}), (c:Case {id: $cid})
                MERGE (d)-[r:LINKED_TO_CASE {id: $rel_id}]->(c)
                SET r += {
                    source_id: $source_id,
                    source_document_id: $docid,
                    confidence: 1.0
                }
                """,
                {
                    "docid": docid,
                    "cid": cid,
                    "rel_id": f"DOC_CASE_{doc['id']}_{doc['case_id']}",
                    "source_id": f"DOC_{doc['id']}",
                },
            )
            rel_count += 1

        print("Seeding Communications...")
        for comm in dataset.get("communications", []):
            p1 = graph_id("Person", comm["caller_entity_id"])
            p2 = graph_id("Person", comm["receiver_entity_id"])
            rel_type = "CALLS" if comm.get("communication_type") == "CALL" else "COMMUNICATED_WITH"
            rel_id = f"COMM_{comm['id']:03d}"
            session.run(
                f"""
                MATCH (a:Person {{id: $p1}}), (b:Person {{id: $p2}})
                MERGE (a)-[r:{rel_type} {{id: $rel_id}}]->(b)
                SET r += {{
                    id: $rel_id,
                    source_id: $rel_id,
                    communication_id: $comm_id,
                    communication_type: $comm_type,
                    timestamp: $timestamp,
                    duration_seconds: $duration,
                    confidence: 0.97
                }}
                """,
                {
                    "p1": p1,
                    "p2": p2,
                    "rel_id": rel_id,
                    "comm_id": comm["id"],
                    "comm_type": comm.get("communication_type", "CALL"),
                    "timestamp": comm.get("timestamp"),
                    "duration": comm.get("duration_seconds", 0),
                },
            )
            rel_count += 1

        print("Seeding Transactions...")
        for tx in dataset.get("transactions", []):
            p1 = graph_id("Person", tx["sender_entity_id"])
            p2 = graph_id("Person", tx["receiver_entity_id"])
            rel_id = f"TX_{tx['id']:03d}"
            meta = tx.get("metadata") or {}
            session.run(
                """
                MATCH (a:Person {id: $p1}), (b:Person {id: $p2})
                MERGE (a)-[r:TRANSFERRED_TO {id: $rel_id}]->(b)
                SET r += {
                    id: $rel_id,
                    source_id: $rel_id,
                    transaction_id: $tx_id,
                    amount: $amount,
                    transaction_type: $tx_type,
                    timestamp: $timestamp,
                    confidence: 0.95,
                    unusual: $unusual
                }
                """,
                {
                    "p1": p1,
                    "p2": p2,
                    "rel_id": rel_id,
                    "tx_id": tx["id"],
                    "amount": float(tx["amount"]),
                    "tx_type": tx.get("transaction_type", "WIRE"),
                    "timestamp": tx.get("timestamp"),
                    "unusual": bool(meta.get("unusual")),
                },
            )
            rel_count += 1

            loc_id = meta.get("location_id")
            if loc_id:
                lid = graph_id("Location", int(loc_id))
                loc_rel_id = f"TX_LOCATION_{tx['id']:03d}"
                session.run(
                    """
                    MATCH (p:Person {id: $p1}), (loc:Location {id: $lid})
                    MERGE (p)-[r:OBSERVED_AT {id: $loc_rel_id}]->(loc)
                    SET r += {
                        id: $loc_rel_id,
                        source_id: $rel_id,
                        transaction_id: $tx_id,
                        amount: $amount,
                        timestamp: $timestamp,
                        confidence: 0.88,
                        scenario: $scenario
                    }
                    """,
                    {
                        "p1": p1,
                        "lid": lid,
                        "loc_rel_id": loc_rel_id,
                        "rel_id": rel_id,
                        "tx_id": tx["id"],
                        "amount": float(tx["amount"]),
                        "timestamp": tx.get("timestamp"),
                        "scenario": meta.get("scenario"),
                    },
                )
                rel_count += 1

        print("Seeding Evidence links...")
        for ev in dataset.get("evidence", []):
            if not ev.get("document_id") or not ev.get("case_id"):
                continue
            docid = graph_id("Document", ev["document_id"])
            cid = graph_id("Case", ev["case_id"])
            rel_id = f"EVIDENCE_{ev['id']:03d}"
            session.run(
                """
                MATCH (d:Document {id: $docid}), (c:Case {id: $cid})
                MERGE (d)-[r:MENTIONED_IN {id: $rel_id}]->(c)
                SET r += {
                    id: $rel_id,
                    source_id: $rel_id,
                    source_document_id: $docid,
                    evidence_id: $ev_id,
                    evidence_type: $ev_type,
                    confidence: $confidence,
                    source_reference: $ref
                }
                """,
                {
                    "docid": docid,
                    "cid": cid,
                    "rel_id": rel_id,
                    "ev_id": ev["id"],
                    "ev_type": ev.get("evidence_type", "DOCUMENTARY"),
                    "confidence": float(ev.get("confidence", 0.9)),
                    "ref": ev.get("source_reference", ""),
                },
            )
            rel_count += 1

    return {"nodes": node_count, "relationships": rel_count}


def verify_graph(driver: Driver) -> None:
    print("\n--- Neo4j Graph Verification ---")
    with driver.session() as session:
        node_counts = session.run("MATCH (n) RETURN labels(n)[0] AS label, count(n) AS cnt ORDER BY cnt DESC").data()
        rel_counts = session.run("MATCH ()-[r]->() RETURN type(r) AS rel, count(r) AS cnt ORDER BY cnt DESC").data()

        total_nodes = sum(r["cnt"] for r in node_counts)
        total_rels = sum(r["cnt"] for r in rel_counts)

        print(f"Total Nodes: {total_nodes}")
        for r in node_counts:
            print(f"  - {r['label']}: {r['cnt']}")

        print(f"Total Relationships: {total_rels}")
        for r in rel_counts:
            print(f"  - {r['rel']}: {r['cnt']}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Directly seed VEIL demo graph data into Neo4j.")
    parser.add_argument("--uri", default=os.getenv("NEO4J_URI", "bolt://localhost:7687"), help="Neo4j connection URI")
    parser.add_argument("--user", default=os.getenv("NEO4J_USER", "neo4j"), help="Neo4j username")
    parser.add_argument("--password", default=os.getenv("NEO4J_PASSWORD", "change_me"), help="Neo4j password")
    parser.add_argument("--reset", action="store_true", help="Clear Neo4j graph before seeding")
    args = parser.parse_args()

    print("========================================")
    print("VEIL Direct Neo4j Seeder")
    print("========================================")
    print(f"Connecting to Neo4j URI: {args.uri}")
    print(f"User: {args.user}")

    if args.password == "change_me":
        print("\n[WARNING] Default password 'change_me' detected. If connecting to a cloud/AuraDB instance, provide --password or set NEO4J_PASSWORD.")

    try:
        driver = GraphDatabase.driver(args.uri, auth=(args.user, args.password))
        driver.verify_connectivity()
        print("[SUCCESS] Successfully connected to Neo4j database!")
    except Exception as e:
        print(f"\n[ERROR] Could not connect to Neo4j: {e}")
        sys.exit(1)

    if not DATASET_PATH.exists():
        print(f"[ERROR] Dataset file not found: {DATASET_PATH}")
        sys.exit(1)

    with open(DATASET_PATH, "r", encoding="utf-8") as f:
        dataset = json.load(f)

    if args.reset:
        clear_graph(driver)

    stats = seed_graph(driver, dataset)
    print(f"\n[SUCCESS] Seeding complete! Processed {stats['nodes']} nodes and {stats['relationships']} relationships.")

    verify_graph(driver)
    driver.close()


if __name__ == "__main__":
    main()
