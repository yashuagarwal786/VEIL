import { FileSearch, FileText, Filter, Link as LinkIcon, Search, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState } from "../components/AsyncState";
import { useCaseContext } from "../context/CaseContext";
import { getEvidence } from "../services/api";
import type { EvidenceItem } from "../types/workspace";

export function EvidencePage() {
  const { caseId } = useCaseContext();
  const [query, setQuery] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [rows, setRows] = useState<EvidenceItem[] | null>(null);
  const [selected, setSelected] = useState<EvidenceItem | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const timer = setTimeout(
      () =>
        getEvidence(caseId, query, confidence)
          .then((data) => {
            setRows(data);
            if (data.length > 0 && !selected) {
              setSelected(data[0]);
            }
          })
          .catch(() => setError(true)),
      200,
    );
    return () => clearTimeout(timer);
  }, [caseId, query, confidence]);

  if (error) return <ErrorState label="Unable to load evidence provenance repository." />;

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Chain of Custody · Evidence Provenance</p>
          <h1>Evidence Explorer</h1>
          <p className="muted">Forensic source records, extracted snippets, and confidence ratings</p>
        </div>
        <div className="quick-links">
          <div style={{ position: "relative", width: "260px" }}>
            <Search size={14} style={{ position: "absolute", left: "10px", top: "10px", color: "#6a8696" }} />
            <input
              className="veil-input"
              style={{ width: "100%", paddingLeft: "30px" }}
              aria-label="Search evidence"
              placeholder="Search snippet text or reference..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            className="veil-select"
            aria-label="Minimum confidence"
            value={confidence}
            onChange={(e) => setConfidence(Number(e.target.value))}
          >
            <option value={0}>All Confidence Levels</option>
            <option value={0.7}>70%+ High Confidence</option>
            <option value={0.9}>90%+ Verified Only</option>
          </select>
        </div>
      </header>

      {!rows ? (
        <LoadingState label="Loading forensic evidence..." />
      ) : rows.length ? (
        <div className="veil-grid-2">
          <div className="veil-panel veil-table-wrap">
            <table className="veil-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Source Material</th>
                  <th>Snippet Preview</th>
                  <th style={{ textAlign: "right" }}>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isSelected = selected?.id === row.id;
                  const confPct = Math.round(row.confidence * 100);
                  return (
                    <tr
                      key={row.id}
                      onClick={() => setSelected(row)}
                      style={{
                        cursor: "pointer",
                        background: isSelected ? "#10212f" : undefined,
                        borderLeft: isSelected ? "3px solid #38bdf8" : "3px solid transparent",
                      }}
                    >
                      <td>
                        <span className="status-pill HIGH">{row.type}</span>
                      </td>
                      <td>
                        <strong style={{ color: "#edf4f7", fontSize: "12px", display: "block" }}>
                          {row.document_name ?? "Direct Ingest"}
                        </strong>
                        <small className="muted" style={{ fontSize: "10px" }}>
                          {row.source_reference ?? "No locator"}
                        </small>
                      </td>
                      <td style={{ maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#bad0dc" }}>
                        {row.content}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <span
                          className={`status-pill ${confPct >= 85 ? "NORMAL" : confPct >= 65 ? "HIGH" : "ATTENTION"}`}
                        >
                          {confPct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Right: Detailed Forensic Inspector */}
          <aside className="veil-panel">
            <div className="panel-head">
              <h2>
                <ShieldCheck size={14} style={{ display: "inline", marginRight: "6px", verticalAlign: "middle" }} className="text-cyber-cyan" />
                Forensic Provenance Details
              </h2>
            </div>
            <div className="panel-body">
              {selected ? (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <span className="status-pill HIGH">{selected.type}</span>
                    <span className="status-pill NORMAL">{Math.round(selected.confidence * 100)}% CONFIDENCE</span>
                  </div>

                  <div style={{ background: "#060c12", padding: "12px 14px", borderRadius: "4px", border: "1px solid #142434", marginBottom: "14px" }}>
                    <span style={{ fontSize: "10px", color: "#38bdf8", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.06em", display: "block", marginBottom: "4px" }}>
                      Extracted Text Content
                    </span>
                    <p style={{ margin: 0, fontSize: "13px", color: "#edf4f7", lineHeight: 1.5 }}>
                      &ldquo;{selected.content}&rdquo;
                    </p>
                  </div>

                  <dl className="detail-list" style={{ marginBottom: "16px" }}>
                    <dt>Source Document</dt>
                    <dd>{selected.document_name ?? "Direct Record Entry"}</dd>
                    <dt>Reference Locator</dt>
                    <dd>{selected.source_reference ?? "Unspecified"}</dd>
                    <dt>Recorded Date</dt>
                    <dd>{new Date(selected.created_at).toLocaleString()}</dd>
                    <dt>Case Scope</dt>
                    <dd>CASE #{selected.case_id}</dd>
                  </dl>

                  <div className="quick-links">
                    {selected.document_id ? (
                      <Link className="veil-button" to={`/documents/${selected.document_id}`}>
                        <FileText size={14} /> Open Source Document
                      </Link>
                    ) : null}
                    <Link className="veil-button secondary" to="/network">
                      <LinkIcon size={14} /> View in Graph
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="muted">Select an evidence item to inspect its provenance and source locator.</p>
              )}
            </div>
          </aside>
        </div>
      ) : (
        <EmptyState label="No evidence records found matching the active criteria." />
      )}
    </section>
  );
}
