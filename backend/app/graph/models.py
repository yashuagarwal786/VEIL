from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class GraphNode:
    label: str
    key: str
    properties: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class GraphRelationship:
    start_label: str
    start_key: str
    relationship_type: str
    end_label: str
    end_key: str
    properties: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class GraphRecordNode:
    id: str
    type: str
    label: str
    properties: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class GraphRecordEdge:
    id: str
    source: str
    target: str
    type: str
    properties: dict[str, Any] = field(default_factory=dict)
