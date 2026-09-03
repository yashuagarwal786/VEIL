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
import type { Investigator } from "../types/investigator";
import type { CaseDataSource, CaseSummary, DashboardData, DocumentListItem, EntityDetail, EntitySummary, EvidenceItem, IntelligenceFinding, LocationEvent, ProcessingActivity, SearchResult, TimelineEvent } from "../types/workspace";

const DEFAULT_DEV_API_BASE_URL = "http://localhost:8000";
const REQUEST_TIMEOUT_MS = import.meta.env.DEV ? 15000 : 60000;

export function getApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  const baseUrl = configured || (import.meta.env.DEV ? DEFAULT_DEV_API_BASE_URL : "");
  return baseUrl.replace(/\/+$/, "");
}

export function buildApiUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const baseUrl = getApiBaseUrl();
  return baseUrl ? `${baseUrl}${cleanPath}` : cleanPath;
}

function authHeaders(): Record<string, string> {
  const raw = window.localStorage.getItem("veil.auth.session") ?? window.sessionStorage.getItem("veil.auth.session");
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as { access_token?: string; investigator_id?: string };
    const token = parsed.access_token ?? parsed.investigator_id;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;

  try {
    response = await fetch(buildApiUrl(path), { ...init, headers: { ...authHeaders(), ...(init?.headers ?? {}) }, signal: controller.signal });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown network error";
    throw new Error(`API connection failed for ${path}: ${reason}`);
  } finally {
    window.clearTimeout(timeout);
  }

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`API request failed for ${path}: ${response.status}${details ? ` - ${details}` : ""}`);
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
export function getCaseSources(caseId: number): Promise<CaseDataSource[]> { return request<CaseDataSource[]>(`/api/workspace/cases/${caseId}/sources`); }
export function getCaseActivity(caseId: number): Promise<ProcessingActivity[]> { return request<ProcessingActivity[]>(`/api/workspace/cases/${caseId}/activity`); }
export function getCaseFindings(caseId: number): Promise<IntelligenceFinding[]> { return request<IntelligenceFinding[]>(`/api/workspace/cases/${caseId}/findings`); }
export function processCaseSource(sourceId: number) { return request(`/api/workspace/sources/${sourceId}/process`, { method: "POST" }); }
export function uploadCaseSource(caseId: number, file: File, dataCategory: string, sourceDescription: string): Promise<{ source: CaseDataSource; job: { id: string; status: string; next: string } }> { const form = new FormData(); form.append("file", file); form.append("data_category", dataCategory); form.append("source_description", sourceDescription); return request<{ source: CaseDataSource; job: { id: string; status: string; next: string } }>(`/api/workspace/cases/${caseId}/sources`, { method: "POST", body: form }); }
export function getEntities(caseId = 1, query = ""): Promise<EntitySummary[]> { return request<EntitySummary[]>(`/api/workspace/entities?case_id=${caseId}&query=${encodeURIComponent(query)}`); }
export function getEntityDetail(entityId: string, caseId = 1): Promise<EntityDetail> { return request<EntityDetail>(`/api/workspace/entities/${encodeURIComponent(entityId)}?case_id=${caseId}`); }
export function getEvidence(caseId = 1, query = "", minimumConfidence = 0): Promise<EvidenceItem[]> { return request<EvidenceItem[]>(`/api/workspace/evidence?case_id=${caseId}&query=${encodeURIComponent(query)}&min_confidence=${minimumConfidence}`); }
export function getDocuments(caseId = 1): Promise<DocumentListItem[]> { return request<DocumentListItem[]>(`/api/workspace/documents?case_id=${caseId}`); }
export function getTimeline(caseId = 1, entityId?: number, eventType?: string): Promise<TimelineEvent[]> { const params = new URLSearchParams({ case_id: String(caseId) }); if (entityId) params.set("entity_id", String(entityId)); if (eventType && eventType !== "ALL") params.set("event_type", eventType); return request<TimelineEvent[]>(`/api/workspace/timeline?${params}`); }
export function getLocations(caseId = 1, entityId?: number): Promise<LocationEvent[]> { const params = new URLSearchParams({ case_id: String(caseId) }); if (entityId) params.set("entity_id", String(entityId)); return request<LocationEvent[]>(`/api/workspace/locations?${params}`); }
export function globalSearch(query: string): Promise<SearchResult[]> { return request<SearchResult[]>(`/api/workspace/search?query=${encodeURIComponent(query)}`); }

export function loginInvestigator(email: string, password: string): Promise<{ investigator: Investigator; token_type: string; access_token: string }> {
  return request<{ investigator: Investigator; token_type: string; access_token: string }>("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
}
export function getInvestigator(investigatorId: string): Promise<Investigator> { return request<Investigator>(`/api/auth/me/${encodeURIComponent(investigatorId)}`); }
export function getInvestigators(): Promise<Investigator[]> { return request<Investigator[]>("/api/auth/investigators"); }

export function getAlerts(caseId = 1): Promise<AlertItem[]> { return request<AlertItem[]>(`/api/alerts?case_id=${caseId}`); }
export function getAnalyticsOverview(caseId = 1): Promise<AnalyticsOverview> { return request<AnalyticsOverview>(`/api/analytics/cases/${caseId}/overview`); }
export async function recalculateAnalytics(caseId = 1) {
  return request("/api/analytics/recalculate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ case_id: caseId }) });
}
export async function updateAlertStatus(alertId: number, status: AlertItem["status"]): Promise<AlertItem> {
  return request<AlertItem>(`/api/alerts/${alertId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
}

export async function uploadDocument(caseId: number, file: File): Promise<DocumentUploadResult> {
  const form = new FormData();
  form.append("case_id", String(caseId));
  form.append("file", file);
  return request<DocumentUploadResult>("/api/documents/upload", {
    method: "POST",
    body: form,
  });
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
  return request<EntityMatch>(`/api/entities/matches/${matchId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision }),
  });
}

export async function reviewExtraction(extractionId: number, decision: ReviewDecision) {
  return request(`/api/documents/extractions/${extractionId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision }),
  });
}

export async function reviewRelationship(relationshipId: number, decision: ReviewDecision) {
  return request(`/api/documents/relationships/${relationshipId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision }),
  });
}
