from app.graph.analytics import GraphAnalyticsService
from app.graph.models import GraphRecordEdge, GraphRecordNode


class FakeGraphRepository:
    def all_case_graph(self, case_id: str | None = None, limit: int = 1000):
        nodes = [
            GraphRecordNode(id=node_id, type="Person", label=node_id)
            for node_id in ["A", "B", "C", "D", "E", "F", "G", "H"]
        ]
        edges = [
            GraphRecordEdge(id="AB", source="A", target="B", type="KNOWS"),
            GraphRecordEdge(id="BC", source="B", target="C", type="KNOWS"),
            GraphRecordEdge(id="BD", source="B", target="D", type="KNOWS"),
            GraphRecordEdge(id="DE", source="D", target="E", type="KNOWS"),
            GraphRecordEdge(id="FG", source="F", target="G", type="KNOWS"),
            GraphRecordEdge(id="GH", source="G", target="H", type="KNOWS"),
            GraphRecordEdge(id="CF", source="C", target="F", type="KNOWS"),
        ]
        return nodes, edges


def test_degree_centrality_identifies_connected_nodes() -> None:
    service = GraphAnalyticsService(repository=FakeGraphRepository())  # type: ignore[arg-type]

    results = service.calculate_degree_centrality("C001", limit=3)

    assert any(item["entity_id"] == "B" for item in results)
    assert results[0]["degree"] >= results[-1]["degree"]


def test_betweenness_identifies_bridge_area() -> None:
    service = GraphAnalyticsService(repository=FakeGraphRepository())  # type: ignore[arg-type]

    results = service.calculate_betweenness_centrality("C001", limit=3)
    ids = {item["entity_id"] for item in results}

    assert {"B", "C", "F"} & ids


def test_pagerank_returns_structural_scores() -> None:
    service = GraphAnalyticsService(repository=FakeGraphRepository())  # type: ignore[arg-type]

    results = service.calculate_pagerank("C001", limit=5)

    assert len(results) == 5
    assert all(item["score"] > 0 for item in results)


def test_communities_and_bridge_entities() -> None:
    service = GraphAnalyticsService(repository=FakeGraphRepository())  # type: ignore[arg-type]

    communities = service.detect_communities("C001")
    bridges = service.find_bridge_entities("C001", limit=5)

    assert len(communities) >= 2
    assert bridges
    assert all("bridge_score" in bridge for bridge in bridges)


def test_network_summary() -> None:
    service = GraphAnalyticsService(repository=FakeGraphRepository())  # type: ignore[arg-type]

    summary = service.get_network_summary("C001")

    assert summary["total_entities"] == 8
    assert summary["total_relationships"] == 7
    assert summary["number_of_communities"] >= 2
