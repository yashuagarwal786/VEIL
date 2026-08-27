from typing import Any

from pydantic import BaseModel, Field


class GraphNodeResponse(BaseModel):
    id: str
    type: str
    label: str
    properties: dict[str, Any] = Field(default_factory=dict)


class GraphEdgeResponse(BaseModel):
    id: str
    source: str
    target: str
    type: str
    properties: dict[str, Any] = Field(default_factory=dict)


class GraphResponse(BaseModel):
    nodes: list[GraphNodeResponse]
    edges: list[GraphEdgeResponse]


class EntityResponse(GraphNodeResponse):
    case_ids: list[str] = Field(default_factory=list)
    relationship_count: int


class PathResponse(BaseModel):
    source: str
    target: str
    path_length: int | None
    nodes: list[GraphNodeResponse] = Field(default_factory=list)
    relationships: list[GraphEdgeResponse] = Field(default_factory=list)
    path: list[str] | None = None
    explanation: str


class RelationshipEvidenceResponse(BaseModel):
    relationship: GraphEdgeResponse | None
    evidence_sources: list[dict[str, Any]] = Field(default_factory=list)
    source_documents: list[dict[str, Any]] = Field(default_factory=list)
    confidence: float | None = None
    timestamps: list[str] = Field(default_factory=list)
