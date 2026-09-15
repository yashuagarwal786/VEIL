import { FileText, Files, Plus, UploadCloud } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState } from "../components/AsyncState";
import { useCaseContext } from "../context/CaseContext";
import { getDocuments } from "../services/api";
import type { DocumentListItem } from "../types/workspace";

export function DocumentsPage() {
  const { caseId } = useCaseContext();
  const [rows, setRows] = useState<DocumentListItem[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getDocuments(caseId)
      .then(setRows)
      .catch(() => setError(true));
  }, [caseId]);

  if (error) return <ErrorState label="Unable to load case document repository." />;
  if (!rows) return <LoadingState label="Loading document repository..." />;

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Evidence Corpus · Source Ingestion</p>
          <h1>Documents</h1>
          <p className="muted">FIRs, interrogation notes, bank statements, CDR logs, and forensic extractions</p>
        </div>
        <div className="quick-links">
          <Link className="veil-button" to="/documents/ingest">
            <UploadCloud size={14} /> Ingest Document & Sync Graph
          </Link>
        </div>
      </header>

      {rows.length ? (
        <div className="veil-panel veil-table-wrap">
          <table className="veil-table">
            <thead>
              <tr>
                <th>Document Name</th>
                <th>Category / Type</th>
                <th>Processing Status</th>
                <th>Uploaded At</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <FileText size={15} className="text-cyber-cyan" />
                      <Link to={`/documents/${row.id}`} style={{ fontWeight: 700 }}>
                        {row.filename}
                      </Link>
                    </div>
                  </td>
                  <td>
                    <span className="status-pill NORMAL">{row.document_type}</span>
                  </td>
                  <td>
                    <span className={`status-pill ${row.status === "COMPLETED" || row.status === "PROCESSED" ? "NORMAL" : "HIGH"}`}>
                      {row.status}
                    </span>
                  </td>
                  <td style={{ fontFamily: "ui-monospace, monospace" }}>
                    {new Date(row.uploaded_at).toLocaleString()}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Link className="veil-button secondary" style={{ height: "26px", padding: "0 8px", fontSize: "11px" }} to={`/documents/${row.id}`}>
                      View Extractions
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="veil-panel">
          <div className="panel-body stack-list" style={{ textAlign: "center", padding: "32px" }}>
            <EmptyState label="No documents uploaded for this case yet." />
            <div style={{ marginTop: "12px" }}>
              <Link className="veil-button" to="/documents/ingest">
                <UploadCloud size={14} /> Ingest First Case Document
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
