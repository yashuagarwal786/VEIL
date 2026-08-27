from typing import Any

from pydantic import BaseModel, Field


class CentralityResult(BaseModel):
    entity_id: str
    entity_type: str
    name: str
    score: float
    degree: int | None = None


class CommunityResult(BaseModel):
    id: int
    size: int
    members: list[dict[str, Any]]
    key_entities: list[dict[str, Any]]


class CommunitiesResponse(BaseModel):
    communities: list[CommunityResult]


class NetworkSummaryResponse(BaseModel):
    total_entities: int
    total_relationships: int
    number_of_communities: int
    largest_community: int
    highest_degree_entity: dict[str, Any] | None
    highest_betweenness_entity: dict[str, Any] | None
    graph_density: float


class KeyEntityResult(BaseModel):
    entity_id: str
    name: str
    entity_type: str
    degree_score: float
    betweenness_score: float
    pagerank_score: float
    structural_importance: float


class BridgeEntityResult(BaseModel):
    entity: dict[str, Any]
    communities_connected: list[int]
    bridge_score: float
    supporting_relationships: list[str] = Field(default_factory=list)
