import re
from typing import Any

from app.graph.client import GraphClient
from app.graph.models import GraphNode, GraphRecordEdge, GraphRecordNode

_SAFE_TOKEN = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def _validate_token(value: str, token_type: str) -> str:
    if not _SAFE_TOKEN.match(value):
        raise ValueError(f"Invalid Neo4j {token_type}: {value}")
    return value


class GraphRepository:
    def __init__(self, client: GraphClient | None = None) -> None:
        self.client = client or GraphClient()

    def upsert_node(self, node: GraphNode) -> None:
        label = _validate_token(node.label, "label")
        query = f"MERGE (n:{label} {{id: $key}}) SET n += $properties"
        self.client.execute_write(query, {"key": node.key, "properties": node.properties})

    def upsert_relationship(
        self,
        start: GraphNode,
        relationship_type: str,
        end: GraphNode,
        properties: dict[str, Any] | None = None,
    ) -> None:
        start_label = _validate_token(start.label, "label")
        end_label = _validate_token(end.label, "label")
        rel_type = _validate_token(relationship_type, "relationship type")
        query = (
            f"MERGE (a:{start_label} {{id: $start_key}}) "
            f"MERGE (b:{end_label} {{id: $end_key}}) "
            f"MERGE (a)-[r:{rel_type} {{id: $relationship_id}}]->(b) "
            "SET a += $start_props, b += $end_props, r += $rel_props"
        )
        relationship_id = (properties or {}).get("id") or f"{rel_type}_{start.key}_{end.key}"
        self.client.execute_write(
            query,
            {
                "start_key": start.key,
                "end_key": end.key,
                "relationship_id": relationship_id,
                "start_props": start.properties,
                "end_props": end.properties,
                "rel_props": {"id": relationship_id, **(properties or {})},
            },
        )

    def create_constraints(self) -> None:
        for label in ["Person", "Organization", "Phone", "BankAccount", "Vehicle", "Location", "Case", "Document"]:
            safe_label = _validate_token(label, "label")
            self.client.execute_write(f"CREATE CONSTRAINT {safe_label.lower()}_id IF NOT EXISTS FOR (n:{safe_label}) REQUIRE n.id IS UNIQUE")
        self.client.execute_write("CREATE INDEX relationship_id IF NOT EXISTS FOR ()-[r]-() ON (r.id)")
        self.client.execute_write("CREATE INDEX entity_label IF NOT EXISTS FOR (n) ON (n.label)")
        self.client.execute_write("CREATE INDEX entity_normalized_name IF NOT EXISTS FOR (n) ON (n.normalized_name)")

    def clear_graph(self) -> None:
        self.client.execute_write("MATCH (n) DETACH DELETE n")

    def get_entity(self, entity_id: str) -> dict[str, Any] | None:
        rows = self.client.execute_read(
            """
            MATCH (n {id: $entity_id})
            OPTIONAL MATCH (n)-[r]-()
            RETURN n, labels(n)[0] AS type, count(r) AS relationship_count
            """,
            {"entity_id": entity_id},
        )
        if not rows:
            return None
        row = rows[0]
        node = row["n"]
        props = dict(node)
        return {
            "id": props.get("id", entity_id),
            "type": row["type"],
            "label": props.get("label") or props.get("name") or props.get("id", entity_id),
            "properties": props,
            "case_ids": props.get("case_ids") or [],
            "relationship_count": row["relationship_count"],
        }

    def get_neighbors(
        self,
        entity_id: str,
        depth: int = 1,
        relationship_type: str | None = None,
        limit: int = 100,
    ) -> tuple[list[GraphRecordNode], list[GraphRecordEdge]]:
        rel_filter = ""
        if relationship_type:
            rel_type = _validate_token(relationship_type, "relationship type")
            rel_filter = f":{rel_type}"
        rows = self.client.execute_read(
            f"""
            MATCH p=(start {{id: $entity_id}})-[rels{rel_filter}*1..{depth}]-(neighbor)
            WITH p LIMIT $limit
            UNWIND nodes(p) AS n
            WITH collect(DISTINCT n) AS ns, collect(DISTINCT relationships(p)) AS rel_groups
            UNWIND rel_groups AS rel_group
            UNWIND rel_group AS r
            RETURN ns AS nodes, collect(DISTINCT r) AS relationships
            """,
            {"entity_id": entity_id, "limit": limit},
        )
        return self._records_to_graph(rows)

    def get_case_graph(
        self,
        case_id: str,
        entity_type: str | None = None,
        relationship_type: str | None = None,
        depth: int = 1,
        limit: int = 250,
    ) -> tuple[list[GraphRecordNode], list[GraphRecordEdge]]:
        label_filter = ""
        if entity_type:
            label = _validate_token(entity_type, "label")
            label_filter = f"WHERE n:{label}"
        rel_where = ""
        if relationship_type:
            rel_where = "WHERE type(r) = $relationship_type"
        rows = self.client.execute_read(
            f"""
            MATCH (c:Case {{id: $case_id}})<-[:LINKED_TO_CASE]-(n)
            {label_filter}
            WITH collect(DISTINCT n)[0..$limit] AS case_nodes, c
            UNWIND case_nodes AS n
            OPTIONAL MATCH p=(n)-[*1..{depth}]-(m)
            WHERE m IN case_nodes OR m = c
            UNWIND relationships(p) AS r
            {rel_where}
            RETURN case_nodes + [c] AS nodes, collect(DISTINCT r) AS relationships
            """,
            {"case_id": case_id, "relationship_type": relationship_type, "limit": limit},
        )
        return self._records_to_graph(rows)

    def shortest_path(self, source_id: str, target_id: str, max_depth: int) -> tuple[list[GraphRecordNode], list[GraphRecordEdge]]:
        rows = self.client.execute_read(
            f"""
            MATCH p = shortestPath((source {{id: $source_id}})-[*..{max_depth}]-(target {{id: $target_id}}))
            RETURN nodes(p) AS nodes, relationships(p) AS relationships
            """,
            {"source_id": source_id, "target_id": target_id},
        )
        return self._records_to_graph(rows)

    def search(self, query: str, entity_type: str | None = None, case_id: str | None = None, limit: int = 25) -> list[GraphRecordNode]:
        label_match = "(n)"
        if entity_type:
            label_match = f"(n:{_validate_token(entity_type, 'label')})"
        case_match = ""
        case_where = ""
        if case_id:
            case_match = "MATCH (n)-[:LINKED_TO_CASE]->(:Case {id: $case_id})"
            case_where = "AND true"
        rows = self.client.execute_read(
            f"""
            MATCH {label_match}
            {case_match}
            WHERE toLower(n.id) CONTAINS $query
               OR toLower(coalesce(n.label, '')) CONTAINS $query
               OR toLower(coalesce(n.normalized_name, '')) CONTAINS $query
               OR any(alias IN coalesce(n.aliases, []) WHERE toLower(alias) CONTAINS $query)
               OR toLower(coalesce(n.number, '')) CONTAINS $query
               OR toLower(coalesce(n.account_number_masked, '')) CONTAINS $query
               OR toLower(coalesce(n.registration_number, '')) CONTAINS $query
               {case_where}
            RETURN collect(DISTINCT n)[0..$limit] AS nodes, [] AS relationships
            """,
            {"query": query.lower(), "case_id": case_id, "limit": limit},
        )
        nodes, _ = self._records_to_graph(rows)
        return nodes

    def get_relationship_evidence(self, relationship_id: str) -> dict[str, Any] | None:
        rows = self.client.execute_read(
            """
            MATCH (a)-[r {id: $relationship_id}]->(b)
            OPTIONAL MATCH (d:Document {id: r.source_document_id})
            RETURN a, b, r, type(r) AS type, d
            """,
            {"relationship_id": relationship_id},
        )
        if not rows:
            return None
        row = rows[0]
        rel = dict(row["r"])
        source = dict(row["a"])
        target = dict(row["b"])
        document = dict(row["d"]) if row.get("d") else None
        return {
            "relationship": {
                "id": rel.get("id", relationship_id),
                "source": source.get("id"),
                "target": target.get("id"),
                "type": row["type"],
                "properties": rel,
            },
            "evidence_sources": [rel] if rel.get("source_id") else [],
            "source_documents": [document] if document else [],
            "confidence": rel.get("confidence"),
            "timestamps": [rel["timestamp"]] if rel.get("timestamp") else [],
        }

    def all_case_graph(self, case_id: str | None = None, limit: int = 1000) -> tuple[list[GraphRecordNode], list[GraphRecordEdge]]:
        if case_id:
            return self.get_case_graph(case_id=case_id, depth=1, limit=limit)
        rows = self.client.execute_read(
            """
            MATCH (n)
            WITH collect(DISTINCT n)[0..$limit] AS ns
            OPTIONAL MATCH (a)-[r]-(b)
            WHERE a IN ns AND b IN ns
            RETURN ns AS nodes, collect(DISTINCT r) AS relationships
            """,
            {"limit": limit},
        )
        return self._records_to_graph(rows)

    def _records_to_graph(self, rows: list[dict[str, Any]]) -> tuple[list[GraphRecordNode], list[GraphRecordEdge]]:
        nodes_by_id: dict[str, GraphRecordNode] = {}
        edges_by_id: dict[str, GraphRecordEdge] = {}
        for row in rows:
            for node in row.get("nodes") or []:
                props = dict(node)
                node_id = props.get("id")
                if node_id:
                    labels = list(getattr(node, "labels", []))
                    nodes_by_id[node_id] = GraphRecordNode(
                        id=node_id,
                        type=labels[0] if labels else props.get("type", "Entity"),
                        label=props.get("label") or props.get("name") or node_id,
                        properties=props,
                    )
            for rel in row.get("relationships") or []:
                props = dict(rel)
                edge_id = props.get("id") or str(getattr(rel, "element_id", "relationship"))
                source_node = getattr(rel, "start_node", None)
                target_node = getattr(rel, "end_node", None)
                source_id = source_node.get("id") if source_node is not None else None
                target_id = target_node.get("id") if target_node is not None else None
                edges_by_id[edge_id] = GraphRecordEdge(
                    id=edge_id,
                    source=source_id,
                    target=target_id,
                    type=getattr(rel, "type", props.get("type", "RELATED_TO")),
                    properties=props,
                )
        return list(nodes_by_id.values()), list(edges_by_id.values())
