import {
  BrainCircuit,
  CheckCircle2,
  Clock,
  FileSearch,
  FileText,
  Network,
  Shield,
  ShieldAlert,
  UploadCloud,
  UserCheck,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/AsyncState";
import { useAuth } from "../context/AuthContext";
import { useCaseContext } from "../context/CaseContext";
import {
  getAlerts,
  getCaseActivity,
  getCaseDetail,
  getCaseSources,
  processCaseSource,
  uploadCaseSource,
} from "../services/api";
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
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    Promise.all([getCaseDetail(id), getAlerts(id), getCaseSources(id), getCaseActivity(id)])
      .then(([caseItem, items, sourceRows, events]) => {
        setItem(caseItem);
        setAlerts(items);
        setSources(sourceRows);
        setActivity(events);
        setCaseId(id);
        recordAudit({
          action: "VIEW_CASE",
          target_type: "CASE",
          target_id: caseItem.case_number,
          summary: `Viewed case overview for ${caseItem.case_number}.`,
        });
      })
      .catch(() => setError(true));
  }, [id, setCaseId]);

  useEffect(load, [load]);

  async function uploadSource() {
    if (!file) return;
    setUploading(true);
    setUploadSuccess(null);
    try {
      const result = await uploadCaseSource(id, file, category, description);
      const processed = await processCaseSource(result.source.id);
      setFile(null);
      setDescription("");
      load();
      setUploadSuccess(
        `Successfully ingested ${file.name}. Extracted ${(processed as any)?.processing?.entities_found ?? "new"} entities and updated Neo4j Knowledge Graph.`,
      );
    } catch {
      setError(true);
    } finally {
      setUploading(false);
    }
  }

  if (error) return <ErrorState label="Unable to load case dossier." retry={load} />;
  if (!item) return <LoadingState label="Loading case intelligence..." />;

  return (
    <section className="page">
      <div className="breadcrumbs">
        <Link to="/cases">Cases</Link>
        <span>/</span>
        <span style={{ color: "#f8fafc", fontWeight: 600 }}>{item.case_number}</span>
      </div>

      <header className="page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span className="eyebrow" style={{ margin: 0 }}>{item.case_number}</span>
            <span className={`status-pill ${item.risk_level ?? "NORMAL"}`}>
              RISK: {item.priority_score ?? 0} / 100
            </span>
          </div>
          <h1>{item.title}</h1>
          <p className="muted">{item.description || "No specific background description recorded."}</p>
        </div>
        <div className="quick-links">
          <Link
            className="veil-button"
            to={`/network?case=${encodeURIComponent(item.case_number)}&case_id=${item.id}`}
          >
            <Network size={14} /> Explore Knowledge Graph
          </Link>
          <span className={`status-pill ${item.status === "ACTIVE" ? "NORMAL" : "HIGH"}`}>{item.status}</span>
        </div>
      </header>

      {uploadSuccess && (
        <div
          className="veil-panel"
          style={{
            borderLeft: "4px solid #10b981",
            background: "#061a15",
            padding: "12px 18px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <CheckCircle2 size={18} className="text-cyber-teal" />
            <div>
              <strong style={{ color: "#34d399", fontSize: "13px" }}>Document Ingested & Graph Synced: </strong>
              <span style={{ color: "#ecfdf5", fontSize: "12px" }}>{uploadSuccess}</span>
            </div>
          </div>
          <Link
            className="veil-button"
            style={{ height: "28px", fontSize: "11px" }}
            to={`/network?case=${encodeURIComponent(item.case_number)}&case_id=${item.id}`}
          >
            <Network size={13} /> View Knowledge Graph
          </Link>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="metric-grid">
        <div className="metric">
          <span>Priority Score</span>
          <strong style={{ color: item.priority_score && item.priority_score >= 70 ? "#f87171" : "#38bdf8" }}>
            {item.priority_score ?? 0} / 100
          </strong>
        </div>
        {Object.entries(item.metrics ?? {}).map(([label, value]) => (
          <div className="metric" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      {/* Grid: Ownership & Direct Navigation Paths */}
      <div className="veil-grid-2">
        <section className="veil-panel">
          <div className="panel-head">
            <h2>
              <UserCheck size={14} style={{ display: "inline", marginRight: "6px", verticalAlign: "middle" }} className="text-cyber-cyan" />
              Investigation Chain & Ownership
            </h2>
          </div>
          <div className="panel-body">
            <dl className="detail-list">
              <dt>Assigned Lead</dt>
              <dd style={{ fontWeight: 600, color: "#edf4f7" }}>{item.assigned_investigator?.name ?? "Unassigned"}</dd>
              <dt>Investigator Role</dt>
              <dd>{item.assigned_investigator?.role ?? "Senior Forensic Lead"}</dd>
              <dt>Case Created By</dt>
              <dd>{item.created_by?.name ?? "System Intake"}</dd>
              <dt>Last Active Touch</dt>
              <dd>{item.last_modified_by?.name ?? item.assigned_investigator?.name ?? "N/A"}</dd>
              <dt>Risk Assessment</dt>
              <dd>
                <span className={`status-pill ${item.risk_level ?? "NORMAL"}`}>{item.risk_level ?? "STANDARD"}</span>
              </dd>
            </dl>
          </div>
        </section>

        <section className="veil-panel">
          <div className="panel-head">
            <h2>
              <BrainCircuit size={14} style={{ display: "inline", marginRight: "6px", verticalAlign: "middle" }} className="text-cyber-amber" />
              Forensic Investigation Modules
            </h2>
          </div>
          <div className="panel-body quick-links" style={{ gap: "10px" }}>
            <Link className="veil-button" to={`/cases/${id}/intelligence`}>
              <BrainCircuit size={14} /> Intelligence Dossier
            </Link>
            <Link
              className="veil-button secondary"
              to={`/network?case=${encodeURIComponent(item.case_number)}&case_id=${item.id}`}
            >
              <Network size={14} /> Interactive Graph
            </Link>
            <Link className="veil-button secondary" to={`/timeline?case=${id}`}>
              <Clock size={14} /> Case Timeline
            </Link>
            <Link className="veil-button secondary" to="/documents">
              <FileText size={14} /> Case Documents
            </Link>
          </div>
        </section>
      </div>

      {/* Grid: Data Sources & Direct File Upload Ingestion */}
      <div className="veil-grid-2">
        <section className="veil-panel">
          <div className="panel-head">
            <h2>
              <FileText size={14} style={{ display: "inline", marginRight: "6px", verticalAlign: "middle" }} className="text-cyber-cyan" />
              Ingested Case Material ({sources.length})
            </h2>
          </div>
          <div className="panel-body stack-list">
            {sources.map((source) => (
              <div className="stack-row" key={source.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ color: "#edf4f7", fontSize: "13px" }}>{source.filename}</strong>
                  <span className="status-pill NORMAL">{source.processing_status}</span>
                </div>
                <small className="muted" style={{ display: "block", margin: "4px 0" }}>
                  {source.data_category} · {source.entities} entities · {source.relationships} links · {source.review_required} review items
                </small>
                {source.processing_error ? <p className="veil-error">{source.processing_error}</p> : null}
                <div className="quick-links" style={{ marginTop: "6px" }}>
                  <Link className="veil-button secondary" style={{ height: "24px", padding: "0 6px", fontSize: "10px" }} to={`/documents/${source.id}`}>
                    Inspect Dossier
                  </Link>
                  <button
                    className="veil-button secondary"
                    style={{ height: "24px", padding: "0 6px", fontSize: "10px" }}
                    onClick={() => processCaseSource(source.id).then(load)}
                  >
                    Reprocess
                  </button>
                </div>
              </div>
            ))}
            {!sources.length ? (
              <p className="muted">No sources uploaded for this case yet. Upload FIR, CDR, financial or surveillance logs.</p>
            ) : null}
          </div>
        </section>

        <section className="veil-panel">
          <div className="panel-head">
            <h2>
              <UploadCloud size={14} style={{ display: "inline", marginRight: "6px", verticalAlign: "middle" }} className="text-cyber-teal" />
              Upload & Extract Forensic Data
            </h2>
          </div>
          <div className="panel-body form-stack">
            <label>
              Data Category
              <select className="veil-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="FIR_REPORT">FIR / Police Report</option>
                <option value="CDR">Call Detail Records (CDR)</option>
                <option value="FINANCIAL">Financial Statement / Hawala Log</option>
                <option value="SURVEILLANCE">Surveillance / Intelligence Note</option>
                <option value="CRIMINAL_HISTORY">Criminal History / Interrogation</option>
                <option value="OTHER">Other Forensic Document</option>
              </select>
            </label>

            <label>
              Source Document File (.pdf, .txt, .csv, .json)
              <input
                className="veil-input"
                type="file"
                accept=".pdf,.txt,.csv,.json,.xlsx"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>

            <label>
              Collection Context / Intake Summary
              <input
                className="veil-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Raid location, seizing officer, intake note..."
              />
            </label>

            <button
              className="veil-button"
              style={{ marginTop: "6px" }}
              disabled={!file || uploading}
              onClick={uploadSource}
            >
              <UploadCloud size={14} />
              {uploading ? "Extracting & Syncing to Neo4j..." : "Upload & Sync to Graph"}
            </button>
          </div>
        </section>
      </div>

      {/* Activity & Open Alerts */}
      <div className="veil-grid-2">
        <section className="veil-panel">
          <div className="panel-head">
            <h2>Processing & Pipeline Activity</h2>
            <span className="muted">{activity.length} records</span>
          </div>
          <div className="panel-body stack-list">
            {activity.slice(0, 8).map((event) => (
              <div className="stack-row" key={event.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span className="status-pill NORMAL" style={{ marginRight: "6px" }}>{event.status}</span>
                  <span style={{ fontSize: "12px", color: "#bad0dc" }}>{event.summary}</span>
                </div>
                <small className="muted" style={{ fontSize: "10px", fontFamily: "ui-monospace, monospace" }}>
                  {new Date(event.created_at).toLocaleTimeString()}
                </small>
              </div>
            ))}
            {!activity.length ? <p className="muted">No ingestion activity recorded yet.</p> : null}
          </div>
        </section>

        <section className="veil-panel">
          <div className="panel-head">
            <h2>Open Case Alerts</h2>
            <Link to="/alerts">Alert Center &rarr;</Link>
          </div>
          <div className="panel-body stack-list">
            {alerts
              .filter((row) => row.status === "OPEN")
              .slice(0, 5)
              .map((row) => (
                <div className="stack-row" key={row.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span className={`status-pill ${row.severity}`} style={{ marginRight: "6px" }}>{row.severity}</span>
                    <strong style={{ color: "#edf4f7", fontSize: "12px" }}>{row.title}</strong>
                    <small className="muted" style={{ display: "block", fontSize: "10px", marginTop: "2px" }}>
                      Score {row.score.toFixed(0)}/100 · Subject P{String(row.entity_id ?? 0).padStart(3, "0")}
                    </small>
                  </div>
                  <Link className="veil-button secondary" style={{ height: "24px", padding: "0 6px", fontSize: "10px" }} to={`/alerts?selected=${row.id}`}>
                    Review
                  </Link>
                </div>
              ))}
            {!alerts.filter((r) => r.status === "OPEN").length && (
              <p className="muted">No open threat signals detected for this case.</p>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
