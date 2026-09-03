import { useCallback, useEffect, useState } from "react";
import { BrainCircuit, FileText, Network } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/AsyncState";
import { useAuth } from "../context/AuthContext";
import { useCaseContext } from "../context/CaseContext";
import { getAlerts, getCaseDetail } from "../services/api";
import type { AlertItem } from "../types/analytics";
import type { CaseSummary } from "../types/workspace";

export function CaseOverviewPage() {
  const { caseId: routeId } = useParams();
  const id = Number(routeId) || 1;
  const { recordAudit } = useAuth();
  const { setCaseId } = useCaseContext();
  const [item, setItem] = useState<CaseSummary | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [error, setError] = useState(false);
  const load = useCallback(() => {
    setError(false);
    Promise.all([getCaseDetail(id), getAlerts(id)]).then(([caseItem, items]) => {
      setItem(caseItem);
      setAlerts(items);
      setCaseId(id);
      recordAudit({ action: "VIEW_CASE", target_type: "CASE", target_id: caseItem.case_number, summary: `Viewed case overview for ${caseItem.case_number}.` });
    }).catch(() => setError(true));
  }, [id, setCaseId]);

  useEffect(load, [load]);

  if (error) return <ErrorState label="Unable to load case overview." retry={load} />;
  if (!item) return <LoadingState />;

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
