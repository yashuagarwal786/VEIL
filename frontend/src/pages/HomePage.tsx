import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  BrainCircuit,
  BriefcaseBusiness,
  FileText,
  Network,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
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
    getCases()
      .then((caseRows) => {
        const selectedCase = caseRows.find((item) => item.id === caseId) ?? caseRows[0];
        if (!selectedCase) {
          setCases([]);
          setData({
            case_id: caseId,
            metrics: { active_cases: 0, entities: 0, open_alerts: 0, documents: 0, anomalies: 0 },
            priority_entities: [],
            recent_alerts: [],
            anomaly_series: [],
          });
          return;
        }
        if (selectedCase.id !== caseId) setCaseId(selectedCase.id);
        return getDashboard(selectedCase.id).then((dashboard) => ({ dashboard, caseRows }));
      })
      .then((result) => {
        if (!result) return;
        const { dashboard, caseRows } = result;
        setData(dashboard);
        setCases(caseRows);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unknown API error"));
  }, [caseId, setCaseId]);

  useEffect(load, [load]);

  if (error) return <ErrorState label="Unable to load investigator dashboard." detail={error} retry={load} />;
  if (!data) return <LoadingState label="Loading investigator cockpit..." />;

  const myCases = cases.filter(
    (item) =>
      item.assigned_investigator?.investigator_id === investigator?.id ||
      item.last_modified_by?.investigator_id === investigator?.id ||
      item.created_by?.investigator_id === investigator?.id,
  );
  const primaryCase = myCases[0] ?? cases[0];

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Investigator Cockpit · Active Operations</p>
          <h1>{investigator?.name}</h1>
          <p className="muted">
            {investigator?.role_label} · {investigator?.department} ·{" "}
            {primaryCase ? `Active Scope: ${primaryCase.case_number}` : "No case selected"}
          </p>
        </div>
        <div className="quick-links">
          <Link className="veil-button secondary" to={primaryCase ? `/cases/${primaryCase.id}` : "/cases"}>
            <BriefcaseBusiness size={14} /> Case Overview
          </Link>
          <Link className="veil-button" to={primaryCase ? `/cases/${primaryCase.id}/intelligence` : "/cases"}>
            <BrainCircuit size={14} /> Case Intelligence Dossier
          </Link>
        </div>
      </header>

      {/* Top Cockpit Metrics */}
      <div className="metric-grid">
        <div className="metric">
          <span>Assigned Cases</span>
          <strong>{myCases.length}</strong>
        </div>
        <div className="metric">
          <span>Total Active Cases</span>
          <strong style={{ color: "#38bdf8" }}>{data.metrics.active_cases}</strong>
        </div>
        <div className="metric">
          <span>Indexed Entities</span>
          <strong style={{ color: "#34d399" }}>{data.metrics.entities}</strong>
        </div>
        <div className="metric">
          <span>Open Threat Alerts</span>
          <strong style={{ color: "#f87171" }}>{data.metrics.open_alerts}</strong>
        </div>
        <div className="metric">
          <span>Ingested Documents</span>
          <strong style={{ color: "#fbbf24" }}>{data.metrics.documents}</strong>
        </div>
      </div>

      {/* Section 1: Assigned Case Queue & Recent Account Audit Activity */}
      <div className="veil-grid-2">
        <section className="veil-panel">
          <div className="panel-head">
            <h2>
              <BriefcaseBusiness size={14} style={{ display: "inline", marginRight: "6px", verticalAlign: "middle" }} className="text-cyber-cyan" />
              Assigned Case Queue
            </h2>
            <Link to="/cases">View all cases &rarr;</Link>
          </div>
          <div className="veil-table-wrap">
            <table className="veil-table">
              <thead>
                <tr>
                  <th>Case Identifier</th>
                  <th>Risk Score</th>
                  <th>Status</th>
                  <th>Lead Investigator</th>
                </tr>
              </thead>
              <tbody>
                {myCases.slice(0, 6).map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link to={`/cases/${item.id}/intelligence`} style={{ fontWeight: 700 }}>
                        {item.case_number}
                      </Link>
                      <small className="muted" style={{ display: "block", fontSize: "10px" }}>{item.title.slice(0, 32)}</small>
                    </td>
                    <td>
                      <span className={`status-pill ${item.risk_level ?? "NORMAL"}`}>
                        {item.priority_score ?? 0} / 100
                      </span>
                    </td>
                    <td>
                      <span className="status-pill NORMAL">{item.status}</span>
                    </td>
                    <td>{item.assigned_investigator?.name ?? "Unassigned"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!myCases.length ? (
            <p className="panel-body muted">No assigned cases found. Seed demonstration data to populate the queue.</p>
          ) : null}
        </section>

        <section className="veil-panel">
          <div className="panel-head">
            <h2>
              <ShieldCheck size={14} style={{ display: "inline", marginRight: "6px", verticalAlign: "middle" }} className="text-cyber-teal" />
              Session Audit Trail
            </h2>
            <Link to="/profile">Full Log &rarr;</Link>
          </div>
          <div className="panel-body stack-list">
            {auditEvents.slice(0, 5).map((item) => (
              <div className="stack-row" key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span className="status-pill NORMAL" style={{ marginRight: "6px" }}>{item.action}</span>
                  <span style={{ fontSize: "12px", color: "#edf4f7" }}>{item.summary}</span>
                </div>
                <small className="muted" style={{ fontSize: "10px", fontFamily: "ui-monospace, monospace" }}>
                  {new Date(item.created_at).toLocaleTimeString()}
                </small>
              </div>
            ))}
            {!auditEvents.length ? <p className="muted">No session audit events logged yet.</p> : null}
          </div>
        </section>
      </div>

      {/* Section 2: Priority Entities & Recent Alerts */}
      <div className="veil-grid-2">
        <section className="veil-panel">
          <div className="panel-head">
            <h2>
              <Users size={14} style={{ display: "inline", marginRight: "6px", verticalAlign: "middle" }} className="text-cyber-amber" />
              Priority Target Entities
            </h2>
            <Link to="/entities">View Registry &rarr;</Link>
          </div>
          <div className="veil-table-wrap">
            <table className="veil-table">
              <thead>
                <tr>
                  <th>Subject Entity</th>
                  <th>Priority Score</th>
                  <th>Primary Signal</th>
                  <th>Sufficiency</th>
                </tr>
              </thead>
              <tbody>
                {data.priority_entities.map((item) => (
                  <tr key={item.entity_id}>
                    <td>
                      <Link to={`/entities/P${String(item.entity_id).padStart(3, "0")}`} style={{ fontWeight: 700 }}>
                        {item.name}
                      </Link>
                      <small className="muted" style={{ display: "block", fontSize: "10px", fontFamily: "ui-monospace, monospace" }}>
                        P{String(item.entity_id).padStart(3, "0")}
                      </small>
                    </td>
                    <td style={{ fontFamily: "ui-monospace, monospace", fontWeight: 700, color: item.score >= 70 ? "#f87171" : item.score >= 40 ? "#fbbf24" : "#38bdf8" }}>
                      {item.score.toFixed(0)} / 100
                    </td>
                    <td style={{ fontSize: "11px", color: "#bad0dc" }}>{item.key_signal}</td>
                    <td>
                      <span className="status-pill NORMAL">{item.data_sufficiency}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="veil-panel">
          <div className="panel-head">
            <h2>
              <Bell size={14} style={{ display: "inline", marginRight: "6px", verticalAlign: "middle" }} className="text-cyber-cyan" />
              Recent Triage Alerts
            </h2>
            <Link to="/alerts">Alert Center &rarr;</Link>
          </div>
          <div className="panel-body stack-list">
            {data.recent_alerts.map((item) => (
              <div className="stack-row" key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span className={`status-pill ${item.severity}`}>{item.severity}</span>
                    <Link to={`/alerts?selected=${item.id}`} style={{ fontWeight: 600, fontSize: "12px" }}>
                      {item.title}
                    </Link>
                  </div>
                  <small className="muted" style={{ fontSize: "10px", marginTop: "2px", display: "block" }}>
                    Score {item.score.toFixed(0)}/100 · Status: {item.status}
                  </small>
                </div>
                <Link className="veil-button secondary" style={{ height: "24px", padding: "0 6px", fontSize: "10px" }} to={`/alerts?selected=${item.id}`}>
                  Triage
                </Link>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Section 3: Anomaly Overview Temporal Bars */}
      <section className="veil-panel">
        <div className="panel-head">
          <h2>
            <TrendingUp size={14} style={{ display: "inline", marginRight: "6px", verticalAlign: "middle" }} className="text-cyber-cyan" />
            Behavioral Anomaly Distribution Over Time
          </h2>
          <span className="muted" style={{ fontSize: "11px" }}>Algorithmic signal history</span>
        </div>
        <div className="panel-body anomaly-bars">
          {data.anomaly_series.length ? (
            data.anomaly_series.slice(-18).map((item, index) => (
              <div
                className="anomaly-bar"
                key={`${item.type}-${index}`}
                title={`${item.type}: ${item.score} (Date: ${item.date})`}
                style={{ height: `${Math.max(8, item.score)}%` }}
              >
                <span>{item.type.split("_")[0]}</span>
              </div>
            ))
          ) : (
            <p className="muted" style={{ padding: "20px" }}>
              No calculated anomaly snapshots available. Recalculate case analytics to populate this timeline.
            </p>
          )}
        </div>
      </section>

      <div className="disclaimer">
        <strong style={{ color: "#38bdf8" }}>Legal Disclaimer: </strong>
        Analytical priority organizes review based on observed forensic data. It is not a determination or probability of guilt.
      </div>
    </section>
  );
}
