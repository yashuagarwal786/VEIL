import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState } from "../components/AsyncState";
import { useAuth } from "../context/AuthContext";
import { getCases, seedDemoData } from "../services/api";
import type { CaseSummary } from "../types/workspace";

type CaseFilter = "MY_CASES" | "ALL" | "ACTIVE" | "COMPLETED" | "ARCHIVED";

export function CasesPage() {
  const { investigator, recordAudit } = useAuth();
  const [rows, setRows] = useState<CaseSummary[] | null>(null);
  const [filter, setFilter] = useState<CaseFilter>("MY_CASES");
  const [error, setError] = useState("");
  const [seeding, setSeeding] = useState(false);
  const load = () => {
    setError("");
    getCases().then(setRows).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to load assigned cases."));
  };

  async function loadDemoData() {
    setSeeding(true);
    setError("");
    try {
      await seedDemoData(true);
      load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to seed synthetic demonstration data.");
    } finally {
      setSeeding(false);
    }
  }

  useEffect(load, []);

  const visibleRows = useMemo(() => (rows ?? []).filter((item) => {
    if (filter === "ALL") return true;
    if (filter === "MY_CASES") {
      return investigator?.permissions.canViewAllCases
        ? item.assigned_investigator?.investigator_id === investigator.id || item.last_modified_by?.investigator_id === investigator.id || item.created_by?.investigator_id === investigator.id
        : item.assigned_investigator?.investigator_id === investigator?.id;
    }
    if (filter === "COMPLETED") return item.status === "CLOSED";
    return item.status === filter;
  }), [filter, investigator, rows]);

  if (error) return <ErrorState label="Unable to load assigned cases." detail={error.includes("401") ? `${error}. Sign in again after running backend migrations and seed data.` : error} retry={load} />;
  if (!rows) return <LoadingState />;

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Investigation registry</p>
          <h1>Cases</h1>
          <p className="muted">{investigator?.name} - {investigator?.role_label}</p>
        </div>
        <div className="quick-links">
          {(["MY_CASES", "ALL", "ACTIVE", "COMPLETED", "ARCHIVED"] as CaseFilter[]).map((item) => (
            <button className={`veil-button ${filter === item ? "" : "secondary"}`} key={item} onClick={() => setFilter(item)}>{item.replace("_", " ")}</button>
          ))}
          <button className="veil-button secondary" disabled={seeding} onClick={loadDemoData} title="Re-sync synthetic demo cases into backend database">{seeding ? "Syncing..." : "Sync Demo Data"}</button>
        </div>
      </header>
      {visibleRows.length ? (
        <div className="veil-panel veil-table-wrap">
          <table className="veil-table">
            <thead><tr><th>Case</th><th>Title</th><th>Owner</th><th>Risk</th><th>Status</th><th>Updated</th></tr></thead>
            <tbody>{visibleRows.map((item) => (
              <tr key={item.id}>
                <td><Link to={`/cases/${item.id}`} onClick={() => recordAudit({ action: "OPEN_CASE", target_type: "CASE", target_id: item.case_number, summary: `Opened ${item.case_number}.` })}>{item.case_number}</Link></td>
                <td>{item.title}</td>
                <td>{item.assigned_investigator?.name ?? "Unassigned"}</td>
                <td><span className={`status-pill ${item.risk_level}`}>{item.priority_score ?? 0} / 100</span></td>
                <td><span className={`status-pill ${item.status}`}>{item.status}</span></td>
                <td>{new Date(item.updated_at).toLocaleDateString()}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : (
        <div className="veil-panel">
          <div className="panel-body stack-list">
            <EmptyState label={rows.length ? "No cases match this investigator filter. Switch to All." : "No cases exist yet in this database."} />
            {!rows.length ? <button className="veil-button" disabled={seeding} onClick={loadDemoData}>{seeding ? "Loading demo data..." : "Load synthetic demonstration data"}</button> : null}
          </div>
        </div>
      )}
    </section>
  );
}
