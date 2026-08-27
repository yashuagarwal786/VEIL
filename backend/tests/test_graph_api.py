from fastapi.testclient import TestClient

from app.graph.models import GraphRecordEdge, GraphRecordNode
from app.main import app


class FakeGraphService:
    def get_entity(self, entity_id: str):
        if entity_id == "missing":
            return None
        return {
            "id": entity_id,
            "type": "Person",
            "label": "Demo Entity",
            "properties": {"id": entity_id},
            "case_ids": ["C001"],
            "relationship_count": 2,
        }

    def get_neighbors(self, entity_id: str, depth: int, relationship_type: str | None, limit: int):
        return (
            [GraphRecordNode(id=entity_id, type="Person", label="A"), GraphRecordNode(id="B", type="Person", label="B")],
            [GraphRecordEdge(id="AB", source=entity_id, target="B", type="KNOWS")],
        )

    def get_case_graph(self, case_id: str, entity_type: str | None, relationship_type: str | None, depth: int, limit: int):
        return (
            [GraphRecordNode(id="C001", type="Case", label="VEIL-2026-001"), GraphRecordNode(id="P001", type="Person", label="A")],
            [GraphRecordEdge(id="CASE_ENTITY", source="P001", target="C001", type="LINKED_TO_CASE")],
        )

    def find_shortest_path(self, source_id: str, target_id: str, max_depth: int):
        return (
            [GraphRecordNode(id=source_id, type="Person", label="A"), GraphRecordNode(id=target_id, type="Person", label="B")],
            [GraphRecordEdge(id="AB", source=source_id, target=target_id, type="KNOWS")],
        )

    def search(self, query: str, entity_type: str | None, case_id: str | None, limit: int):
        return [GraphRecordNode(id="P001", type="Person", label="Demo Entity")]

    def get_relationship_evidence(self, relationship_id: str):
        return {
            "relationship": {"id": relationship_id, "source": "A", "target": "B", "type": "KNOWS", "properties": {"confidence": 0.9}},
            "evidence_sources": [{"source_id": "EVIDENCE_001"}],
            "source_documents": [],
            "confidence": 0.9,
            "timestamps": [],
        }


def test_graph_api_routes(monkeypatch) -> None:
    monkeypatch.setattr("app.api.graph.GraphService", lambda: FakeGraphService())
    client = TestClient(app)

    assert client.get("/api/graph/entities/P001").status_code == 200
    assert client.get("/api/graph/entities/P001/neighbors?depth=2").json()["edges"][0]["type"] == "KNOWS"
    assert client.get("/api/graph/cases/C001").json()["nodes"][0]["type"] == "Case"
    assert client.get("/api/graph/search?query=demo").json()[0]["id"] == "P001"
    assert client.get("/api/graph/relationships/AB/evidence").json()["confidence"] == 0.9


def test_entity_not_found(monkeypatch) -> None:
    monkeypatch.setattr("app.api.graph.GraphService", lambda: FakeGraphService())
    client = TestClient(app)

    response = client.get("/api/graph/entities/missing")

    assert response.status_code == 404


def test_shortest_path_rejects_same_source_target(monkeypatch) -> None:
    monkeypatch.setattr("app.api.graph.GraphService", lambda: FakeGraphService())
    client = TestClient(app)

    response = client.get("/api/graph/path?source_id=P001&target_id=P001")

    assert response.status_code == 400
