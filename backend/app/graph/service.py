from app.graph.ids import normalize_case_id
from app.graph.repository import GraphRepository


class GraphService:
    def __init__(self, repository: GraphRepository | None = None) -> None:
        self.repository = repository or GraphRepository()

    def get_entity(self, entity_id: str) -> dict | None:
        return self.repository.get_entity(entity_id)

    def get_neighbors(self, entity_id: str, depth: int, relationship_type: str | None, limit: int):
        return self.repository.get_neighbors(entity_id, depth=depth, relationship_type=relationship_type, limit=limit)

    def get_case_graph(self, case_id: str, entity_type: str | None, relationship_type: str | None, depth: int, limit: int):
        return self.repository.get_case_graph(normalize_case_id(case_id), entity_type, relationship_type, depth, limit)

    def find_shortest_path(self, source_id: str, target_id: str, max_depth: int):
        return self.repository.shortest_path(source_id, target_id, max_depth)

    def search(self, query: str, entity_type: str | None, case_id: str | None, limit: int):
        normalized_case_id = normalize_case_id(case_id) if case_id else None
        return self.repository.search(query=query, entity_type=entity_type, case_id=normalized_case_id, limit=limit)

    def get_relationship_evidence(self, relationship_id: str):
        return self.repository.get_relationship_evidence(relationship_id)
