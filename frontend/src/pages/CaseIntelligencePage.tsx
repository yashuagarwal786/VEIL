import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BrainCircuit, FileText, GitBranch, ShieldAlert } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "../components/AsyncState";
import { useAuth } from "../context/AuthContext";
import { useCaseContext } from "../context/CaseContext";
import { getAlerts, getAnalyticsOverview, getCaseDetail, getCaseGraph, getEvidence, getTimeline } from "../services/api";
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
    ]).then(([caseItem, graph, evidence, timeline, alerts, overview]) => {
      setCaseId(id);
      setState({ caseItem, graph, evidence, timeline, alerts, overview });
      recordAudit({ action: "VIEW_INTELLIGENCE", target_type: "CASE", target_id: caseItem.case_number, summary: `Opened intelligence dossier for ${caseItem.case_number}.` });
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to load case intelligence."));
  }, [id, setCaseId]);

  useEffect(load, [load]);

  const intelligence = useMemo(() => {
    if (!state) return null;
    const topAlert = [...state.alerts].sort((a, b) => b.score - a.score)[0];
    const confidence = state.evidence.length ? Math.round((state.evidence.reduce((sum, item) => sum + item.confidence, 0) / state.evidence.length) * 100) : 0;
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

  if (error) return <ErrorState label="Unable to load case intelligence." detail={error} retry={load} />;
  if (!state || !intelligence) return <LoadingState label="Loading case intelligence..." />;

  const previewNodes = state.graph.nodes.slice(0, 10);
  const positions = new Map(previewNodes.map((node, index) => [node.id, nodePosition(index, previewNodes.length)]));
  const previewEdges = state.graph.edges.filter((edge) => positions.has(edge.source) && positions.has(edge.target)).slice(0, 16);

  function createReport() {
    if (!state || !intelligence) return;
    const content = [
      `Case: ${state.caseItem.case_number} - ${state.caseItem.title}`,
      `Investigator: ${investigator?.name} (${investigator?.id})`,
      `Risk: ${state.caseItem.risk_level} / priority ${state.caseItem.priority_score}`,
      `Primary finding: ${intelligence.primaryFinding}`,
      `Evidence reviewed: ${state.evidence.length}`,
      `Timeline events reviewed: ${state.timeline.length}`,
      `Network: ${state.graph.nodes.length} entities, ${state.graph.edges.length} relationships`,
      "Recommendation: Treat this report as investigative triage until source evidence is independently verified.",
    ].join("\n");
    const saved = generateReport({
      case_id: state.caseItem.id,
      case_number: state.caseItem.case_number,
      title: `${state.caseItem.case_number} Intelligence Report`,
      content,
    });
    if (saved) setReport(saved.content);
  }

  return (
    <section className="page intelligence-page">
      <div className="breadcrumbs"><Link to="/cases">Cases</Link><span>/</span><Link to={`/cases/${id}`}>{state.caseItem.title}</Link><span>/</span><span>Intelligence</span></div>
      <header className="page-header">
        <div>
          <p className="eyebrow">{state.caseItem.case_number} - post-analysis intelligence</p>
          <h1>{state.caseItem.title}</h1>
          <p className="muted">Assigned to {state.caseItem.assigned_investigator?.name ?? "Unassigned"} - generated for {investigator?.role_label}</p>
        </div>
        <div className="quick-links"><button className="veil-button" onClick={createReport}><FileText size={15} /> Generate report</button><Link className="veil-button secondary" to="/network"><GitBranch size={15} /> Open graph</Link></div>
      </header>

      <div className="metric-grid">
        <div className="metric"><span>Risk level</span><strong>{state.caseItem.risk_level}</strong></div>
        <div className="metric"><span>Priority</span><strong>{state.caseItem.priority_score ?? 0}</strong></div>
        <div className="metric"><span>Entities</span><strong>{state.graph.nodes.length}</strong></div>
        <div className="metric"><span>Relationships</span><strong>{state.graph.edges.length}</strong></div>
        <div className="metric"><span>Evidence</span><strong>{state.evidence.length}</strong></div>
      </div>

      <div className="veil-grid-2">
        <section className="veil-panel">
          <div className="panel-head"><h2><BrainCircuit size={15} /> Intelligence findings</h2><span className={`status-pill ${state.caseItem.risk_level}`}>{intelligence.confidence}% evidence confidence</span></div>
          <div className="panel-body stack-list">
            <div className="stack-row"><strong>Primary finding</strong><p>{intelligence.primaryFinding}</p></div>
            <div className="stack-row"><strong>Behavioral signals</strong><p>{state.overview.total_anomalies} anomalies, {state.overview.high_severity_alerts} high-severity alerts, {state.overview.geographic_deviations} geographic deviations.</p></div>
            <div className="stack-row"><strong>Recommended next steps</strong>{intelligence.nextSteps.map((step) => <p key={step} className="muted">{step}</p>)}</div>
          </div>
        </section>

        <section className="veil-panel">
          <div className="panel-head"><h2><ShieldAlert size={15} /> Priority alerts</h2><Link to="/alerts">Review alerts</Link></div>
          <div className="panel-body stack-list">
            {state.alerts.slice(0, 5).map((alert) => <div className="stack-row" key={alert.id}><span className={`status-pill ${alert.severity}`}>{alert.severity}</span> {alert.title}<small className="muted"> Score {alert.score.toFixed(0)} - {alert.status}</small></div>)}
            {!state.alerts.length ? <p className="muted">No alerts generated for this case yet.</p> : null}
          </div>
        </section>
      </div>

      <section className="veil-panel">
        <div className="panel-head"><h2>Central network graph</h2><span className="muted">{graphCaseId(id)}</span></div>
        <div className="panel-body">
          {previewNodes.length ? (
            <svg className="intelligence-graph" viewBox="0 0 360 340" role="img" aria-label="Case relationship graph preview">
              {previewEdges.map((edge) => {
                const source = positions.get(edge.source);
                const target = positions.get(edge.target);
                if (!source || !target) return null;
                return <line key={edge.id} x1={source.x} y1={source.y} x2={target.x} y2={target.y} />;
              })}
              {previewNodes.map((node) => {
                const point = positions.get(node.id)!;
                return <g key={node.id} transform={`translate(${point.x} ${point.y})`}><circle r="19" /><text y="4">{node.id}</text><title>{node.label} - {node.type}</title></g>;
              })}
            </svg>
          ) : <EmptyState label="No graph data found. Run the synthetic data seed with graph sync to populate this case." />}
        </div>
      </section>

      <div className="veil-grid-2">
        <section className="veil-panel">
          <div className="panel-head"><h2>Evidence provenance</h2><Link to="/evidence">Open evidence</Link></div>
          <div className="panel-body stack-list">{state.evidence.slice(0, 8).map((item) => <div className="stack-row" key={item.id}><strong>{item.type}</strong><p>{item.content}</p><small className="muted">{item.document_name ?? "Direct record"} - {item.source_reference ?? "No source reference"} - {Math.round(item.confidence * 100)}%</small></div>)}</div>
        </section>
        <section className="veil-panel">
          <div className="panel-head"><h2>Timeline highlights</h2><Link to="/timeline">Open timeline</Link></div>
          <div className="panel-body stack-list">{state.timeline.slice(0, 8).map((item) => <div className="stack-row" key={item.id}><span className={`status-pill ${item.severity}`}>{item.type}</span> {item.title}<small className="muted">{new Date(item.timestamp).toLocaleString()} - {item.summary}</small></div>)}</div>
        </section>
      </div>

      {report ? <section className="veil-panel"><div className="panel-head"><h2>Generated report</h2><Link to="/profile">View account reports</Link></div><div className="panel-body"><pre>{report}</pre></div></section> : null}
      <p className="disclaimer">Synthetic demo data is fictional and is used only to demonstrate VEIL workflows. Findings are investigative leads, not legal conclusions.</p>
    </section>
  );
}
