import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/AsyncState";
import { useAuth } from "../context/AuthContext";
import { useCaseContext } from "../context/CaseContext";
import { getCases, getDashboard } from "../services/api";
import type { CaseSummary, DashboardData } from "../types/workspace";

export function HomePage() {
  const { auditEvents, investigator } = useAuth();
  const { caseId, setCaseId } = useCaseContext();
  const [data, setData] = useState<DashboardData | null>(null);
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    getCases().then((caseRows) => {
      const selectedCase = caseRows.find((item) => item.id === caseId) ?? caseRows[0];
      if (!selectedCase) {
        setCases([]);
        setData({ case_id: caseId, metrics: { active_cases: 0, entities: 0, open_alerts: 0, documents: 0, anomalies: 0 }, priority_entities: [], recent_alerts: [], anomaly_series: [] });
        return;
      }
      if (selectedCase.id !== caseId) setCaseId(selectedCase.id);
      return getDashboard(selectedCase.id).then((dashboard) => ({ dashboard, caseRows }));
    }).then((result) => {
      if (!result) return;
      const { dashboard, caseRows } = result;
      setData(dashboard);
      setCases(caseRows);
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unknown API error"));
  }, [caseId, setCaseId]);

  useEffect(load, [load]);

  if (error) return <ErrorState label="Unable to load dashboard intelligence." detail={error} retry={load} />;
  if (!data) return <LoadingState label="Loading investigation overview..." />;

  const myCases = cases.filter((item) => item.assigned_investigator?.investigator_id === investigator?.id || item.last_modified_by?.investigator_id === investigator?.id || item.created_by?.investigator_id === investigator?.id);
  const metrics = [
    { label: "My cases", value: myCases.length },
    { label: "Active cases", value: data.metrics.active_cases },
    { label: "Case entities", value: data.metrics.entities },
    { label: "Open alerts", value: data.metrics.open_alerts },
    { label: "Documents", value: data.metrics.documents },
  ];

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Investigator dashboard</p>
          <h1>{investigator?.name}</h1>
          <p className="muted">{investigator?.role_label} - {investigator?.department} - VEIL-2026-{String(caseId).padStart(3, "0")}</p>
        </div>
        <div className="quick-links"><Link className="veil-button secondary" to="/cases/1">Case overview</Link><Link className="veil-button" to="/cases/1/intelligence">Case intelligence</Link></div>
      </header>
      <div className="metric-grid">{metrics.map((item) => <div className="metric" key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>)}</div>
      <div className="veil-grid-2">
        <section className="veil-panel">
          <div className="panel-head"><h2>Assigned case queue</h2><Link to="/cases">View all</Link></div>
          <div className="veil-table-wrap">
            <table className="veil-table">
              <thead><tr><th>Case</th><th>Risk</th><th>Status</th><th>Owner</th></tr></thead>
              <tbody>{myCases.slice(0, 6).map((item) => <tr key={item.id}><td><Link to={`/cases/${item.id}/intelligence`}>{item.case_number}</Link></td><td><span className={`status-pill ${item.risk_level}`}>{item.priority_score ?? 0}</span></td><td>{item.status}</td><td>{item.assigned_investigator?.name ?? "Unassigned"}</td></tr>)}</tbody>
            </table>
          </div>
          {!myCases.length ? <p className="panel-body muted">No assigned cases yet. Seed demo data to populate the investigator queue.</p> : null}
        </section>
        <section className="veil-panel">
          <div className="panel-head"><h2>Recent account activity</h2><Link to="/profile">Profile</Link></div>
          <div className="panel-body stack-list">{auditEvents.slice(0, 5).map((item) => <div className="stack-row" key={item.id}><span className="status-pill">{item.action}</span> {item.summary}<small className="muted">{new Date(item.created_at).toLocaleString()}</small></div>)}{!auditEvents.length ? <p className="muted">No account activity recorded yet.</p> : null}</div>
        </section>
      </div>
      <div className="veil-grid-2">
        <section className="veil-panel">
          <div className="panel-head"><h2>Priority entities</h2><Link to="/entities">View all</Link></div>
          <div className="veil-table-wrap"><table className="veil-table"><thead><tr><th>Entity</th><th>Priority</th><th>Key signal</th><th>Data sufficiency</th></tr></thead><tbody>{data.priority_entities.map((item) => <tr key={item.entity_id}><td><Link to={`/entities/P${String(item.entity_id).padStart(3, "0")}`}>{item.name}</Link></td><td>{item.score.toFixed(0)} / 100</td><td>{item.key_signal}</td><td><span className="status-pill">{item.data_sufficiency}</span></td></tr>)}</tbody></table></div>
        </section>
        <section className="veil-panel">
          <div className="panel-head"><h2>Recent alerts</h2><Link to="/alerts">Alert center</Link></div>
          <div className="panel-body stack-list">{data.recent_alerts.map((item) => <div className="stack-row" key={item.id}><div><span className={`status-pill ${item.severity}`}>{item.severity}</span> <Link to={`/alerts?selected=${item.id}`}>{item.title}</Link></div><small className="muted">Score {item.score.toFixed(0)} - {item.status}</small></div>)}</div>
        </section>
      </div>
      <section className="veil-panel">
        <div className="panel-head"><h2>Anomaly overview</h2><span className="muted">Stored analytical signals over time</span></div>
        <div className="panel-body anomaly-bars">{data.anomaly_series.length ? data.anomaly_series.slice(-18).map((item, index) => <div className="anomaly-bar" key={`${item.type}-${index}`} title={`${item.type}: ${item.score}`} style={{ height: `${Math.max(8, item.score)}%` }}><span>{item.type.split("_")[0]}</span></div>) : <p className="muted">No calculated anomaly snapshots. Run Phase 4 recalculation to populate this view.</p>}</div>
      </section>
      <p className="disclaimer">Analytical priority organizes review based on observed data. It is not a determination or probability of criminality.</p>
    </section>
  );
}
