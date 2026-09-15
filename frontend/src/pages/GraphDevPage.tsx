import { Activity, Database, Network, RefreshCw, Terminal } from "lucide-react";
import { useState } from "react";

import {
  getBetweennessCentrality,
  getBridgeEntities,
  getCaseGraph,
  getCommunities,
  getDegreeCentrality,
  getEntityNeighbors,
  getNetworkSummary,
  getPagerank,
} from "../services/api";
import type { BridgeEntity, CentralityResult, CommunitiesResponse, GraphNode, GraphResponse, NetworkSummary } from "../types/graph";

const demoCases = ["C001", "C002", "C003"];

export function GraphDevPage() {
  const [caseId, setCaseId] = useState("C001");
  const [caseGraph, setCaseGraph] = useState<GraphResponse | null>(null);
  const [neighbors, setNeighbors] = useState<GraphResponse | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<string>("");
  const [degree, setDegree] = useState<CentralityResult[]>([]);
  const [betweenness, setBetweenness] = useState<CentralityResult[]>([]);
  const [pagerank, setPagerank] = useState<CentralityResult[]>([]);
  const [communities, setCommunities] = useState<CommunitiesResponse | null>(null);
  const [summary, setSummary] = useState<NetworkSummary | null>(null);
  const [bridges, setBridges] = useState<BridgeEntity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadCase() {
    setError(null);
    setLoading(true);
    try {
      const graph = await getCaseGraph(caseId);
      setCaseGraph(graph);
      setSelectedEntity(graph.nodes[0]?.id ?? "");
      const [degreeRows, betweennessRows, pagerankRows, communityRows, summaryRow, bridgeRows] = await Promise.all([
        getDegreeCentrality(caseId),
        getBetweennessCentrality(caseId),
        getPagerank(caseId),
        getCommunities(caseId),
        getNetworkSummary(caseId),
        getBridgeEntities(caseId),
      ]);
      setDegree(degreeRows);
      setBetweenness(betweennessRows);
      setPagerank(pagerankRows);
      setCommunities(communityRows);
      setSummary(summaryRow);
      setBridges(bridgeRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load graph data.");
    } finally {
      setLoading(false);
    }
  }

  async function loadNeighbors(entityId = selectedEntity) {
    if (!entityId) return;
    setError(null);
    try {
      setNeighbors(await getEntityNeighbors(entityId, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load neighbors.");
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Diagnostic Console · Graph Engine Test</p>
          <h1>Knowledge Graph Diagnostics</h1>
          <p className="muted">Direct Neo4j Cypher verification, centrality metrics, and community detection</p>
        </div>
        <div className="quick-links">
          <label style={{ fontSize: "11px", color: "#8fa8b7", display: "flex", alignItems: "center", gap: "6px" }}>
            Case Scope:
            <select
              className="veil-select"
              style={{ height: "30px", padding: "0 8px" }}
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
            >
              {demoCases.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <button className="veil-button" disabled={loading} onClick={() => void loadCase()}>
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            {loading ? "Fetching..." : "Execute Graph Query"}
          </button>
        </div>
      </header>

      {error ? <div className="veil-error" style={{ padding: "12px", borderRadius: "4px" }}>{error}</div> : null}

      <div className="metric-grid">
        <div className="metric">
          <span>Graph Nodes</span>
          <strong style={{ color: "#38bdf8" }}>{caseGraph?.nodes.length ?? 0}</strong>
        </div>
        <div className="metric">
          <span>Relationships</span>
          <strong style={{ color: "#34d399" }}>{caseGraph?.edges.length ?? 0}</strong>
        </div>
        <div className="metric">
          <span>Communities</span>
          <strong style={{ color: "#fbbf24" }}>{communities?.communities.length ?? 0}</strong>
        </div>
        <div className="metric">
          <span>Bridge Entities</span>
          <strong style={{ color: "#a855f7" }}>{bridges.length}</strong>
        </div>
      </div>

      {summary ? (
        <div className="veil-panel">
          <div className="panel-head"><h2>Network Topology Summary</h2></div>
          <div className="panel-body">
            <pre style={{ margin: 0, fontSize: "11px", color: "#9fc3d6" }}>
              {JSON.stringify(summary, null, 2)}
            </pre>
          </div>
        </div>
      ) : null}

      <div className="veil-grid-2">
        <EntityList
          nodes={caseGraph?.nodes ?? []}
          selectedEntity={selectedEntity}
          onSelect={(nodeId) => setSelectedEntity(nodeId)}
          onLoadNeighbors={loadNeighbors}
        />
        <div className="veil-panel">
          <div className="panel-head"><h2>Neighbor Graph Response</h2></div>
          <div className="panel-body">
            <pre style={{ margin: 0, maxHeight: "380px", overflow: "auto", fontSize: "11px", color: "#9fc3d6" }}>
              {JSON.stringify(neighbors, null, 2)}
            </pre>
          </div>
        </div>
      </div>

      <div className="veil-grid-3">
        <RankList title="Top Degree Entities" rows={degree} />
        <RankList title="Top Betweenness Entities" rows={betweenness} />
        <RankList title="Top PageRank Entities" rows={pagerank} />
      </div>

      <div className="veil-panel">
        <div className="panel-head"><h2>Potential Bridge Entities</h2></div>
        <div className="panel-body">
          <pre style={{ margin: 0, maxHeight: "240px", overflow: "auto", fontSize: "11px", color: "#9fc3d6" }}>
            {JSON.stringify(bridges, null, 2)}
          </pre>
        </div>
      </div>
    </section>
  );
}

function EntityList({
  nodes,
  selectedEntity,
  onSelect,
  onLoadNeighbors,
}: {
  nodes: GraphNode[];
  selectedEntity: string;
  onSelect: (nodeId: string) => void;
  onLoadNeighbors: (nodeId?: string) => void;
}) {
  return (
    <div className="veil-panel">
      <div className="panel-head">
        <h2>Indexed Nodes ({nodes.length})</h2>
        <button
          className="veil-button secondary"
          style={{ height: "24px", padding: "0 6px", fontSize: "10px" }}
          onClick={() => void onLoadNeighbors()}
        >
          Fetch Neighbors
        </button>
      </div>
      <div className="panel-body stack-list" style={{ maxHeight: "380px", overflowY: "auto" }}>
        {nodes.map((node) => (
          <button
            key={node.id}
            className="stack-row"
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
              borderLeft: selectedEntity === node.id ? "3px solid #38bdf8" : undefined,
              background: selectedEntity === node.id ? "#0e1a26" : undefined,
            }}
            onClick={() => onSelect(node.id)}
          >
            <span style={{ fontWeight: 600, color: "#edf4f7" }}>{node.label || node.id}</span>
            <span style={{ fontFamily: "ui-monospace, monospace", fontSize: "10px", color: "#38bdf8" }}>{node.id}</span>
          </button>
        ))}
        {!nodes.length && <p className="muted">No nodes fetched. Click Execute Graph Query above.</p>}
      </div>
    </div>
  );
}

function RankList({ title, rows }: { title: string; rows: CentralityResult[] }) {
  return (
    <div className="veil-panel">
      <div className="panel-head"><h2>{title}</h2></div>
      <div className="panel-body stack-list">
        {rows.map((row) => (
          <div key={row.entity_id} className="stack-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong style={{ color: "#edf4f7", fontSize: "12px" }}>{row.name}</strong>
              <small className="muted" style={{ display: "block", fontSize: "10px", fontFamily: "ui-monospace, monospace" }}>{row.entity_id}</small>
            </div>
            <strong style={{ fontFamily: "ui-monospace, monospace", color: "#38bdf8" }}>{row.score.toFixed(4)}</strong>
          </div>
        ))}
        {!rows.length && <p className="muted">No rank scores calculated.</p>}
      </div>
    </div>
  );
}
