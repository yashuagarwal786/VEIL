import logging

from fastapi import APIRouter, HTTPException, Query

from app.graph.service import GraphService
from app.schemas.graph import (
    EntityResponse,
    GraphEdgeResponse,
    GraphNodeResponse,
    GraphResponse,
    PathResponse,
    RelationshipEvidenceResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()


def _graph_response(nodes, edges) -> GraphResponse:
    return GraphResponse(
        nodes=[GraphNodeResponse(id=node.id, type=node.type, label=node.label, properties=node.properties) for node in nodes],
        edges=[GraphEdgeResponse(id=edge.id, source=edge.source, target=edge.target, type=edge.type, properties=edge.properties) for edge in edges],
    )


@router.get("/entities/{entity_id}", response_model=EntityResponse, summary="Look up a graph entity")
def get_entity(entity_id: str) -> EntityResponse:
    entity = GraphService().get_entity(entity_id)
    if not entity:
        raise HTTPException(status_code=404, detail=f"Entity '{entity_id}' was not found.")
    return EntityResponse(**entity)


@router.get("/entities/{entity_id}/neighbors", response_model=GraphResponse, summary="Explore graph neighbors")
def get_neighbors(
    entity_id: str,
    depth: int = Query(default=1, ge=1, le=3),
    relationship_type: str | None = Query(default=None, min_length=2, max_length=50),
    limit: int = Query(default=100, ge=1, le=300),
) -> GraphResponse:
    nodes, edges = GraphService().get_neighbors(entity_id, depth, relationship_type, limit)
    if not nodes:
        raise HTTPException(status_code=404, detail=f"Entity '{entity_id}' was not found or has no visible neighbors.")
    return _graph_response(nodes, edges)


@router.get("/cases/{case_id}", response_model=GraphResponse, summary="Fetch a case knowledge graph")
def get_case_graph(
    case_id: str,
    entity_type: str | None = Query(default=None, min_length=2, max_length=50),
    relationship_type: str | None = Query(default=None, min_length=2, max_length=50),
    depth: int = Query(default=1, ge=1, le=3),
    limit: int = Query(default=250, ge=1, le=500),
) -> GraphResponse:
    nodes, edges = GraphService().get_case_graph(case_id, entity_type, relationship_type, depth, limit)
    if not nodes:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' was not found in the graph.")
    return _graph_response(nodes, edges)


@router.get("/path", response_model=PathResponse, summary="Find the shortest graph path within a maximum depth")
def shortest_path(
    source_id: str = Query(..., min_length=1),
    target_id: str = Query(..., min_length=1),
    max_depth: int = Query(default=4, ge=1, le=8),
) -> PathResponse:
    if source_id == target_id:
        raise HTTPException(status_code=400, detail="source_id and target_id must be different.")
    nodes, edges = GraphService().find_shortest_path(source_id, target_id, max_depth)
    if not nodes:
        return PathResponse(
            source=source_id,
            target=target_id,
            path_length=None,
            path=None,
            explanation=f"No path found within max_depth={max_depth}.",
        )
    return PathResponse(
        source=source_id,
        target=target_id,
        path_length=len(edges),
        nodes=[GraphNodeResponse(id=node.id, type=node.type, label=node.label, properties=node.properties) for node in nodes],
        relationships=[GraphEdgeResponse(id=edge.id, source=edge.source, target=edge.target, type=edge.type, properties=edge.properties) for edge in edges],
        path=[node.id for node in nodes],
        explanation="Shortest path found within requested maximum depth.",
    )


@router.get("/search", response_model=list[GraphNodeResponse], summary="Search graph entities")
def search_graph(
    query: str = Query(..., min_length=1, max_length=100),
    entity_type: str | None = Query(default=None, min_length=2, max_length=50),
    case_id: str | None = Query(default=None, min_length=1, max_length=40),
    limit: int = Query(default=25, ge=1, le=100),
) -> list[GraphNodeResponse]:
    nodes = GraphService().search(query=query, entity_type=entity_type, case_id=case_id, limit=limit)
    return [GraphNodeResponse(id=node.id, type=node.type, label=node.label, properties=node.properties) for node in nodes]


@router.get(
    "/relationships/{relationship_id}/evidence",
    response_model=RelationshipEvidenceResponse,
    summary="Retrieve provenance for a graph relationship",
)
def relationship_evidence(relationship_id: str) -> RelationshipEvidenceResponse:
    evidence = GraphService().get_relationship_evidence(relationship_id)
    if not evidence:
        return RelationshipEvidenceResponse(relationship=None, evidence_sources=[], source_documents=[], confidence=None, timestamps=[])
    return RelationshipEvidenceResponse(**evidence)
