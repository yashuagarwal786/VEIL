import { ArrowLeft, CheckCircle2, FileCode, FileSearch, FileText, Network, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/AsyncState";
import { getDocumentDetail, getDocumentExtractions } from "../services/api";
import type { DocumentDetail, DocumentExtractions } from "../types/documents";

export function DocumentDetailPage() {
  const params = useParams();
  const documentId = Number(params.id);
  const [detail, setDetail] = useState<DocumentDetail | null>(null);
  const [extractions, setExtractions] = useState<DocumentExtractions | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(documentId)) {
      setError("Invalid document identifier.");
      return;
    }
    async function load() {
      try {
        const [detailResponse, extractionResponse] = await Promise.all([
          getDocumentDetail(documentId),
          getDocumentExtractions(documentId),
        ]);
        setDetail(detailResponse);
        setExtractions(extractionResponse);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load document dossier.");
      }
    }
    void load();
  }, [documentId]);

  if (error) return <ErrorState label="Unable to load document intelligence." detail={error} />;
  if (!detail) return <LoadingState label="Loading document extractions..." />;

  return (
    <section className="page">
      <div className="breadcrumbs">
        <Link to="/documents">Documents</Link>
        <span>/</span>
        <span style={{ color: "#f8fafc", fontWeight: 600 }}>{detail.filename}</span>
      </div>

      <header className="page-header">
        <div>
          <p className="eyebrow">Document Intelligence · Forensic Extractions</p>
          <h1>{detail.filename}</h1>
          <p className="muted">Case #{detail.case_id} · Type: {detail.document_type} · Status: {detail.status}</p>
        </div>
        <div className="quick-links">
          <Link className="veil-button secondary" to="/documents">
            <ArrowLeft size={14} /> Back to Documents
          </Link>
          <Link className="veil-button" to="/documents/ingest">
            Ingest More Docs
          </Link>
        </div>
      </header>

      {/* Metric Cards */}
      <div className="metric-grid">
        <div className="metric">
          <span>Status</span>
          <strong><span className="status-pill COMPLETED">{detail.status}</span></strong>
        </div>
        <div className="metric">
          <span>Entities Found</span>
          <strong style={{ color: "#38bdf8" }}>{detail.extraction_summary.entities}</strong>
        </div>
        <div className="metric">
          <span>Relationships</span>
          <strong style={{ color: "#34d399" }}>{detail.extraction_summary.relationships}</strong>
        </div>
        <div className="metric">
          <span>Evidence Items</span>
          <strong style={{ color: "#fbbf24" }}>{detail.extraction_summary.evidence}</strong>
        </div>
        <div className="metric">
          <span>Review Required</span>
          <strong style={{ color: detail.extraction_summary.review_required > 0 ? "#f87171" : "#34d399" }}>
            {detail.extraction_summary.review_required}
          </strong>
        </div>
      </div>

      {extractions ? (
        <div className="veil-grid-3">
          <section className="veil-panel">
            <div className="panel-head">
              <h2>Entities ({extractions.entities.length})</h2>
            </div>
            <div className="panel-body">
              <pre style={{ maxHeight: "380px", overflow: "auto", fontSize: "11px", color: "#bad0dc" }}>
                {JSON.stringify(extractions.entities, null, 2)}
              </pre>
            </div>
          </section>

          <section className="veil-panel">
            <div className="panel-head">
              <h2>Relationships ({extractions.relationships.length})</h2>
            </div>
            <div className="panel-body">
              <pre style={{ maxHeight: "380px", overflow: "auto", fontSize: "11px", color: "#bad0dc" }}>
                {JSON.stringify(extractions.relationships, null, 2)}
              </pre>
            </div>
          </section>

          <section className="veil-panel">
            <div className="panel-head">
              <h2>Evidence ({extractions.evidence.length})</h2>
            </div>
            <div className="panel-body">
              <pre style={{ maxHeight: "380px", overflow: "auto", fontSize: "11px", color: "#bad0dc" }}>
                {JSON.stringify(extractions.evidence, null, 2)}
              </pre>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
