import {
  BrainCircuit,
  FileCheck,
  FileText,
  GitBranch,
  Network,
  Shield,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState } from "../components/AsyncState";
import { useAuth } from "../context/AuthContext";
import { useCaseContext } from "../context/CaseContext";
import {
  getAlerts,
  getAnalyticsOverview,
  getCaseDetail,
  getCaseGraph,
  getEvidence,
  getTimeline,
} from "../services/api";
import type { AlertItem, AnalyticsOverview } from "../types/analytics";
import type { GraphResponse } from "../types/graph";
import type { CaseSummary, EvidenceItem, TimelineEvent } from "../types/workspace";

type IntelligenceState = {
  caseItem: CaseSummary;
  graph: GraphResponse;
  evidence: EvidenceItem[];
  timeline: TimelineEvent[];
  alerts: AlertItem[];
  overview: AnalyticsOverview;
};

function graphCaseId(caseId: number) {
  return `C${String(caseId).padStart(3, "0")}`;
}

function nodePosition(index: number, total: number) {
  const radius = 135;
  const angle = (index / Math.max(total, 1)) * Math.PI * 2 - Math.PI / 2;
  return { x: 180 + Math.cos(angle) * radius, y: 170 + Math.sin(angle) * radius };
}

export function CaseIntelligencePage() {
  const { caseId: routeId } = useParams();
  const id = Number(routeId) || 1;
  const { investigator, generateReport, recordAudit } = useAuth();
  const { setCaseId } = useCaseContext();
  const [state, setState] = useState<IntelligenceState | null>(null);
  const [report, setReport] = useState<string>("");
  const [reportGenerated, setReportGenerated] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setError("");
    Promise.all([
      getCaseDetail(id),
      getCaseGraph(graphCaseId(id)),
      getEvidence(id, "", 0),
      getTimeline(id),
      getAlerts(id),
      getAnalyticsOverview(id),
    ])
      .then(([caseItem, graph, evidence, timeline, alerts, overview]) => {
        setCaseId(id);
        setState({ caseItem, graph, evidence, timeline, alerts, overview });
        recordAudit({
          action: "VIEW_INTELLIGENCE",
          target_type: "CASE",
          target_id: caseItem.case_number,
          summary: `Opened intelligence dossier for ${caseItem.case_number}.`,
        });
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to load case intelligence."));
  }, [id, setCaseId]);

  useEffect(load, [load]);

  const intelligence = useMemo(() => {
    if (!state) return null;
    const topAlert = [...state.alerts].sort((a, b) => b.score - a.score)[0];
    const confidence = state.evidence.length
      ? Math.round((state.evidence.reduce((sum, item) => sum + item.confidence, 0) / state.evidence.length) * 100)
      : 0;
    const primaryFinding = topAlert
      ? `${topAlert.title} is the highest scoring open signal at ${topAlert.score.toFixed(0)}/100.`
      : state.graph.edges.length
        ? `The case graph contains ${state.graph.nodes.length} entities and ${state.graph.edges.length} observed relationships.`
        : "No intelligence graph has been synchronized for this case yet.";
    const nextSteps = [
      "Review high-confidence evidence before operational decisions.",
      "Inspect bridge entities and relationship provenance in the network explorer.",
      "Confirm extracted entities before promoting findings into a final report.",
    ];
    return { topAlert, confidence, primaryFinding, nextSteps };
  }, [state]);

  if (error) return <ErrorState label="Unable to load case intelligence dossier." detail={error} retry={load} />;
  if (!state || !intelligence) return <LoadingState label="Synthesizing intelligence dossier..." />;

  const previewNodes = state.graph.nodes.slice(0, 10);
  const positions = new Map(previewNodes.map((node, index) => [node.id, nodePosition(index, previewNodes.length)]));
  const previewEdges = state.graph.edges.filter((edge) => positions.has(edge.source) && positions.has(edge.target)).slice(0, 16);

  function createReport() {
    if (!state || !intelligence) return;
    const content = [
      `=======================================================`,
      `VEIL INTELLIGENCE DOSSIER // OFFICIAL FORENSIC REPORT`,
      `=======================================================`,
      `Case: ${state.caseItem.case_number} - ${state.caseItem.title}`,
      `Lead Investigator: ${investigator?.name} (${investigator?.id})`,
      `Clearance Level: ${investigator?.clearance}`,
      `Risk Assessment: ${state.caseItem.risk_level} / Priority Score: ${state.caseItem.priority_score}`,
      `Timestamp: ${new Date().toISOString()}`,
      `-------------------------------------------------------`,
      `PRIMARY INTELLIGENCE FINDING:`,
      `${intelligence.primaryFinding}`,
      `-------------------------------------------------------`,
      `SUMMARY METRICS:`,
      `- Indexed Graph Entities: ${state.graph.nodes.length}`,
      `- Observed Forensic Linkages: ${state.graph.edges.length}`,
      `- Reviewed Evidence Items: ${state.evidence.length} (Mean Confidence: ${intelligence.confidence}%)`,
      `- Temporal Timeline Events: ${state.timeline.length}`,
      `- Open Behavioral Alerts: ${state.alerts.length}`,
      `-------------------------------------------------------`,
      `RECOMMENDED OPERATIONAL NEXT STEPS:`,
      ...intelligence.nextSteps.map((s, i) => `${i + 1}. ${s}`),
      `=======================================================`,
      `DISCLAIMER: Investigative triage lead for law enforcement use only.`,
    ].join("\n");

    const saved = generateReport({
      case_id: state.caseItem.id,
      case_number: state.caseItem.case_number,
      title: `${state.caseItem.case_number} Intelligence Report`,
      content,
    });
    if (saved) {
      setReport(saved.content);
      setReportGenerated(true);
    }
  }

  return (
    <section className="page intelligence-page">
      <div className="breadcrumbs">
        <Link to="/cases">Cases</Link>
        <span>/</span>
        <Link to={`/cases/${id}`}>{state.caseItem.title}</Link>
        <span>/</span>
        <span style={{ color: "#f8fafc", fontWeight: 600 }}>Intelligence Dossier</span>
      </div>

      <header className="page-header">
        <div>
          <p className="eyebrow">{state.caseItem.case_number} · Post-Analysis Forensic Dossier</p>
          <h1>{state.caseItem.title}</h1>
          <p className="muted">
            Assigned to {state.caseItem.assigned_investigator?.name ?? "Unassigned"} · Prepared for {investigator?.role_label}
          </p>
        </div>
        <div className="quick-links">
          <button className="veil-button" onClick={createReport}>
            <FileText size={14} /> Generate Official Intelligence Report
          </button>
          <Link
            className="veil-button secondary"
            to={`/network?case=${encodeURIComponent(state.caseItem.case_number)}&case_id=${state.caseItem.id}`}
          >
            <GitBranch size={14} /> Open Full Graph
          </Link>
        </div>
      </header>

      {/* Metric Cards */}
      <div className="metric-grid">
        <div className="metric">
          <span>Risk Level</span>
          <strong><span className={`status-pill ${state.caseItem.risk_level ?? "NORMAL"}`}>{state.caseItem.risk_level ?? "STANDARD"}</span></strong>
        </div>
        <div className="metric">
          <span>Priority Score</span>
          <strong style={{ color: "#38bdf8" }}>{state.caseItem.priority_score ?? 0}</strong>
        </div>
        <div className="metric">
          <span>Graph Entities</span>
          <strong style={{ color: "#34d399" }}>{state.graph.nodes.length}</strong>
        </div>
        <div className="metric">
          <span>Observed Links</span>
          <strong style={{ color: "#fbbf24" }}>{state.graph.edges.length}</strong>
        </div>
        <div className="metric">
          <span>Evidence Items</span>
          <strong style={{ color: "#a855f7" }}>{state.evidence.length}</strong>
        </div>
      </div>

      {/* Findings & Priority Alerts */}
      <div className="veil-grid-2">
        <section className="veil-panel">
          <div className="panel-head">
            <h2>
              <BrainCircuit size={14} style={{ display: "inline", marginRight: "6px", verticalAlign: "middle" }} className="text-cyber-cyan" />
              Automated Synthesis & Findings
            </h2>
            <span className="status-pill NORMAL">{intelligence.confidence}% Mean Evidence Confidence</span>
          </div>
          <div className="panel-body stack-list">
            <div className="stack-row">
              <strong style={{ color: "#38bdf8", display: "block", marginBottom: "4px" }}>Primary Algorithmic Finding</strong>
              <p style={{ margin: 0, fontSize: "13px", color: "#edf4f7" }}>{intelligence.primaryFinding}</p>
            </div>
            <div className="stack-row">
              <strong style={{ color: "#fbbf24", display: "block", marginBottom: "4px" }}>Behavioral Outlier Summary</strong>
              <p style={{ margin: 0, fontSize: "12px", color: "#bad0dc" }}>
                Detected {state.overview.total_anomalies} anomalies, {state.overview.high_severity_alerts} high-severity threat alerts, and {state.overview.geographic_deviations} geospatial deviations.
              </p>
            </div>
            <div className="stack-row">
              <strong style={{ color: "#34d399", display: "block", marginBottom: "4px" }}>Recommended Triage Steps</strong>
              <ul style={{ margin: "4px 0 0 0", paddingLeft: "16px", fontSize: "12px", color: "#8fa8b7" }}>
                {intelligence.nextSteps.map((step) => (
                  <li key={step} style={{ marginBottom: "2px" }}>{step}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="veil-panel">
          <div className="panel-head">
            <h2>
              <ShieldAlert size={14} style={{ display: "inline", marginRight: "6px", verticalAlign: "middle" }} className="text-cyber-amber" />
              Priority Alerts ({state.alerts.length})
            </h2>
            <Link to="/alerts">Alert Center &rarr;</Link>
          </div>
          <div className="panel-body stack-list">
            {state.alerts.slice(0, 5).map((alert) => (
              <div className="stack-row" key={alert.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span className={`status-pill ${alert.severity}`}>{alert.severity}</span>
                    <strong style={{ color: "#edf4f7", fontSize: "12px" }}>{alert.title}</strong>
                  </div>
                  <small className="muted" style={{ display: "block", fontSize: "10px", marginTop: "2px" }}>
                    Score {alert.score.toFixed(0)}/100 · Status: {alert.status}
                  </small>
                </div>
                <Link className="veil-button secondary" style={{ height: "24px", padding: "0 6px", fontSize: "10px" }} to={`/alerts?selected=${alert.id}`}>
                  Triage
                </Link>
              </div>
            ))}
            {!state.alerts.length ? <p className="muted">No alerts flagged for this case.</p> : null}
          </div>
        </section>
      </div>

      {/* SVG Topology Graph Preview */}
      <section className="veil-panel">
        <div className="panel-head">
          <h2>
            <Network size={14} style={{ display: "inline", marginRight: "6px", verticalAlign: "middle" }} className="text-cyber-cyan" />
            Central Case Topology ({graphCaseId(id)})
          </h2>
          <span className="muted" style={{ fontSize: "11px" }}>{state.graph.nodes.length} nodes · {state.graph.edges.length} edges</span>
        </div>
        <div className="panel-body" style={{ background: "#060a0f", padding: "12px" }}>
          {previewNodes.length ? (
            <svg className="intelligence-graph" viewBox="0 0 360 340" role="img" aria-label="Case topology preview">
              {previewEdges.map((edge) => {
                const source = positions.get(edge.source);
                const target = positions.get(edge.target);
                if (!source || !target) return null;
                return <line key={edge.id} x1={source.x} y1={source.y} x2={target.x} y2={target.y} />;
              })}
              {previewNodes.map((node) => {
                const point = positions.get(node.id)!;
                return (
                  <g key={node.id} transform={`translate(${point.x} ${point.y})`}>
                    <circle r="18" />
                    <text y="4">{node.id}</text>
                    <title>{node.label} - {node.type}</title>
                  </g>
                );
              })}
            </svg>
          ) : (
            <EmptyState label="No graph topology found for this case. Ingest case documents to generate the graph." />
          )}
        </div>
      </section>

      {/* Evidence Provenance & Timeline Highlights */}
      <div className="veil-grid-2">
        <section className="veil-panel">
          <div className="panel-head">
            <h2>Forensic Evidence Highlights</h2>
            <Link to="/evidence">Evidence Explorer &rarr;</Link>
          </div>
          <div className="panel-body stack-list">
            {state.evidence.slice(0, 6).map((item) => (
              <div className="stack-row" key={item.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ color: "#edf4f7", fontSize: "12px" }}>{item.type}</strong>
                  <span className="status-pill NORMAL">{Math.round(item.confidence * 100)}%</span>
                </div>
                <p style={{ margin: "4px 0", fontSize: "12px", color: "#bad0dc" }}>{item.content}</p>
                <small className="muted" style={{ fontSize: "10px" }}>
                  {item.document_name ?? "Direct Ingest"} · Ref: {item.source_reference ?? "N/A"}
                </small>
              </div>
            ))}
            {!state.evidence.length && <p className="muted">No evidence records indexed yet.</p>}
          </div>
        </section>

        <section className="veil-panel">
          <div className="panel-head">
            <h2>Timeline Highlights</h2>
            <Link to="/timeline">Timeline Explorer &rarr;</Link>
          </div>
          <div className="panel-body stack-list">
            {state.timeline.slice(0, 6).map((item) => (
              <div className="stack-row" key={item.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className={`status-pill ${item.severity}`}>{item.type}</span>
                  <small className="muted" style={{ fontFamily: "ui-monospace, monospace" }}>
                    {new Date(item.timestamp).toLocaleString()}
                  </small>
                </div>
                <strong style={{ color: "#edf4f7", fontSize: "12px", display: "block", marginTop: "2px" }}>
                  {item.title}
                </strong>
                <small className="muted" style={{ fontSize: "11px" }}>{item.summary}</small>
              </div>
            ))}
            {!state.timeline.length && <p className="muted">No temporal events recorded.</p>}
          </div>
        </section>
      </div>

      {/* Generated Official Report Panel */}
      {report && (
        <section className="veil-panel" style={{ border: "1px solid #10b981", background: "#061511" }}>
          <div className="panel-head" style={{ borderBottomColor: "#133b30" }}>
            <h2>
              <FileCheck size={14} style={{ display: "inline", marginRight: "6px", verticalAlign: "middle" }} className="text-cyber-teal" />
              Generated Intelligence Report ({state.caseItem.case_number})
            </h2>
            <Link to="/profile">View Stored Reports in Profile &rarr;</Link>
          </div>
          <div className="panel-body">
            <pre style={{ margin: 0, fontSize: "11px", color: "#d1fae5", background: "#040d0b", padding: "16px", borderRadius: "4px", border: "1px solid #0f2e26" }}>
              {report}
            </pre>
          </div>
        </section>
      )}
    </section>
  );
}
