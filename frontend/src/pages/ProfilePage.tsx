import { FileText, Key, Shield, ShieldAlert, ShieldCheck, UserCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function ProfilePage() {
  const { auditEvents, investigator, reports } = useAuth();
  if (!investigator) return null;

  const visibleEvents = investigator.permissions.canReviewAuditTrail
    ? auditEvents
    : auditEvents.filter((item) => item.investigator_id === investigator.id);
  const visibleReports = reports.filter(
    (item) => item.investigator_id === investigator.id || investigator.permissions.canReviewAuditTrail,
  );

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Investigator Profile & Official Credentials</p>
          <h1>{investigator.name}</h1>
          <p className="muted">
            {investigator.email} · {investigator.department} · Station ID: {investigator.id}
          </p>
        </div>
        <div className="quick-links">
          <span className="status-pill NORMAL" style={{ padding: "6px 12px", fontSize: "11px" }}>
            <ShieldCheck size={14} className="text-cyber-teal" />
            <span style={{ marginLeft: "4px" }}>CLEARANCE: {investigator.clearance}</span>
          </span>
        </div>
      </header>

      {/* Credential Metrics */}
      <div className="metric-grid">
        <div className="metric">
          <span>Badge Identifier</span>
          <strong style={{ color: "#38bdf8", fontFamily: "ui-monospace, monospace" }}>{investigator.id}</strong>
        </div>
        <div className="metric">
          <span>Official Role</span>
          <strong style={{ fontSize: "18px", color: "#edf4f7" }}>{investigator.role_label}</strong>
        </div>
        <div className="metric">
          <span>Clearance Level</span>
          <strong style={{ color: "#fbbf24" }}>{investigator.clearance}</strong>
        </div>
        <div className="metric">
          <span>Generated Reports</span>
          <strong style={{ color: "#34d399" }}>{visibleReports.length}</strong>
        </div>
        <div className="metric">
          <span>Audit Log Entries</span>
          <strong style={{ color: "#a855f7" }}>{visibleEvents.length}</strong>
        </div>
      </div>

      {/* Reports & Audit Trail */}
      <div className="veil-grid-2">
        <section className="veil-panel">
          <div className="panel-head">
            <h2>
              <FileText size={14} style={{ display: "inline", marginRight: "6px", verticalAlign: "middle" }} className="text-cyber-cyan" />
              Generated Intelligence Reports ({visibleReports.length})
            </h2>
            <Link to="/cases">Cases &rarr;</Link>
          </div>
          <div className="panel-body stack-list">
            {visibleReports.length ? (
              visibleReports.map((report) => (
                <div className="stack-row" key={report.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ color: "#edf4f7", fontSize: "13px" }}>{report.title}</strong>
                    <span className="status-pill NORMAL">{report.case_number}</span>
                  </div>
                  <small className="muted" style={{ display: "block", margin: "2px 0 8px 0" }}>
                    Generated {new Date(report.created_at).toLocaleString()}
                  </small>
                  <pre
                    style={{
                      maxHeight: "140px",
                      overflow: "auto",
                      fontSize: "10px",
                      color: "#9fc3d6",
                      background: "#060b11",
                      padding: "8px",
                      borderRadius: "4px",
                      border: "1px solid #122130",
                    }}
                  >
                    {report.content}
                  </pre>
                </div>
              ))
            ) : (
              <p className="muted">No generated intelligence reports on record for this session.</p>
            )}
          </div>
        </section>

        <section className="veil-panel">
          <div className="panel-head">
            <h2>
              <ShieldCheck size={14} style={{ display: "inline", marginRight: "6px", verticalAlign: "middle" }} className="text-cyber-teal" />
              Session Audit Trail ({visibleEvents.length})
            </h2>
          </div>
          <div className="panel-body stack-list" style={{ maxHeight: "560px", overflowY: "auto" }}>
            {visibleEvents.length ? (
              visibleEvents.slice(0, 30).map((event) => (
                <div className="stack-row" key={event.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span className="status-pill NORMAL" style={{ marginRight: "6px" }}>{event.action}</span>
                    <span style={{ fontSize: "12px", color: "#edf4f7" }}>{event.summary}</span>
                    <small className="muted" style={{ display: "block", fontSize: "10px", marginTop: "2px" }}>
                      Target: {event.target_type} ({event.target_id}) · Agent: {event.investigator_name}
                    </small>
                  </div>
                  <small className="muted" style={{ fontSize: "10px", fontFamily: "ui-monospace, monospace", whiteSpace: "nowrap" }}>
                    {new Date(event.created_at).toLocaleTimeString()}
                  </small>
                </div>
              ))
            ) : (
              <p className="muted">No audit events logged in this session.</p>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
