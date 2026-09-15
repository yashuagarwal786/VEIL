import {
  AlertTriangle,
  Bell,
  Calendar,
  Clock,
  CreditCard,
  FileText,
  Filter,
  MapPin,
  Phone,
  Radio,
  Search,
  Shield,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState } from "../components/AsyncState";
import { useCaseContext } from "../context/CaseContext";
import { getTimeline } from "../services/api";
import type { TimelineEvent } from "../types/workspace";

function getEventIcon(type: string) {
  switch (type) {
    case "TRANSACTION":
      return <CreditCard size={14} className="text-cyber-teal" />;
    case "COMMUNICATION":
      return <Phone size={14} className="text-cyber-cyan" />;
    case "DOCUMENT":
      return <FileText size={14} className="text-cyber-indigo" />;
    case "ALERT":
      return <Bell size={14} className="text-cyber-amber" />;
    case "LOCATION":
      return <MapPin size={14} className="text-pink-400" />;
    default:
      return <Clock size={14} className="text-cyber-cyan" />;
  }
}

export function TimelinePage() {
  const { caseId } = useCaseContext();
  const [params] = useSearchParams();
  const [events, setEvents] = useState<TimelineEvent[] | null>(null);
  const [selected, setSelected] = useState<TimelineEvent | null>(null);
  const [type, setType] = useState("ALL");
  const [range, setRange] = useState("30");
  const [severity, setSeverity] = useState("ALL");
  const [error, setError] = useState(false);

  const entity = Number(params.get("entity")) || undefined;

  const load = useCallback(() => {
    setError(false);
    getTimeline(caseId, entity, type)
      .then((data) => {
        setEvents(data);
        if (data.length > 0 && !selected) {
          setSelected(data[0]);
        }
      })
      .catch(() => setError(true));
  }, [caseId, entity, type]);

  useEffect(load, [load]);

  const visible = useMemo(() => {
    const cutoff = range === "ALL" ? 0 : Date.now() - Number(range) * 86400000;
    return (events ?? []).filter(
      (item) => new Date(item.timestamp).getTime() >= cutoff && (severity === "ALL" || item.severity === severity),
    );
  }, [events, range, severity]);

  if (error) return <ErrorState label="Unable to load chronological activity timeline." retry={load} />;
  if (!events) return <LoadingState label="Loading chronological activity..." />;

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Chronological Intelligence · Temporal Sequence</p>
          <h1>Investigation Timeline</h1>
          <p className="muted">
            {entity ? `Filtered for Subject P${String(entity).padStart(3, "0")} · ` : ""}
            Sequential timeline of communications, financial movements, document ingests, and alerts
          </p>
        </div>

        <div className="quick-links">
          <select className="veil-select" aria-label="Time range" value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="1">Last 24 hours</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="ALL">All Activity</option>
          </select>

          <select className="veil-select" aria-label="Event type" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="ALL">All Event Types</option>
            <option value="TRANSACTION">Transactions</option>
            <option value="COMMUNICATION">Communications</option>
            <option value="DOCUMENT">Documents</option>
            <option value="ALERT">Alerts</option>
          </select>

          <select className="veil-select" aria-label="Severity" value={severity} onChange={(e) => setSeverity(e.target.value)}>
            <option value="ALL">All Severities</option>
            <option value="NORMAL">NORMAL</option>
            <option value="ATTENTION">ATTENTION</option>
            <option value="HIGH">HIGH</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
        </div>
      </header>

      {visible.length ? (
        <div className="timeline-layout">
          <div className="timeline-list">
            {visible.map((item) => {
              const isSelected = selected?.id === item.id;
              return (
                <button
                  className="timeline-event"
                  key={item.id}
                  onClick={() => setSelected(item)}
                  style={{
                    opacity: isSelected ? 1 : 0.88,
                  }}
                >
                  <time>
                    <strong style={{ color: "#edf4f7" }}>
                      {new Date(item.timestamp).toLocaleDateString(undefined, { day: "2-digit", month: "short" })}
                    </strong>
                    <span>
                      {new Date(item.timestamp).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </time>
                  <span className="timeline-line" />
                  <span
                    className="timeline-copy"
                    style={{
                      borderLeft: isSelected ? "2px solid #38bdf8" : undefined,
                      background: isSelected ? "#0c1824" : undefined,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span className={`status-pill ${item.severity}`}>
                        {getEventIcon(item.type)}
                        <span style={{ marginLeft: "4px" }}>{item.type}</span>
                      </span>
                      <strong style={{ color: "#edf4f7" }}>{item.title}</strong>
                    </div>
                    <small style={{ color: "#8fa8b7", marginTop: "2px" }}>{item.summary}</small>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right: Event Detail Drawer */}
          <aside className="veil-panel timeline-detail">
            <div className="panel-head">
              <h2>Event Forensic Details</h2>
            </div>
            <div className="panel-body">
              {selected ? (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span className={`status-pill ${selected.severity}`}>{selected.type}</span>
                    <span style={{ fontSize: "11px", color: "#6a8696", fontFamily: "ui-monospace, monospace" }}>
                      {new Date(selected.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <h3 style={{ margin: "6px 0 4px 0", color: "#f8fafc", fontSize: "16px" }}>{selected.title}</h3>
                  <p className="muted" style={{ fontSize: "12px", marginBottom: "14px" }}>{selected.summary}</p>

                  <div style={{ background: "#060b11", padding: "10px", borderRadius: "4px", border: "1px solid #142434", marginBottom: "14px" }}>
                    <span style={{ fontSize: "10px", color: "#6a8696", textTransform: "uppercase" }}>Recorded Event Parameters</span>
                    <pre style={{ margin: "4px 0 0 0", fontSize: "11px", color: "#8faec0", whiteSpace: "pre-wrap" }}>
                      {JSON.stringify(selected.details, null, 2)}
                    </pre>
                  </div>

                  <div className="quick-links">
                    {selected.entity_id ? (
                      <Link className="veil-button" to={`/entities/P${String(selected.entity_id).padStart(3, "0")}`}>
                        View Subject Entity
                      </Link>
                    ) : null}
                    {selected.details?.document_id ? (
                      <Link className="veil-button secondary" to={`/documents/${selected.details.document_id}`}>
                        Source Document
                      </Link>
                    ) : null}
                    {selected.details?.location_id ? (
                      <Link className="veil-button secondary" to={`/map?location=${selected.details.location_id}`}>
                        View on Map
                      </Link>
                    ) : null}
                    {selected.details?.alert_id ? (
                      <Link className="veil-button secondary" to={`/alerts?selected=${selected.details.alert_id}`}>
                        Open Alert
                      </Link>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="muted">Select a temporal event from the timeline to inspect its observed parameters.</p>
              )}
            </div>
          </aside>
        </div>
      ) : (
        <EmptyState label="No timeline events match the selected filters." />
      )}
    </section>
  );
}
