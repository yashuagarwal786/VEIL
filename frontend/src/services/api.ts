import type {
  BridgeEntity,
  CentralityResult,
  CommunitiesResponse,
  GraphResponse,
  NetworkSummary,
  PathResponse,
  RelationshipEvidence,
} from "../types/graph";
import type { DatabaseHealthResponse, HealthResponse } from "../types/health";
import type {
  DocumentExtractions,
  DocumentDetail,
  DocumentProcessingResult,
  DocumentStatus,
  DocumentUploadResult,
  EntityMatch,
  ReviewDecision,
} from "../types/documents";
import type { AlertItem, AnalyticsOverview } from "../types/analytics";
import type { CaseSummary, DashboardData, DocumentListItem, EntityDetail, EntitySummary, EvidenceItem, LocationEvent, SearchResult, TimelineEvent } from "../types/workspace";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

export function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/api/health");
}

export function getDatabaseHealth(): Promise<DatabaseHealthResponse> {
  return request<DatabaseHealthResponse>("/api/health/database");
}

export function getCaseGraph(caseId: string): Promise<GraphResponse> {
  return request<GraphResponse>(`/api/graph/cases/${encodeURIComponent(caseId)}`);
}

export function getEntityNeighbors(entityId: string, depth = 1): Promise<GraphResponse> {
  return request<GraphResponse>(`/api/graph/entities/${encodeURIComponent(entityId)}/neighbors?depth=${depth}`);
}

export function getDegreeCentrality(caseId: string): Promise<CentralityResult[]> {
  return request<CentralityResult[]>(`/api/analytics/centrality/degree?case_id=${encodeURIComponent(caseId)}&limit=5`);
}

export function getBetweennessCentrality(caseId: string): Promise<CentralityResult[]> {
  return request<CentralityResult[]>(`/api/analytics/centrality/betweenness?case_id=${encodeURIComponent(caseId)}&limit=5`);
}

export function getPagerank(caseId: string): Promise<CentralityResult[]> {
  return request<CentralityResult[]>(`/api/analytics/centrality/pagerank?case_id=${encodeURIComponent(caseId)}&limit=5`);
}

export function getCommunities(caseId: string): Promise<CommunitiesResponse> {
  return request<CommunitiesResponse>(`/api/analytics/communities?case_id=${encodeURIComponent(caseId)}`);
}

export function getNetworkSummary(caseId: string): Promise<NetworkSummary> {
  return request<NetworkSummary>(`/api/analytics/networks/${encodeURIComponent(caseId)}`);
}

export function getBridgeEntities(caseId: string): Promise<BridgeEntity[]> {
  return request<BridgeEntity[]>(`/api/analytics/bridge-entities?case_id=${encodeURIComponent(caseId)}&limit=5`);
}

export function findShortestPath(sourceId: string, targetId: string, maxDepth = 6): Promise<PathResponse> { return request<PathResponse>(`/api/graph/path?source_id=${encodeURIComponent(sourceId)}&target_id=${encodeURIComponent(targetId)}&max_depth=${maxDepth}`); }
export function getRelationshipEvidence(relationshipId: string): Promise<RelationshipEvidence> { return request<RelationshipEvidence>(`/api/graph/relationships/${encodeURIComponent(relationshipId)}/evidence`); }
export function searchGraph(query: string, caseId = "C001"): Promise<GraphResponse["nodes"]> { return request<GraphResponse["nodes"]>(`/api/graph/search?query=${encodeURIComponent(query)}&case_id=${encodeURIComponent(caseId)}&limit=20`); }

export function getDashboard(caseId = 1): Promise<DashboardData> { return request<DashboardData>(`/api/workspace/dashboard?case_id=${caseId}`); }
export function getCases(): Promise<CaseSummary[]> { return request<CaseSummary[]>("/api/workspace/cases"); }
export function getCaseDetail(caseId: number): Promise<CaseSummary> { return request<CaseSummary>(`/api/workspace/cases/${caseId}`); }
export function getEntities(caseId = 1, query = ""): Promise<EntitySummary[]> { return request<EntitySummary[]>(`/api/workspace/entities?case_id=${caseId}&query=${encodeURIComponent(query)}`); }
export function getEntityDetail(entityId: string, caseId = 1): Promise<EntityDetail> { return request<EntityDetail>(`/api/workspace/entities/${encodeURIComponent(entityId)}?case_id=${caseId}`); }
export function getEvidence(caseId = 1, query = "", minimumConfidence = 0): Promise<EvidenceItem[]> { return request<EvidenceItem[]>(`/api/workspace/evidence?case_id=${caseId}&query=${encodeURIComponent(query)}&min_confidence=${minimumConfidence}`); }
export function getDocuments(caseId = 1): Promise<DocumentListItem[]> { return request<DocumentListItem[]>(`/api/workspace/documents?case_id=${caseId}`); }
export function getTimeline(caseId = 1, entityId?: number, eventType?: string): Promise<TimelineEvent[]> { const params = new URLSearchParams({ case_id: String(caseId) }); if (entityId) params.set("entity_id", String(entityId)); if (eventType && eventType !== "ALL") params.set("event_type", eventType); return request<TimelineEvent[]>(`/api/workspace/timeline?${params}`); }
export function getLocations(caseId = 1, entityId?: number): Promise<LocationEvent[]> { const params = new URLSearchParams({ case_id: String(caseId) }); if (entityId) params.set("entity_id", String(entityId)); return request<LocationEvent[]>(`/api/workspace/locations?${params}`); }
export function globalSearch(query: string): Promise<SearchResult[]> { return request<SearchResult[]>(`/api/workspace/search?query=${encodeURIComponent(query)}`); }

export function getAlerts(caseId = 1): Promise<AlertItem[]> { return request<AlertItem[]>(`/api/alerts?case_id=${caseId}`); }
export function getAnalyticsOverview(caseId = 1): Promise<AnalyticsOverview> { return request<AnalyticsOverview>(`/api/analytics/cases/${caseId}/overview`); }
export async function recalculateAnalytics(caseId = 1) {
  const response = await fetch(`${API_BASE_URL}/api/analytics/recalculate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ case_id: caseId }) });
  if (!response.ok) throw new Error(`Recalculation failed: ${response.status}`);
  return response.json();
}
export async function updateAlertStatus(alertId: number, status: AlertItem["status"]): Promise<AlertItem> {
  const response = await fetch(`${API_BASE_URL}/api/alerts/${alertId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
  if (!response.ok) throw new Error(`Alert update failed: ${response.status}`);
  return response.json() as Promise<AlertItem>;
}

export async function uploadDocument(caseId: number, file: File): Promise<DocumentUploadResult> {
  const form = new FormData();
  form.append("case_id", String(caseId));
  form.append("file", file);
  const response = await fetch(`${API_BASE_URL}/api/documents/upload`, {
    method: "POST",
    body: form,
  });
  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }
  return (await response.json()) as DocumentUploadResult;
}

export function processDocument(documentId: number): Promise<DocumentProcessingResult> {
  return request<DocumentProcessingResult>(`/api/documents/${documentId}/process`,);
}

export function getDocumentStatus(documentId: number): Promise<DocumentStatus> {
  return request<DocumentStatus>(`/api/documents/${documentId}/status`);
}

export function getDocumentDetail(documentId: number): Promise<DocumentDetail> {
  return request<DocumentDetail>(`/api/documents/${documentId}`);
}

export function getDocumentExtractions(documentId: number): Promise<DocumentExtractions> {
  return request<DocumentExtractions>(`/api/documents/${documentId}/extractions`);
}

export function getEntityMatches(caseId: number): Promise<EntityMatch[]> {
  return request<EntityMatch[]>(`/api/entities/matches?case_id=${caseId}&limit=25`);
}

export async function reviewEntityMatch(matchId: number, decision: ReviewDecision): Promise<EntityMatch> {
  const response = await fetch(`${API_BASE_URL}/api/entities/matches/${matchId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision }),
  });
  if (!response.ok) {
    throw new Error(`Review failed: ${response.status}`);
  }
  return (await response.json()) as EntityMatch;
}

export async function reviewExtraction(extractionId: number, decision: ReviewDecision) {
  const response = await fetch(`${API_BASE_URL}/api/documents/extractions/${extractionId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision }),
  });
  if (!response.ok) {
    throw new Error(`Extraction review failed: ${response.status}`);
  }
  return response.json();
}

export async function reviewRelationship(relationshipId: number, decision: ReviewDecision) {
  const response = await fetch(`${API_BASE_URL}/api/documents/relationships/${relationshipId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision }),
  });
  if (!response.ok) {
    throw new Error(`Relationship review failed: ${response.status}`);
  }
  return response.json();
}
