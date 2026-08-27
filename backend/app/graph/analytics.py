from __future__ import annotations

from functools import lru_cache
from typing import Any

import networkx as nx

from app.graph.models import GraphRecordEdge, GraphRecordNode
from app.graph.repository import GraphRepository


def _build_graph(nodes: list[GraphRecordNode], edges: list[GraphRecordEdge]) -> nx.Graph:
    graph = nx.Graph()
    for node in nodes:
        graph.add_node(node.id, type=node.type, label=node.label, properties=node.properties)
    for edge in edges:
        if edge.source and edge.target and edge.source in graph and edge.target in graph:
            graph.add_edge(edge.source, edge.target, id=edge.id, type=edge.type, properties=edge.properties)
    return graph


def _node_result(graph: nx.Graph, node_id: str, score: float, include_degree: bool = False) -> dict[str, Any]:
    data = graph.nodes[node_id]
    result = {
        "entity_id": node_id,
        "entity_type": data.get("type", "Entity"),
        "name": data.get("label", node_id),
        "score": round(float(score), 6),
    }
    if include_degree:
        result["degree"] = int(graph.degree[node_id])
    return result


def _pagerank_power_iteration(graph: nx.Graph, damping: float = 0.85, iterations: int = 100, tolerance: float = 1.0e-8) -> dict[str, float]:
    node_ids = list(graph.nodes)
    node_count = len(node_ids)
    if node_count == 0:
        return {}
    scores = {node_id: 1.0 / node_count for node_id in node_ids}
    base_score = (1.0 - damping) / node_count
    for _ in range(iterations):
        next_scores = {node_id: base_score for node_id in node_ids}
        dangling_score = sum(scores[node_id] for node_id in node_ids if graph.degree[node_id] == 0)
        dangling_share = damping * dangling_score / node_count
        for node_id in node_ids:
            next_scores[node_id] += dangling_share
            for neighbor in graph.neighbors(node_id):
                degree = graph.degree[neighbor]
                if degree:
                    next_scores[node_id] += damping * (scores[neighbor] / degree)
        delta = sum(abs(next_scores[node_id] - scores[node_id]) for node_id in node_ids)
        scores = next_scores
        if delta < tolerance:
            break
    return scores


class GraphAnalyticsService:
    def __init__(self, repository: GraphRepository | None = None) -> None:
        self.repository = repository or GraphRepository()

    def _graph_for_case(self, case_id: str | None) -> nx.Graph:
        nodes, edges = self.repository.all_case_graph(case_id=case_id, limit=1000)
        return _build_graph(nodes, edges)

    @lru_cache(maxsize=64)
    def calculate_degree_centrality(self, case_id: str | None = None, limit: int = 10) -> list[dict[str, Any]]:
        graph = self._graph_for_case(case_id)
        scores = nx.degree_centrality(graph) if graph.number_of_nodes() else {}
        ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)[:limit]
        return [_node_result(graph, node_id, score, include_degree=True) for node_id, score in ranked]

    @lru_cache(maxsize=64)
    def calculate_betweenness_centrality(self, case_id: str | None = None, limit: int = 10) -> list[dict[str, Any]]:
        graph = self._graph_for_case(case_id)
        scores = nx.betweenness_centrality(graph, normalized=True) if graph.number_of_nodes() else {}
        ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)[:limit]
        return [_node_result(graph, node_id, score) for node_id, score in ranked]

    @lru_cache(maxsize=64)
    def calculate_pagerank(self, case_id: str | None = None, limit: int = 10) -> list[dict[str, Any]]:
        graph = self._graph_for_case(case_id)
        scores = _pagerank_power_iteration(graph) if graph.number_of_nodes() else {}
        ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)[:limit]
        return [_node_result(graph, node_id, score) for node_id, score in ranked]

    @lru_cache(maxsize=64)
    def detect_communities(self, case_id: str | None = None) -> list[dict[str, Any]]:
        graph = self._graph_for_case(case_id)
        if graph.number_of_nodes() == 0:
            return []
        communities = nx.algorithms.community.greedy_modularity_communities(graph)
        results = []
        for index, members in enumerate(communities, start=1):
            subgraph = graph.subgraph(members)
            key_entities = sorted(subgraph.degree, key=lambda item: item[1], reverse=True)[:3]
            results.append(
                {
                    "id": index,
                    "size": len(members),
                    "members": [{"id": node_id, "label": graph.nodes[node_id].get("label"), "type": graph.nodes[node_id].get("type")} for node_id in sorted(members)],
                    "key_entities": [{"id": node_id, "label": graph.nodes[node_id].get("label"), "degree": degree} for node_id, degree in key_entities],
                }
            )
        return results

    def calculate_graph_density(self, case_id: str | None = None) -> float:
        graph = self._graph_for_case(case_id)
        return round(float(nx.density(graph)), 6) if graph.number_of_nodes() else 0.0

    def get_network_summary(self, case_id: str) -> dict[str, Any]:
        graph = self._graph_for_case(case_id)
        communities = self.detect_communities(case_id)
        degree = self.calculate_degree_centrality(case_id, 1)
        betweenness = self.calculate_betweenness_centrality(case_id, 1)
        return {
            "total_entities": graph.number_of_nodes(),
            "total_relationships": graph.number_of_edges(),
            "number_of_communities": len(communities),
            "largest_community": max((community["size"] for community in communities), default=0),
            "highest_degree_entity": degree[0] if degree else None,
            "highest_betweenness_entity": betweenness[0] if betweenness else None,
            "graph_density": round(float(nx.density(graph)), 6) if graph.number_of_nodes() else 0.0,
        }

    def find_key_entities(self, case_id: str, limit: int = 10) -> list[dict[str, Any]]:
        graph = self._graph_for_case(case_id)
        if graph.number_of_nodes() == 0:
            return []
        degree = nx.degree_centrality(graph)
        betweenness = nx.betweenness_centrality(graph, normalized=True)
        pagerank = _pagerank_power_iteration(graph)
        results = []
        for node_id in graph.nodes:
            structural = (degree[node_id] + betweenness[node_id] + pagerank[node_id]) / 3
            results.append(
                {
                    "entity_id": node_id,
                    "name": graph.nodes[node_id].get("label", node_id),
                    "entity_type": graph.nodes[node_id].get("type", "Entity"),
                    "degree_score": round(float(degree[node_id]), 6),
                    "betweenness_score": round(float(betweenness[node_id]), 6),
                    "pagerank_score": round(float(pagerank[node_id]), 6),
                    "structural_importance": round(float(structural), 6),
                }
            )
        return sorted(results, key=lambda item: item["structural_importance"], reverse=True)[:limit]

    def find_bridge_entities(self, case_id: str, limit: int = 10) -> list[dict[str, Any]]:
        graph = self._graph_for_case(case_id)
        communities = self.detect_communities(case_id)
        community_by_node = {member["id"]: community["id"] for community in communities for member in community["members"]}
        betweenness = nx.betweenness_centrality(graph, normalized=True) if graph.number_of_nodes() else {}
        bridge_results = []
        for node_id in graph.nodes:
            connected = {community_by_node[neighbor] for neighbor in graph.neighbors(node_id) if neighbor in community_by_node}
            if node_id in community_by_node:
                connected.add(community_by_node[node_id])
            if len(connected) < 2:
                continue
            supporting = [graph.edges[node_id, neighbor].get("id") for neighbor in graph.neighbors(node_id) if graph.edges[node_id, neighbor].get("id")]
            bridge_results.append(
                {
                    "entity": {"id": node_id, "label": graph.nodes[node_id].get("label"), "type": graph.nodes[node_id].get("type")},
                    "communities_connected": sorted(connected),
                    "bridge_score": round(float(betweenness.get(node_id, 0.0) * len(connected)), 6),
                    "supporting_relationships": supporting[:10],
                }
            )
        return sorted(bridge_results, key=lambda item: item["bridge_score"], reverse=True)[:limit]
