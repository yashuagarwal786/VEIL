export type GraphNode = {
  id: string;
  type: string;
  label: string;
  properties: Record<string, unknown>;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  type: string;
  properties: Record<string, unknown>;
};

export type GraphResponse = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export type CentralityResult = {
  entity_id: string;
  entity_type: string;
  name: string;
  score: number;
  degree?: number | null;
};

export type Community = {
  id: number;
  size: number;
  members: Array<Record<string, unknown>>;
  key_entities: Array<Record<string, unknown>>;
};

export type CommunitiesResponse = {
  communities: Community[];
};

export type NetworkSummary = {
  total_entities: number;
  total_relationships: number;
  number_of_communities: number;
  largest_community: number;
  highest_degree_entity: Record<string, unknown> | null;
  highest_betweenness_entity: Record<string, unknown> | null;
  graph_density: number;
};

export type BridgeEntity = {
  entity: Record<string, unknown>;
  communities_connected: number[];
  bridge_score: number;
  supporting_relationships: string[];
};

export type PathResponse = { source: string; target: string; path_length: number | null; nodes: GraphNode[]; relationships: GraphEdge[]; path: string[] | null; explanation: string };
export type RelationshipEvidence = { relationship: GraphEdge | null; evidence_sources: Array<Record<string, unknown>>; source_documents: Array<Record<string, unknown>>; confidence: number | null; timestamps: string[] };
