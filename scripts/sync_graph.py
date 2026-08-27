from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = ROOT / "backend"
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(BACKEND_ROOT))

from app.db.session import SessionLocal
from app.graph.sync import GraphSyncService


def main() -> None:
    parser = argparse.ArgumentParser(description="Synchronize VEIL relational data into Neo4j.")
    parser.add_argument("--reset", action="store_true", help="Clear Neo4j graph data before synchronization.")
    args = parser.parse_args()

    with SessionLocal() as session:
        result = GraphSyncService(session).sync_all(reset=args.reset)

    print("VEIL Graph Seed")
    print("----------------")
    print(f"Nodes created: {result.nodes_created}")
    print(f"Relationships created: {result.relationships_created}")
    print(f"Cases represented: {result.cases_represented}")


if __name__ == "__main__":
    main()
