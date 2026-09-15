import cytoscape, { type Core } from "cytoscape";
import {
  Activity,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  BrainCircuit,
  Building,
  Calendar,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  FileSearch,
  FileText,
  Focus,
  LocateFixed,
  Mail,
  MapPin,
  Network,
  Phone,
  Radio,
  Shield,
  ShieldAlert,
  User,
  Users,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/AsyncState";
import { useCaseContext } from "../context/CaseContext";
import {
  getBetweennessCentrality,
  getCaseDetail,
  getDegreeCentrality,
  getEntityDetail,
  getEntityNeighbors,
  getEvidence,
  getPagerank,
} from "../services/api";
import type { CentralityResult, GraphEdge, GraphNode, GraphResponse } from "../types/graph";
import type { CaseSummary, EntityDetail, EvidenceItem } from "../types/workspace";

function getEntityIcon(type: string) {
  switch (type.toUpperCase()) {
    case "PERSON":
      return <User size={16} className="text-cyber-cyan" />;
    case "ORGANIZATION":
      return <Building size={16} className="text-cyber-amber" />;
    case "BANKACCOUNT":
    case "BANK_ACCOUNT":
      return <CreditCard size={16} className="text-cyber-teal" />;
    case "PHONE":
      return <Phone size={16} className="text-cyber-indigo" />;
    case "LOCATION":
      return <MapPin size={16} className="text-pink-400" />;
    default:
      return <Shield size={16} className="text-cyber-cyan" />;
  }
}

function getPrioritySeverity(score: number): "CRITICAL" | "HIGH" | "ATTENTION" | "NORMAL" {
  if (score >= 75) return "CRITICAL";
  if (score >= 50) return "HIGH";
  if (score >= 25) return "ATTENTION";
  return "NORMAL";
}

const nodeColors: Record<string, string> = {
  Person: "#38bdf8",
  Organization: "#f59e0b",
  Phone: "#818cf8",
  BankAccount: "#10b981",
  Vehicle: "#a3e635",
  Location: "#ec4899",
  Document: "#c084fc",
  Case: "#94a3b8",
};

export function EntityProfilePage() {
  const { entityId = "P078" } = useParams();
  const { caseId, graphCaseId } = useCaseContext();
  const [item, setItem] = useState<EntityDetail | null>(null);
  const [caseSummary, setCaseSummary] = useState<CaseSummary | null>(null);
  const [network, setNetwork] = useState<Record<string, CentralityResult | undefined>>({});
  const [neighborGraph, setNeighborGraph] = useState<GraphResponse | null>(null);
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);
  const [selectedNeighbor, setSelectedNeighbor] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [depth, setDepth] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<"transactions" | "communications" | "evidence">("transactions");
  const [error, setError] = useState(false);
  const [graphLoading, setGraphLoading] = useState(false);

  const graphContainer = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  const load = useCallback(() => {
    setError(false);
    Promise.allSettled([
      getEntityDetail(entityId, caseId),
      getDegreeCentrality(graphCaseId),
      getBetweennessCentrality(graphCaseId),
      getPagerank(graphCaseId),
      getCaseDetail(caseId),
      getEvidence(caseId, entityId, 0),
    ]).then(([detailRes, degreeRes, betweenRes, pageRes, caseRes, evidenceRes]) => {
      if (detailRes.status === "fulfilled") {
        setItem(detailRes.value);
      } else {
        setError(true);
        return;
      }

      if (caseRes.status === "fulfilled") {
        setCaseSummary(caseRes.value);
      }

      if (evidenceRes.status === "fulfilled") {
        setEvidenceList(evidenceRes.value);
      }

      const degree = degreeRes.status === "fulfilled" ? degreeRes.value : [];
      const between = betweenRes.status === "fulfilled" ? betweenRes.value : [];
      const page = pageRes.status === "fulfilled" ? pageRes.value : [];

      setNetwork({
        degree: degree.find((row) => row.entity_id === entityId),
        betweenness: between.find((row) => row.entity_id === entityId),
        pagerank: page.find((row) => row.entity_id === entityId),
      });
    }).catch(() => setError(true));
  }, [caseId, entityId, graphCaseId]);

  useEffect(load, [load]);

  // Load interactive neighborhood graph for this entity
  const loadNeighbors = useCallback(() => {
    if (!entityId) return;
    setGraphLoading(true);
    getEntityNeighbors(entityId, depth)
      .then((data) => {
        setNeighborGraph(data);
      })
      .catch(() => {
        // Fallback: create minimal local graph from entity details
        if (item) {
          const localNodes: GraphNode[] = [
            { id: item.id, type: item.type, label: item.name, properties: { phone: item.phone, email: item.email } },
          ];
          const localEdges: GraphEdge[] = [];

          item.transactions.forEach((tx) => {
            const senderId = `P${String(tx.sender_id).padStart(3, "0")}`;
            const receiverId = `P${String(tx.receiver_id).padStart(3, "0")}`;
            if (!localNodes.some((n) => n.id === senderId)) {
              localNodes.push({ id: senderId, type: "Person", label: senderId, properties: {} });
            }
            if (!localNodes.some((n) => n.id === receiverId)) {
              localNodes.push({ id: receiverId, type: "Person", label: receiverId, properties: {} });
            }
            localEdges.push({
              id: `tx-${tx.id}`,
              source: senderId,
              target: receiverId,
              type: "TRANSFERRED_TO",
              properties: { amount: tx.amount, timestamp: tx.timestamp },
            });
          });

          item.communications.forEach((c) => {
            const callerId = `P${String(c.caller_id).padStart(3, "0")}`;
            const receiverId = `P${String(c.receiver_id).padStart(3, "0")}`;
            if (!localNodes.some((n) => n.id === callerId)) {
              localNodes.push({ id: callerId, type: "Person", label: callerId, properties: {} });
            }
            if (!localNodes.some((n) => n.id === receiverId)) {
              localNodes.push({ id: receiverId, type: "Person", label: receiverId, properties: {} });
            }
            localEdges.push({
              id: `comm-${c.id}`,
              source: callerId,
              target: receiverId,
              type: "CALLS",
              properties: { duration: c.duration_seconds, timestamp: c.timestamp },
            });
          });

          setNeighborGraph({ nodes: localNodes, edges: localEdges });
        }
      })
      .finally(() => setGraphLoading(false));
  }, [entityId, depth, item]);

  useEffect(() => {
    loadNeighbors();
  }, [loadNeighbors]);

  // Cytoscape initialization for neighborhood graph
  useEffect(() => {
    if (!graphContainer.current || !neighborGraph) return;
    cyRef.current?.destroy();

    const cy = cytoscape({
      container: graphContainer.current,
      elements: [
        ...neighborGraph.nodes.map((n) => {
          const isCurrent = n.id === entityId;
          const nodeColor = isCurrent ? "#38bdf8" : nodeColors[n.type] ?? "#94a3b8";
          return {
            data: {
              id: n.id,
              label: n.label || n.id,
              type: n.type,
              color: nodeColor,
              size: isCurrent ? 36 : 26,
              isCurrent,
              raw: n,
            },
          };
        }),
        ...neighborGraph.edges.map((e) => {
          const isFinancial = e.type === "TRANSFERRED_TO" || e.type === "OWNS_ACCOUNT";
          const isCdr = e.type === "CALLS" || e.type === "COMMUNICATED_WITH";
          const edgeColor = isFinancial ? "#34d399" : isCdr ? "#38bdf8" : "#4a687d";
          const amount = e.properties?.amount;
          const edgeLabel = amount !== undefined && amount !== null ? `₹${Number(amount).toLocaleString()}` : e.type;

          return {
            data: {
              id: e.id,
              source: e.source,
              target: e.target,
              label: edgeLabel,
              edgeColor,
              isFinancial,
              raw: e,
            },
          };
        }),
      ],
      style: [
        {
          selector: "node",
          style: {
            "background-color": "data(color)",
            label: "data(label)",
            color: "#edf4f7",
            "font-size": 10,
            "font-weight": "bold",
            "text-valign": "bottom",
            "text-margin-y": 6,
            "text-background-color": "#060b11",
            "text-background-opacity": 0.9,
            "text-background-padding": "3px",
            "text-background-shape": "roundrectangle",
            "text-border-color": "#162b3c",
            "text-border-width": 1,
            width: "data(size)",
            height: "data(size)",
            "border-width": (el: any) => (el.data("isCurrent") ? 3 : 1.5),
            "border-color": (el: any) => (el.data("isCurrent") ? "#ffffff" : "#0a1520"),
            shape: (el: any) => (el.data("type") === "Person" ? "ellipse" : el.data("type") === "Organization" ? "round-rectangle" : "diamond"),
          },
        },
        {
          selector: "edge",
          style: {
            "line-color": "data(edgeColor)",
            "target-arrow-color": "data(edgeColor)",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            width: (el: any) => (el.data("isFinancial") ? 2.2 : 1.4),
            label: "data(label)",
            "font-size": 8,
            color: "#7dd3fc",
            "text-background-color": "#060b11",
            "text-background-opacity": 0.9,
            "text-background-padding": "2px",
            "text-background-shape": "roundrectangle",
          },
        },
        {
          selector: ":selected",
          style: {
            "border-color": "#ffffff",
            "border-width": 3,
            "line-color": "#38bdf8",
            "target-arrow-color": "#38bdf8",
          },
        },
      ],
      layout: {
        name: "concentric",
        concentric: (node) => (node.data("isCurrent") ? 2 : 1),
        levelWidth: () => 1,
        padding: 30,
        animate: false,
      },
    });

    cy.on("tap", "node", (evt) => {
      setSelectedNeighbor(evt.target.data("raw") as GraphNode);
      setSelectedEdge(null);
    });

    cy.on("tap", "edge", (evt) => {
      setSelectedEdge(evt.target.data("raw") as GraphEdge);
      setSelectedNeighbor(null);
    });

    cyRef.current = cy;
    return () => cy.destroy();
  }, [neighborGraph, entityId]);

  const stats = useMemo(() => {
    if (!item) return { txTotal: 0, txCount: 0, commCount: 0, connectedCount: 0 };
    const txTotal = item.transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const txCount = item.transactions.length;
    const commCount = item.communications.length;
    const connectedSet = new Set<string>();
    item.transactions.forEach((t) => {
      connectedSet.add(String(t.sender_id));
      connectedSet.add(String(t.receiver_id));
    });
    item.communications.forEach((c) => {
      connectedSet.add(String(c.caller_id));
      connectedSet.add(String(c.receiver_id));
    });
    connectedSet.delete(String(item.source_id));
    return { txTotal, txCount, commCount, connectedCount: Math.max(connectedSet.size, (neighborGraph?.nodes.length ?? 1) - 1) };
  }, [item, neighborGraph]);

  if (error) return <ErrorState label="Unable to load entity intelligence profile." retry={load} />;
  if (!item) return <LoadingState label="Loading entity intelligence dossier..." />;

  const priorityScore = item.priority?.score ?? 0;
  const severity = getPrioritySeverity(priorityScore);
  const components = item.priority?.components ?? {};

  return (
    <section className="page">
      {/* 1. TOP COMMAND BREADCRUMB */}
      <div className="breadcrumbs">
        <Link to="/cases">Cases</Link>
        <span>/</span>
        <Link to={`/cases/${item.case_id}`}>{caseSummary?.case_number ?? `CASE-${String(item.case_id).padStart(3, "0")}`}</Link>
        <span>/</span>
        <Link to="/entities">Entity Registry</Link>
        <span>/</span>
        <span style={{ color: "#f8fafc", fontWeight: 600 }}>{item.name} ({item.id})</span>
      </div>

      {/* 2. ENTITY IDENTITY HERO BANNER */}
      <div
        className="veil-panel"
        style={{
          border: "1px solid #1c364d",
          background: "linear-gradient(180deg, #0a141f 0%, #060c12 100%)",
          padding: "20px 24px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span className="status-pill NORMAL" style={{ display: "inline-flex", gap: "6px" }}>
                {getEntityIcon(item.type)}
                <span>{item.type}</span>
              </span>
              <span style={{ fontFamily: "ui-monospace, monospace", fontSize: "11px", color: "#38bdf8", background: "rgba(56,189,248,0.1)", padding: "2px 6px", borderRadius: "3px", border: "1px solid rgba(56,189,248,0.25)" }}>
                ID: {item.id}
              </span>
              <span style={{ fontFamily: "ui-monospace, monospace", fontSize: "11px", color: "#8fa8b7", background: "#0c1722", padding: "2px 6px", borderRadius: "3px" }}>
                SOURCE_REF #{item.source_id}
              </span>
              {item.priority && (
                <span className={`status-pill ${severity}`}>
                  INVESTIGATION PRIORITY: {severity}
                </span>
              )}
            </div>

            <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#f8fafc", margin: "4px 0 8px 0", letterSpacing: "-0.01em" }}>
              {item.name}
            </h1>

            {item.aliases && item.aliases.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                <span style={{ fontSize: "11px", color: "#6a8696", textTransform: "uppercase", fontWeight: 600 }}>Known Aliases:</span>
                {item.aliases.map((alias) => (
                  <span key={alias} style={{ fontSize: "11px", background: "#0e1a26", color: "#9fc3d6", padding: "1px 6px", borderRadius: "3px", border: "1px solid #182e42" }}>
                    &ldquo;{alias}&rdquo;
                  </span>
                ))}
              </div>
            )}

            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", fontSize: "12px", color: "#8fa8b7", marginTop: "6px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <Phone size={13} className="text-cyber-cyan" />
                <span>{item.phone ?? "No recorded phone"}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <Mail size={13} className="text-cyber-indigo" />
                <span>{item.email ?? "No recorded email"}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <MapPin size={13} className="text-pink-400" />
                <span>{item.address ?? "No registered address"}</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "10px" }}>
            <div className="quick-links">
              <Link className="veil-button" to={`/network?focus=${item.id}`}>
                <Network size={14} /> Full Network Graph
              </Link>
              <Link className="veil-button secondary" to={`/timeline?entity=${item.source_id}`}>
                <Calendar size={14} /> Timeline
              </Link>
              <Link className="veil-button secondary" to={`/map?entity=${item.source_id}`}>
                <MapPin size={14} /> Map
              </Link>
            </div>

            <div style={{ display: "flex", gap: "8px", fontSize: "11px", color: "#6a8696", fontFamily: "ui-monospace, monospace" }}>
              <span>CASE: {caseSummary?.case_number ?? `C${String(item.case_id).padStart(3, "0")}`}</span>
              <span>·</span>
              <span>VERIFIED FORENSIC RECORD</span>
            </div>
          </div>
        </div>

        {/* High-level Counters Bar */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "10px",
            marginTop: "18px",
            paddingTop: "14px",
            borderTop: "1px solid #132434",
          }}
        >
          <div className="metric" style={{ minHeight: "68px", padding: "10px 14px", background: "#081018" }}>
            <span>Connected Entities</span>
            <strong style={{ fontSize: "20px" }}>{stats.connectedCount}</strong>
          </div>
          <div className="metric" style={{ minHeight: "68px", padding: "10px 14px", background: "#081018" }}>
            <span>Financial Volume</span>
            <strong style={{ fontSize: "20px", color: "#34d399" }}>
              ₹{stats.txTotal >= 100000 ? `${(stats.txTotal / 100000).toFixed(2)}L` : stats.txTotal.toLocaleString()}
            </strong>
          </div>
          <div className="metric" style={{ minHeight: "68px", padding: "10px 14px", background: "#081018" }}>
            <span>Transactions</span>
            <strong style={{ fontSize: "20px" }}>{stats.txCount}</strong>
          </div>
          <div className="metric" style={{ minHeight: "68px", padding: "10px 14px", background: "#081018" }}>
            <span>CDR Communications</span>
            <strong style={{ fontSize: "20px" }}>{stats.commCount}</strong>
          </div>
          <div className="metric" style={{ minHeight: "68px", padding: "10px 14px", background: "#081018" }}>
            <span>Linked Evidence</span>
            <strong style={{ fontSize: "20px" }}>{evidenceList.length}</strong>
          </div>
        </div>
      </div>

      {/* 3. INVESTIGATION PRIORITY & NETWORK ANALYTICS */}
      <div className="veil-grid-2">
        {/* Left: Investigation Priority Module */}
        <section className="veil-panel">
          <div className="panel-head">
            <h2>
              <ShieldAlert size={14} style={{ display: "inline", marginRight: "6px", verticalAlign: "middle" }} className="text-cyber-amber" />
              Investigation Priority
            </h2>
            {item.priority && (
              <span className={`status-pill ${severity}`}>
                {item.priority.score.toFixed(0)} / 100
              </span>
            )}
          </div>

          <div className="panel-body">
            {item.priority ? (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <div>
                    <span style={{ fontSize: "11px", color: "#6a8696", textTransform: "uppercase", fontWeight: 600 }}>Triage Severity</span>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: severity === "CRITICAL" ? "#f87171" : severity === "HIGH" ? "#fbbf24" : "#38bdf8", marginTop: "2px" }}>
                      {severity} REVIEW LEVEL
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "11px", color: "#6a8696", textTransform: "uppercase", fontWeight: 600 }}>Data Sufficiency</span>
                    <div style={{ marginTop: "2px" }}>
                      <span className="status-pill NORMAL">{item.priority.data_sufficiency}</span>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <span style={{ fontSize: "11px", color: "#6a8696", textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: "8px" }}>
                    Analytical Component Breakdown
                  </span>
                  <div className="stack-list">
                    {Object.entries(components).map(([label, value]) => (
                      <div key={label}>
                        <div className="component-label">
                          <span>{label.replaceAll("_", " ")}</span>
                          <strong style={{ fontFamily: "ui-monospace, monospace" }}>{value.toFixed(0)}%</strong>
                        </div>
                        <div className="bar-track">
                          <div
                            className="bar-fill"
                            style={{
                              width: `${Math.min(100, Math.max(4, value))}%`,
                              background: value >= 70 ? "linear-gradient(90deg, #ef4444, #f87171)" : value >= 40 ? "linear-gradient(90deg, #f59e0b, #fbbf24)" : "linear-gradient(90deg, #0284c7, #38bdf8)",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {item.priority.explanations && item.priority.explanations.length > 0 && (
                  <div style={{ background: "#060c12", padding: "10px 12px", borderRadius: "4px", border: "1px solid #142434", marginBottom: "12px" }}>
                    <span style={{ fontSize: "10px", color: "#38bdf8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Detection Signals:
                    </span>
                    <ul style={{ margin: "4px 0 0 0", paddingLeft: "16px", fontSize: "11px", color: "#bad0dc" }}>
                      {item.priority.explanations.map((exp, idx) => (
                        <li key={idx}>{exp}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {item.priority.note && (
                  <p className="muted" style={{ fontSize: "11px", fontStyle: "italic" }}>
                    {item.priority.note}
                  </p>
                )}
              </div>
            ) : (
              <p className="muted" style={{ padding: "12px 0" }}>
                No prioritized review snapshot available for this entity. Recalculate case analytics to evaluate signals.
              </p>
            )}

            <div className="disclaimer" style={{ marginTop: "14px" }}>
              <strong style={{ color: "#38bdf8" }}>Legal Notice: </strong>
              Investigation Priority is a review-prioritization signal, NOT guilt probability.
            </div>
          </div>
        </section>

        {/* Right: Graph Centrality & Structural Position */}
        <section className="veil-panel">
          <div className="panel-head">
            <h2>
              <Network size={14} style={{ display: "inline", marginRight: "6px", verticalAlign: "middle" }} className="text-cyber-cyan" />
              Network Centrality Analytics
            </h2>
            <span style={{ fontSize: "11px", color: "#6a8696", fontFamily: "ui-monospace, monospace" }}>
              {graphCaseId}
            </span>
          </div>

          <div className="panel-body stack-list">
            <div className="stack-row" style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "10px" }}>
              <div>
                <strong style={{ color: "#edf4f7", fontSize: "12px" }}>Degree Centrality</strong>
                <p className="muted" style={{ fontSize: "11px" }}>Direct immediate linkages to counterparties & devices.</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <strong style={{ fontSize: "16px", color: "#38bdf8", fontFamily: "ui-monospace, monospace" }}>
                  {network.degree ? network.degree.score.toFixed(4) : "N/A"}
                </strong>
                <div style={{ fontSize: "10px", color: "#567082" }}>
                  Degree: {network.degree?.degree ?? "N/A"}
                </div>
              </div>
            </div>

            <div className="stack-row" style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "10px" }}>
              <div>
                <strong style={{ color: "#edf4f7", fontSize: "12px" }}>Betweenness Centrality</strong>
                <p className="muted" style={{ fontSize: "11px" }}>Frequency entity lies on the shortest path between sub-clusters (Bridge role).</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <strong style={{ fontSize: "16px", color: "#fbbf24", fontFamily: "ui-monospace, monospace" }}>
                  {network.betweenness ? network.betweenness.score.toFixed(4) : "N/A"}
                </strong>
                <div style={{ fontSize: "10px", color: "#567082" }}>
                  {network.betweenness && network.betweenness.score > 0.05 ? "Key Conduit" : "Standard"}
                </div>
              </div>
            </div>

            <div className="stack-row" style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "10px" }}>
              <div>
                <strong style={{ color: "#edf4f7", fontSize: "12px" }}>PageRank Influence</strong>
                <p className="muted" style={{ fontSize: "11px" }}>Recursive structural prestige derived from connections to other high-value nodes.</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <strong style={{ fontSize: "16px", color: "#34d399", fontFamily: "ui-monospace, monospace" }}>
                  {network.pagerank ? network.pagerank.score.toFixed(4) : "N/A"}
                </strong>
                <div style={{ fontSize: "10px", color: "#567082" }}>
                  Rank Score
                </div>
              </div>
            </div>

            {/* Behavioral Anomalies */}
            <div style={{ marginTop: "6px" }}>
              <span style={{ fontSize: "11px", color: "#6a8696", textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: "8px" }}>
                Observed Behavioral Anomalies ({item.anomalies.length})
              </span>
              {item.anomalies.length > 0 ? (
                <div className="stack-list">
                  {item.anomalies.map((anom, idx) => (
                    <div className="stack-row" key={`${anom.type}-${idx}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span style={{ fontWeight: 600, color: "#f8fafc", fontSize: "12px" }}>{anom.type.replaceAll("_", " ")}</span>
                        <small className="muted" style={{ display: "block" }}>Automated Behavioral Detector</small>
                      </div>
                      <span className={`status-pill ${anom.score >= 70 ? "CRITICAL" : anom.score >= 40 ? "HIGH" : "NORMAL"}`}>
                        {anom.score.toFixed(0)} / 100
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted" style={{ fontSize: "11px" }}>No anomalies flagged for this profile.</p>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* 4. INTERACTIVE NEIGHBORHOOD NETWORK GRAPH CENTERPIECE */}
      <section className="veil-panel">
        <div className="panel-head">
          <h2>
            <BrainCircuit size={15} style={{ display: "inline", marginRight: "6px", verticalAlign: "middle" }} className="text-cyber-cyan" />
            Entity Neighborhood & Direct Linkages ({neighborGraph?.nodes.length ?? 0} Nodes · {neighborGraph?.edges.length ?? 0} Links)
          </h2>
          <div className="quick-links">
            <label style={{ fontSize: "11px", color: "#718d9e", display: "flex", alignItems: "center", gap: "6px" }}>
              Depth:
              <select
                className="veil-select"
                style={{ height: "28px", padding: "0 6px", fontSize: "11px" }}
                value={depth}
                onChange={(e) => setDepth(Number(e.target.value))}
              >
                <option value={1}>1-hop (Direct)</option>
                <option value={2}>2-hop (Extended)</option>
              </select>
            </label>
            <div className="graph-toolbar">
              <button aria-label="Zoom in" onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 1.2)}><ZoomIn size={15} /></button>
              <button aria-label="Zoom out" onClick={() => cyRef.current?.zoom(cyRef.current.zoom() / 1.2)}><ZoomOut size={15} /></button>
              <button aria-label="Fit graph" onClick={() => cyRef.current?.fit(undefined, 30)}><Focus size={15} /></button>
              <button aria-label="Reset layout" onClick={() => cyRef.current?.layout({ name: "concentric", concentric: (n: any) => n.data("isCurrent") ? 2 : 1, levelWidth: () => 1, animate: true }).run()}><LocateFixed size={15} /></button>
            </div>
            <Link className="veil-button secondary" style={{ height: "28px", padding: "0 8px", fontSize: "11px" }} to={`/network?focus=${item.id}`}>
              Full Network Explorer
            </Link>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: selectedNeighbor || selectedEdge ? "1fr 300px" : "1fr", minHeight: "420px", position: "relative" }}>
          <div style={{ minHeight: "420px", position: "relative", background: "#060a0f" }}>
            <div ref={graphContainer} style={{ position: "absolute", inset: 0 }} />
            {graphLoading && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(5,8,12,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="veil-spinner" />
              </div>
            )}
            <div style={{ position: "absolute", left: "12px", bottom: "10px", display: "flex", gap: "8px", fontSize: "10px", color: "#6a8696" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#38bdf8" }} /> Focus Target
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#34d399" }} /> Financial Transfer
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#818cf8" }} /> CDR Call
              </span>
            </div>
          </div>

          {/* Side Inspector Drawer for clicked neighbor */}
          {(selectedNeighbor || selectedEdge) && (
            <div style={{ borderLeft: "1px solid #142434", background: "#080f17", padding: "16px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
              {selectedNeighbor ? (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="eyebrow" style={{ margin: 0 }}>Neighbor Inspector</span>
                    <button
                      className="veil-button secondary"
                      style={{ padding: "2px 6px", fontSize: "10px" }}
                      onClick={() => setSelectedNeighbor(null)}
                    >
                      Close
                    </button>
                  </div>
                  <div>
                    <span className="status-pill NORMAL">{selectedNeighbor.type}</span>
                    <h3 style={{ margin: "4px 0 2px 0", color: "#edf4f7", fontSize: "15px" }}>{selectedNeighbor.label}</h3>
                    <p style={{ fontFamily: "ui-monospace, monospace", fontSize: "11px", color: "#38bdf8", margin: 0 }}>ID: {selectedNeighbor.id}</p>
                  </div>

                  {selectedNeighbor.properties && Object.keys(selectedNeighbor.properties).length > 0 && (
                    <div style={{ background: "#060b11", padding: "8px", borderRadius: "4px", border: "1px solid #101c27" }}>
                      <span style={{ fontSize: "10px", color: "#6a8696", textTransform: "uppercase" }}>Known Attributes</span>
                      <pre style={{ margin: "4px 0 0 0", fontSize: "10px", color: "#8faec0", whiteSpace: "pre-wrap" }}>
                        {JSON.stringify(selectedNeighbor.properties, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedNeighbor.id !== item.id && (
                    <Link className="veil-button" style={{ marginTop: "auto" }} to={`/entities/${selectedNeighbor.id}`}>
                      Inspect Profile ({selectedNeighbor.id})
                    </Link>
                  )}
                </>
              ) : selectedEdge ? (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="eyebrow" style={{ margin: 0 }}>Relationship Inspector</span>
                    <button
                      className="veil-button secondary"
                      style={{ padding: "2px 6px", fontSize: "10px" }}
                      onClick={() => setSelectedEdge(null)}
                    >
                      Close
                    </button>
                  </div>
                  <div>
                    <span className="status-pill HIGH">{selectedEdge.type}</span>
                    <h3 style={{ margin: "6px 0", color: "#edf4f7", fontSize: "13px", fontFamily: "ui-monospace, monospace" }}>
                      {selectedEdge.source} &rarr; {selectedEdge.target}
                    </h3>
                  </div>

                  <div style={{ background: "#060b11", padding: "8px", borderRadius: "4px", border: "1px solid #101c27" }}>
                    <span style={{ fontSize: "10px", color: "#6a8696", textTransform: "uppercase" }}>Link Parameters</span>
                    <pre style={{ margin: "4px 0 0 0", fontSize: "10px", color: "#8faec0", whiteSpace: "pre-wrap" }}>
                      {JSON.stringify(selectedEdge.properties, null, 2)}
                    </pre>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>
      </section>

      {/* 5. TABBED ACTIVITY & FORENSIC LOGS (TRANSACTIONS / COMMS / EVIDENCE) */}
      <section className="veil-panel">
        <div className="panel-head" style={{ padding: 0 }}>
          <div style={{ display: "flex", width: "100%", overflowX: "auto" }}>
            <button
              onClick={() => setActiveTab("transactions")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                padding: "0 18px",
                height: "44px",
                border: 0,
                borderBottom: activeTab === "transactions" ? "2px solid #38bdf8" : "2px solid transparent",
                background: activeTab === "transactions" ? "#0f1a26" : "transparent",
                color: activeTab === "transactions" ? "#38bdf8" : "#718d9e",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "12px",
                whiteSpace: "nowrap",
              }}
            >
              <CreditCard size={14} />
              <span>Financial Ledger ({item.transactions.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("communications")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                padding: "0 18px",
                height: "44px",
                border: 0,
                borderBottom: activeTab === "communications" ? "2px solid #38bdf8" : "2px solid transparent",
                background: activeTab === "communications" ? "#0f1a26" : "transparent",
                color: activeTab === "communications" ? "#38bdf8" : "#718d9e",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "12px",
                whiteSpace: "nowrap",
              }}
            >
              <Radio size={14} />
              <span>CDR Communications ({item.communications.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("evidence")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                padding: "0 18px",
                height: "44px",
                border: 0,
                borderBottom: activeTab === "evidence" ? "2px solid #38bdf8" : "2px solid transparent",
                background: activeTab === "evidence" ? "#0f1a26" : "transparent",
                color: activeTab === "evidence" ? "#38bdf8" : "#718d9e",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "12px",
                whiteSpace: "nowrap",
              }}
            >
              <FileSearch size={14} />
              <span>Forensic Evidence ({evidenceList.length})</span>
            </button>
          </div>
        </div>

        {activeTab === "transactions" && (
          <div className="veil-table-wrap">
            {item.transactions.length > 0 ? (
              <table className="veil-table">
                <thead>
                  <tr>
                    <th>Direction</th>
                    <th>Timestamp</th>
                    <th>Counterparty</th>
                    <th>Type</th>
                    <th style={{ textAlign: "right" }}>Amount (INR)</th>
                  </tr>
                </thead>
                <tbody>
                  {item.transactions.map((tx) => {
                    const isSender = tx.sender_id === item.source_id;
                    const counterpartId = isSender ? `P${String(tx.receiver_id).padStart(3, "0")}` : `P${String(tx.sender_id).padStart(3, "0")}`;
                    return (
                      <tr key={tx.id}>
                        <td>
                          {isSender ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#f87171", fontSize: "11px", fontWeight: 700 }}>
                              <ArrowUpRight size={13} /> OUTFLOW
                            </span>
                          ) : (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#34d399", fontSize: "11px", fontWeight: 700 }}>
                              <ArrowDownLeft size={13} /> INFLOW
                            </span>
                          )}
                        </td>
                        <td style={{ fontFamily: "ui-monospace, monospace" }}>
                          {new Date(tx.timestamp).toLocaleString()}
                        </td>
                        <td>
                          <Link to={`/entities/${counterpartId}`}>
                            {isSender ? `${item.id} → ${counterpartId}` : `${counterpartId} → ${item.id}`}
                          </Link>
                        </td>
                        <td>
                          <span className="status-pill NORMAL">{tx.type || "TRANSFER"}</span>
                        </td>
                        <td style={{ textAlign: "right", fontFamily: "ui-monospace, monospace", fontWeight: 700, color: isSender ? "#f87171" : "#34d399" }}>
                          {isSender ? "-" : "+"}₹{Number(tx.amount).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="panel-body muted">No transaction records observed for this entity.</div>
            )}
          </div>
        )}

        {activeTab === "communications" && (
          <div className="veil-table-wrap">
            {item.communications.length > 0 ? (
              <table className="veil-table">
                <thead>
                  <tr>
                    <th>Channel</th>
                    <th>Timestamp</th>
                    <th>Call Flow</th>
                    <th>Duration</th>
                    <th>Protocol</th>
                  </tr>
                </thead>
                <tbody>
                  {item.communications.map((comm) => {
                    const isCaller = comm.caller_id === item.source_id;
                    const counterId = isCaller ? `P${String(comm.receiver_id).padStart(3, "0")}` : `P${String(comm.caller_id).padStart(3, "0")}`;
                    const mins = Math.floor(comm.duration_seconds / 60);
                    const secs = comm.duration_seconds % 60;
                    return (
                      <tr key={comm.id}>
                        <td>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#38bdf8", fontSize: "11px", fontWeight: 700 }}>
                            <Phone size={12} /> {isCaller ? "OUTGOING" : "INCOMING"}
                          </span>
                        </td>
                        <td style={{ fontFamily: "ui-monospace, monospace" }}>
                          {new Date(comm.timestamp).toLocaleString()}
                        </td>
                        <td>
                          <Link to={`/entities/${counterId}`}>
                            {isCaller ? `${item.id} → ${counterId}` : `${counterId} → ${item.id}`}
                          </Link>
                        </td>
                        <td style={{ fontFamily: "ui-monospace, monospace" }}>
                          {mins > 0 ? `${mins}m ${secs}s` : `${secs}s`}
                        </td>
                        <td>
                          <span className="status-pill LOW">{comm.type || "VOICE_CALL"}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="panel-body muted">No CDR communication records observed for this entity.</div>
            )}
          </div>
        )}

        {activeTab === "evidence" && (
          <div className="panel-body stack-list">
            {evidenceList.length > 0 ? (
              evidenceList.map((ev) => (
                <div key={ev.id} className="stack-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span className="status-pill HIGH">{ev.type}</span>
                      <strong style={{ color: "#edf4f7", fontSize: "12px" }}>
                        {ev.document_name ?? "Direct Forensic Record"}
                      </strong>
                      <span style={{ fontSize: "10px", color: "#6a8696" }}>
                        Source Ref: {ev.source_reference ?? "N/A"}
                      </span>
                    </div>
                    <p style={{ margin: "4px 0 0 0", color: "# bad0dc", fontSize: "12px" }}>{ev.content}</p>
                    <small className="muted" style={{ fontSize: "10px" }}>
                      Recorded: {new Date(ev.created_at).toLocaleString()}
                    </small>
                  </div>
                  <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <span className="status-pill NORMAL">
                      {Math.round(ev.confidence * 100)}% CONFIDENCE
                    </span>
                    {ev.document_id && (
                      <div style={{ marginTop: "6px" }}>
                        <Link className="veil-button secondary" style={{ fontSize: "10px", padding: "2px 6px" }} to={`/documents/${ev.document_id}`}>
                          View Source Doc
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="muted">No direct evidence provenance records indexed for this entity ID.</p>
            )}
          </div>
        )}
      </section>
    </section>
  );
}
