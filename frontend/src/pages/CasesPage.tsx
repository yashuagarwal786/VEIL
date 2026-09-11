import { useEffect, useMemo, useState } from "react";
import { FolderPlus, Plus, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState } from "../components/AsyncState";
import { useAuth } from "../context/AuthContext";
import { createCase, getCases, seedDemoData } from "../services/api";
import type { CaseSummary } from "../types/workspace";

type CaseFilter = "MY_CASES" | "ALL" | "ACTIVE" | "COMPLETED" | "ARCHIVED";

export function CasesPage() {
  const { investigator, recordAudit } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<CaseSummary[] | null>(null);
  const [filter, setFilter] = useState<CaseFilter>("MY_CASES");
  const [error, setError] = useState("");
  const [seeding, setSeeding] = useState(false);

  // New Case Modal State
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newRef, setNewRef] = useState("");
  const [newType, setNewType] = useState("CYBER_CRIME");
  const [newPriority, setNewPriority] = useState("HIGH");
  const [newJurisdiction, setNewJurisdiction] = useState("Delhi Cyber Crime Unit");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

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

  async function handleCreateCase(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) {
      setCreateError("Please enter a case title.");
      return;
    }
    setCreating(true);
    setCreateError("");
    try {
      const created = await createCase({
        title: newTitle.trim(),
        case_reference: newRef.trim() || undefined,
        case_type: newType,
        priority: newPriority,
        jurisdiction: newJurisdiction.trim(),
        description: newDescription.trim() || undefined,
      });
      setShowModal(false);
      setNewTitle("");
      setNewRef("");
      setNewDescription("");
      recordAudit({ action: "CREATE_CASE", target_type: "CASE", target_id: created.case_number, summary: `Created case ${created.case_number}.` });
      navigate(`/cases/${created.id}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create case.");
    } finally {
      setCreating(false);
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
          <button className="veil-button" onClick={() => setShowModal(true)}><Plus size={15} /> New Case Intake</button>
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
            <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
              <button className="veil-button" onClick={() => setShowModal(true)}><Plus size={15} /> Create First Case</button>
              {!rows.length ? <button className="veil-button secondary" disabled={seeding} onClick={loadDemoData}>{seeding ? "Loading demo data..." : "Load synthetic demonstration data"}</button> : null}
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(3, 7, 18, 0.85)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          backdropFilter: "blur(4px)",
          padding: "20px",
        }}>
          <div className="veil-panel" style={{ width: "100%", maxWidth: "560px", maxHeight: "90vh", overflowY: "auto" }}>
            <div className="panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2><FolderPlus size={18} style={{ display: "inline", marginRight: "8px", verticalAlign: "middle" }} /> Open New Investigation Case</h2>
              <button className="veil-button secondary" onClick={() => setShowModal(false)} style={{ padding: "4px 8px" }}><X size={16} /></button>
            </div>
            <form onSubmit={handleCreateCase} className="panel-body form-stack">
              {createError && <div className="veil-error" style={{ marginBottom: "10px" }}>{createError}</div>}
              
              <label>
                Case Title *
                <input
                  className="veil-input"
                  required
                  placeholder="e.g. Pune Hawala & Crypto Extortion Ring"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <label>
                  Case Reference (Optional)
                  <input
                    className="veil-input"
                    placeholder="e.g. CYBER-2026-015"
                    value={newRef}
                    onChange={(e) => setNewRef(e.target.value)}
                  />
                </label>
                <label>
                  Case Type
                  <select className="veil-select" value={newType} onChange={(e) => setNewType(e.target.value)}>
                    <option value="CYBER_CRIME">Cyber Crime</option>
                    <option value="FINANCIAL_FRAUD">Financial Fraud / Hawala</option>
                    <option value="EXTORTION">Voice Phishing / Extortion</option>
                    <option value="IDENTITY_THEFT">Identity Theft / SIM Box</option>
                    <option value="NARCOTICS">Narcotics Syndicate</option>
                    <option value="GENERAL">General Investigation</option>
                  </select>
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <label>
                  Priority Level
                  <select className="veil-select" value={newPriority} onChange={(e) => setNewPriority(e.target.value)}>
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </label>
                <label>
                  Jurisdiction / Unit
                  <input
                    className="veil-input"
                    placeholder="e.g. Cyber Crime Unit Delhi"
                    value={newJurisdiction}
                    onChange={(e) => setNewJurisdiction(e.target.value)}
                  />
                </label>
              </div>

              <label>
                Case Summary / Description
                <textarea
                  className="veil-input"
                  rows={3}
                  placeholder="Provide background context, complainant details, initial intelligence notes..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  style={{ resize: "vertical" }}
                />
              </label>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button type="button" className="veil-button secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="veil-button" disabled={creating}>
                  {creating ? "Opening Case..." : "Create & Open Case"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
