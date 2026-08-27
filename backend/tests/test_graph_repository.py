import pytest

from app.graph.models import GraphNode
from app.graph.repository import GraphRepository


class FakeClient:
    def __init__(self) -> None:
        self.calls: list[tuple[str, dict[str, object] | None]] = []

    def execute_write(self, query: str, parameters: dict[str, object] | None = None) -> None:
        self.calls.append((query, parameters))


def test_upsert_node_builds_parameterized_query() -> None:
    client = FakeClient()
    repository = GraphRepository(client=client)  # type: ignore[arg-type]

    repository.upsert_node(GraphNode(label="Person", key="person-1", properties={"name": "Demo"}))

    query, params = client.calls[0]
    assert "MERGE (n:Person {id: $key})" in query
    assert params == {"key": "person-1", "properties": {"name": "Demo"}}


def test_rejects_invalid_label() -> None:
    repository = GraphRepository(client=FakeClient())  # type: ignore[arg-type]

    with pytest.raises(ValueError):
        repository.upsert_node(GraphNode(label="Bad Label", key="x"))
