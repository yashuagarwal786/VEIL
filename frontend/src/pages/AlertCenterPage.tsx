import {
  AlertTriangle,
  Bell,
  CheckCircle,
  Eye,
  Filter,
  RefreshCw,
  Search,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/AsyncState";
import { useCaseContext } from "../context/CaseContext";
import { getAlerts, getAnalyticsOverview, recalculateAnalytics, updateAlertStatus } from "../services/api";
import type { AlertItem, AnalyticsOverview } from "../types/analytics";

export function AlertCenterPage() {
  const { caseId } = useCaseContext();
  const [params] = useSearchParams();
  const [alerts, setAlerts] = useState<AlertItem[] | null>(null);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [selected, setSelected] = useState<AlertItem | null>(null);
  const [severity, setSeverity] = useState("ALL");
  const [type, setType] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("NEWEST");
  const [error, setError] = useState(false);
  const [working, setWorking] = useState(false);

  const load = useCallback(() => {
    setError(false);
    Promise.all([getAlerts(caseId), getAnalyticsOverview(caseId)])
      .then(([items, data]) => {
        setAlerts(items);
        setOverview(data);
        const requested = Number(params.get("selected"));
        if (requested) {
          setSelected(items.find((item) => item.id === requested) ?? items[0] ?? null);
        } else if (items.length > 0 && !selected) {
          setSelected(items[0]);
        }
      })
      .catch(() => setError(true));
  }, [caseId, params]);

  useEffect(load, [load]);

  const visible = useMemo(
    () =>
      [...(alerts ?? [])]
        .filter(
          (item) =>
            (severity === "ALL" || item.severity === severity) &&
            (type === "ALL" || item.type === type) &&
            (status === "ALL" || item.status === status) &&
            (!query || `${item.title} ${item.entity_id ?? ""} ${item.explanation}`.toLowerCase().includes(query.toLowerCase())),
        )
        .sort((a, b) =>
          sort === "SCORE" ? b.score - a.score : new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime(),
        ),
    [alerts, query, severity, sort, status, type],
  );

  async function review(next: AlertItem["status"]) {
    if (!selected) return;
    setWorking(true);
    try {
      const updated = await updateAlertStatus(selected.id, next);
      setSelected(updated);
      setAlerts((items) => (items ?? []).map((item) => (item.id === updated.id ? updated : item)));
    } catch {
      // Error handled
    } finally {
      setWorking(false);
    }
  }

  async function recalculate() {
    setWorking(true);
    try {
      await recalculateAnalytics(caseId);
      load();
    } catch {
      // Error handled
    } finally {
      setWorking(false);
    }
  }

  if (error) return <ErrorState label="Unable to load behavioral intelligence alerts." retry={load} />;
  if (!alerts) return <LoadingState label="Loading analytical alert center..." />;

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">SOC Analytics · Behavioral Triage</p>
          <h1>Alert Center</h1>
          <p className="muted">Automated algorithmic anomaly detections and structural signals awaiting investigator review</p>
        </div>
        <div className="quick-links">
          <button className="veil-button" disabled={working} onClick={() => void recalculate()}>
            <RefreshCw size={14} className={working ? "animate-spin" : ""} />
            {working ? "Calculating..." : "Recalculate Case Signals"}
          </button>
        </div>
      </header>

      {/* Overview Metrics */}
      <div className="metric-grid">
        <div className="metric">
          <span>Analytical Signals</span>
          <strong style={{ color: "#38bdf8" }}>{overview?.total_anomalies ?? 0}</strong>
        </div>
        <div className="metric">
          <span>High Severity Alerts</span>
          <strong style={{ color: "#f87171" }}>{overview?.high_severity_alerts ?? 0}</strong>
        </div>
        <div className="metric">
          <span>High-Priority Entities</span>
          <strong style={{ color: "#fbbf24" }}>{overview?.high_priority_entities ?? 0}</strong>
        </div>
        <div className="metric">
          <span>Geographic Deviations</span>
          <strong style={{ color: "#a855f7" }}>{overview?.geographic_deviations ?? 0}</strong>
        </div>
      </div>

      <div className="disclaimer">
        <strong style={{ color: "#38bdf8" }}>Triage Protocol: </strong>
        Anomaly detection identifies statistical outliers and structural anomalies, not wrongdoing. Legitimate high-volume operations can trigger flags.
      </div>

      {/* Filter Toolbar */}
      <div className="quick-links">
        <div style={{ position: "relative", minWidth: "220px", flex: 1 }}>
          <Search size={14} style={{ position: "absolute", left: "10px", top: "10px", color: "#6a8696" }} />
          <input
            className="veil-input"
            style={{ width: "100%", paddingLeft: "30px" }}
            aria-label="Search alerts"
            placeholder="Search alert title or entity ID..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <select className="veil-select" aria-label="Severity" value={severity} onChange={(e) => setSeverity(e.target.value)}>
          <option value="ALL">All Severities</option>
          <option value="CRITICAL">CRITICAL</option>
          <option value="HIGH">HIGH</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="LOW">LOW</option>
        </select>

        <select className="veil-select" aria-label="Signal type" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="ALL">All Signal Types</option>
          {[...new Set(alerts.map((item) => item.type))].map((item) => (
            <option key={item} value={item}>{item.replaceAll("_", " ")}</option>
          ))}
        </select>

        <select className="veil-select" aria-label="Review status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="ALL">All Statuses</option>
          <option value="OPEN">OPEN Only</option>
          <option value="REVIEWED">REVIEWED</option>
          <option value="DISMISSED">DISMISSED</option>
        </select>

        <select className="veil-select" aria-label="Sort alerts" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="NEWEST">Sort: Newest First</option>
          <option value="SCORE">Sort: Highest Score</option>
        </select>
      </div>

      {/* Main Grid: Alert Table + Detailed Triage Panel */}
      <div className="veil-grid-2">
        <div className="veil-panel veil-table-wrap">
          <table className="veil-table">
            <thead>
              <tr>
                <th>Alert / Signal</th>
                <th>Subject Entity</th>
                <th>Score</th>
                <th>Severity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => {
                const isSelected = selected?.id === item.id;
                return (
                  <tr
                    key={item.id}
                    onClick={() => setSelected(item)}
                    style={{
                      cursor: "pointer",
                      background: isSelected ? "#10212f" : undefined,
                      borderLeft: isSelected ? "3px solid #38bdf8" : "3px solid transparent",
                    }}
                  >
                    <td>
                      <strong style={{ color: "#edf4f7", fontSize: "12px", display: "block" }}>{item.title}</strong>
                      <small className="muted" style={{ fontSize: "10px" }}>{new Date(item.generated_at).toLocaleDateString()}</small>
                    </td>
                    <td style={{ fontFamily: "ui-monospace, monospace", color: "#38bdf8" }}>
                      {item.entity_id ? `P${String(item.entity_id).padStart(3, "0")}` : "Case Scope"}
                    </td>
                    <td style={{ fontFamily: "ui-monospace, monospace", fontWeight: 700 }}>
                      {item.score.toFixed(0)}/100
                    </td>
                    <td>
                      <span className={`status-pill ${item.severity}`}>{item.severity}</span>
                    </td>
                    <td>
                      <span className={`status-pill ${item.status === "OPEN" ? "HIGH" : item.status === "REVIEWED" ? "NORMAL" : "LOW"}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!visible.length && (
            <div className="panel-body muted" style={{ textAlign: "center", padding: "32px" }}>
              No alerts match the active filter criteria.
            </div>
          )}
        </div>

        {/* Right: SOC Alert Details & Review Action Card */}
        <aside className="veil-panel">
          <div className="panel-head">
            <h2>
              <ShieldAlert size={14} style={{ display: "inline", marginRight: "6px", verticalAlign: "middle" }} className="text-cyber-amber" />
              Alert Triage Details
            </h2>
          </div>
          <div className="panel-body">
            {selected ? (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span className={`status-pill ${selected.severity}`}>{selected.severity} SEVERITY</span>
                  <span style={{ fontSize: "12px", fontFamily: "ui-monospace, monospace", color: "#edf4f7", fontWeight: 700 }}>
                    SCORE {selected.score.toFixed(0)} / 100
                  </span>
                </div>

                <h3 style={{ margin: "4px 0 8px 0", color: "#f8fafc", fontSize: "16px" }}>{selected.title}</h3>
                <div style={{ fontSize: "11px", color: "#718d9e", marginBottom: "12px" }}>
                  Status: <strong style={{ color: "#edf4f7" }}>{selected.status}</strong> · Generated: {new Date(selected.generated_at).toLocaleString()}
                </div>

                <div style={{ background: "#060c12", padding: "10px 12px", borderRadius: "4px", border: "1px solid #142434", marginBottom: "12px" }}>
                  <span style={{ fontSize: "10px", color: "#38bdf8", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.06em", display: "block", marginBottom: "4px" }}>
                    Algorithmic Finding
                  </span>
                  <p style={{ margin: 0, fontSize: "12px", color: "#bad0dc", lineHeight: 1.4 }}>{selected.explanation}</p>
                </div>

                <div style={{ marginBottom: "12px" }}>
                  <span style={{ fontSize: "11px", color: "#6a8696", textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: "4px" }}>
                    Reasoning Factors:
                  </span>
                  <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "11px", color: "#bad0dc" }}>
                    {(selected.details.reasons ?? [selected.explanation]).map((reason) => (
                      <li key={reason} style={{ marginBottom: "2px" }}>{reason}</li>
                    ))}
                  </ul>
                </div>

                {selected.details.supporting_metrics && Object.keys(selected.details.supporting_metrics).length > 0 && (
                  <div style={{ background: "#060c12", padding: "8px", borderRadius: "4px", border: "1px solid #142434", marginBottom: "14px" }}>
                    <span style={{ fontSize: "10px", color: "#6a8696", textTransform: "uppercase" }}>Supporting Forensic Parameters</span>
                    <pre style={{ margin: "4px 0 0 0", fontSize: "10px", color: "#8faec0", whiteSpace: "pre-wrap" }}>
                      {JSON.stringify(selected.details.supporting_metrics, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="quick-links" style={{ marginBottom: "14px" }}>
                  {selected.entity_id ? (
                    <>
                      <Link className="veil-button" to={`/entities/P${String(selected.entity_id).padStart(3, "0")}`}>
                        <Eye size={13} /> Entity Profile
                      </Link>
                      <Link className="veil-button secondary" to={`/network?focus=P${String(selected.entity_id).padStart(3, "0")}`}>
                        Network
                      </Link>
                      <Link className="veil-button secondary" to={`/timeline?entity=${selected.entity_id}`}>
                        Timeline
                      </Link>
                    </>
                  ) : null}
                  <Link className="veil-button secondary" to="/evidence">Evidence</Link>
                </div>

                {/* Triage Decision Actions */}
                <div style={{ borderTop: "1px solid #142434", paddingTop: "12px" }}>
                  <span style={{ fontSize: "11px", color: "#6a8696", textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: "8px" }}>
                    Investigator Triage Decision:
                  </span>
                  <div className="quick-links">
                    <button
                      className="veil-button"
                      disabled={working || selected.status === "REVIEWED"}
                      onClick={() => void review("REVIEWED")}
                    >
                      <CheckCircle size={13} /> Mark Reviewed
                    </button>
                    <button
                      className="veil-button secondary"
                      disabled={working || selected.status === "DISMISSED"}
                      onClick={() => void review("DISMISSED")}
                    >
                      <XCircle size={13} /> Dismiss Alert
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="muted">Select an alert from the table to view its explanation and perform forensic triage.</p>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
