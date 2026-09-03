import { Link } from "react-router-dom";
import { FileText, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function ProfilePage() {
  const { auditEvents, investigator, reports } = useAuth();
  if (!investigator) return null;
  const visibleEvents = investigator.permissions.canReviewAuditTrail ? auditEvents : auditEvents.filter((item) => item.investigator_id === investigator.id);
  const visibleReports = reports.filter((item) => item.investigator_id === investigator.id || investigator.permissions.canReviewAuditTrail);

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Investigator account</p>
          <h1>{investigator.name}</h1>
          <p className="muted">{investigator.email} - {investigator.department}</p>
        </div>
        <span className="status-pill ACTIVE"><ShieldCheck size={13} /> {investigator.role_label}</span>
      </header>

      <div className="veil-grid-3">
        <div className="metric"><span>Investigator ID</span><strong>{investigator.id}</strong></div>
        <div className="metric"><span>Clearance</span><strong>{investigator.clearance}</strong></div>
        <div className="metric"><span>Reports</span><strong>{visibleReports.length}</strong></div>
      </div>

      <div className="veil-grid-2">
        <section className="veil-panel">
          <div className="panel-head"><h2>Generated reports</h2><Link to="/cases">Cases</Link></div>
          <div className="panel-body stack-list">
            {visibleReports.length ? visibleReports.map((report) => (
              <div className="stack-row" key={report.id}>
                <strong><FileText size={14} /> {report.title}</strong>
                <small className="muted">{report.case_number} - {new Date(report.created_at).toLocaleString()}</small>
                <pre>{report.content}</pre>
              </div>
            )) : <p className="muted">No generated intelligence reports yet.</p>}
          </div>
        </section>
        <section className="veil-panel">
          <div className="panel-head"><h2>Audit trail</h2><span className="muted">{visibleEvents.length} events</span></div>
          <div className="panel-body stack-list">
            {visibleEvents.length ? visibleEvents.slice(0, 20).map((event) => (
              <div className="stack-row" key={event.id}>
                <span className="status-pill">{event.action}</span> {event.summary}
                <small className="muted">{event.investigator_name} - {new Date(event.created_at).toLocaleString()}</small>
              </div>
            )) : <p className="muted">No audit events recorded in this browser session.</p>}
          </div>
        </section>
      </div>
    </section>
  );
}
