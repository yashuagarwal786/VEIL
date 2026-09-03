import { useCallback, useEffect, useState } from "react";
import { BrainCircuit, FileText, Network, UploadCloud } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/AsyncState";
import { useAuth } from "../context/AuthContext";
import { useCaseContext } from "../context/CaseContext";
import { getAlerts, getCaseActivity, getCaseDetail, getCaseSources, processCaseSource, uploadCaseSource } from "../services/api";
import type { AlertItem } from "../types/analytics";
import type { CaseDataSource, CaseSummary, ProcessingActivity } from "../types/workspace";

export function CaseOverviewPage() {
  const { caseId: routeId } = useParams();
  const id = Number(routeId) || 1;
  const { recordAudit } = useAuth();
  const { setCaseId } = useCaseContext();
  const [item, setItem] = useState<CaseSummary | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [sources, setSources] = useState<CaseDataSource[]>([]);
  const [activity, setActivity] = useState<ProcessingActivity[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("FIR_REPORT");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(false);
  const load = useCallback(() => {
    setError(false);
    Promise.all([getCaseDetail(id), getAlerts(id), getCaseSources(id), getCaseActivity(id)]).then(([caseItem, items, sourceRows, events]) => {
      setItem(caseItem);
      setAlerts(items);
      setSources(sourceRows);
      setActivity(events);
      setCaseId(id);
      recordAudit({ action: "VIEW_CASE", target_type: "CASE", target_id: caseItem.case_number, summary: `Viewed case overview for ${caseItem.case_number}.` });
    }).catch(() => setError(true));
  }, [id, setCaseId]);

  useEffect(load, [load]);

  if (error) return <ErrorState label="Unable to load case overview." retry={load} />;
  if (!item) return <LoadingState />;

  async function uploadSource() {
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadCaseSource(id, file, category, description);
      await processCaseSource(result.source.id);
      setFile(null);
      setDescription("");
      load();
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="page">
      <div className="breadcrumbs"><Link to="/cases">Cases</Link><span>/</span><span>{item.title}</span></div>
      <header className="page-header">
        <div>
          <p className="eyebrow">{item.case_number}</p>
          <h1>{item.title}</h1>
          <p className="muted">{item.description}</p>
        </div>
        <span className={`status-pill ${item.status}`}>{item.status}</span>
      </header>
      <div className="metric-grid">
        {Object.entries(item.metrics ?? {}).map(([label, value]) => <div className="metric" key={label}><span>{label}</span><strong>{value}</strong></div>)}
        <div className="metric"><span>Priority</span><strong>{item.priority_score ?? 0}</strong></div>
      </div>
      <div className="veil-grid-2">
        <section className="veil-panel">
          <div className="panel-head"><h2>Investigation ownership</h2></div>
          <div className="panel-body">
            <dl className="detail-list">
              <dt>Assigned investigator</dt><dd>{item.assigned_investigator?.name ?? "Unassigned"}</dd>
              <dt>Role</dt><dd>{item.assigned_investigator?.role ?? "N/A"}</dd>
              <dt>Created by</dt><dd>{item.created_by?.name ?? "N/A"}</dd>
              <dt>Last modified by</dt><dd>{item.last_modified_by?.name ?? "N/A"}</dd>
              <dt>Risk level</dt><dd><span className={`status-pill ${item.risk_level}`}>{item.risk_level}</span></dd>
            </dl>
          </div>
        </section>
        <section className="veil-panel">
          <div className="panel-head"><h2>Investigation paths</h2></div>
          <div className="panel-body quick-links">
            <Link className="veil-button" to={`/cases/${id}/intelligence`}><BrainCircuit size={15} /> Intelligence dossier</Link>
            <Link className="veil-button secondary" to="/network"><Network size={15} /> Explore network</Link>
            <Link className="veil-button secondary" to="/timeline">View timeline</Link>
            <Link className="veil-button secondary" to="/documents"><FileText size={15} /> View documents</Link>
          </div>
        </section>
      </div>
      <div className="veil-grid-2">
        <section className="veil-panel">
          <div className="panel-head"><h2>Data sources</h2><span className="muted">{sources.length} sources</span></div>
          <div className="panel-body stack-list">
            {sources.map((source) => (
              <div className="stack-row" key={source.id}>
                <strong>{source.filename}</strong>
                <small className="muted">{source.data_category} - {source.processing_status} - {source.entities} entities - {source.relationships} relationships - {source.review_required} review</small>
                {source.processing_error ? <p className="veil-error">{source.processing_error}</p> : null}
                <div className="quick-links"><Link className="veil-button secondary" to={`/documents/${source.id}`}>View</Link><button className="veil-button secondary" onClick={() => processCaseSource(source.id).then(load)}>Reprocess</button></div>
              </div>
            ))}
            {!sources.length ? <p className="muted">No sources yet. Add FIR, CDR, financial, surveillance, or intelligence data for this case.</p> : null}
          </div>
        </section>
        <section className="veil-panel">
          <div className="panel-head"><h2><UploadCloud size={15} /> Add investigation data</h2></div>
          <div className="panel-body form-stack">
            <label>Data category<select className="veil-select" value={category} onChange={(event) => setCategory(event.target.value)}><option value="FIR_REPORT">FIR / Report</option><option value="CDR">Call Detail Records</option><option value="FINANCIAL">Financial</option><option value="SURVEILLANCE">Surveillance</option><option value="CRIMINAL_HISTORY">Criminal History</option><option value="INTELLIGENCE">Intelligence</option><option value="OTHER">Other</option></select></label>
            <label>Upload file<input className="veil-input" type="file" accept=".pdf,.txt,.csv,.json,.xlsx" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
            <label>Description<input className="veil-input" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Source reference, collection context, or intake note" /></label>
            <button className="veil-button" disabled={!file || uploading} onClick={uploadSource}>{uploading ? "Processing..." : "Upload and process"}</button>
          </div>
        </section>
      </div>
      <section className="veil-panel">
        <div className="panel-head"><h2>Processing activity</h2><span className="muted">{activity.length} events</span></div>
        <div className="panel-body stack-list">{activity.slice(0, 10).map((event) => <div className="stack-row" key={event.id}><span className="status-pill">{event.status}</span> {event.summary}<small className="muted">{new Date(event.created_at).toLocaleString()}</small></div>)}{!activity.length ? <p className="muted">No processing activity recorded yet.</p> : null}</div>
      </section>
      <section className="veil-panel">
        <div className="panel-head"><h2>Open analytical alerts</h2><Link to="/alerts">View all</Link></div>
        <div className="panel-body stack-list">
          {alerts.filter((row) => row.status === "OPEN").slice(0, 6).map((row) => (
            <div className="stack-row" key={row.id}>
              <span className={`status-pill ${row.severity}`}>{row.severity}</span> {row.title}
              <small className="muted"> Entity P{String(row.entity_id ?? 0).padStart(3, "0")} - {row.score.toFixed(0)}/100</small>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
