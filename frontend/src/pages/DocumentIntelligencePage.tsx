import { useEffect, useState } from "react";
import type { DragEvent } from "react";
import { ArrowRight, CheckCircle2, FileText, Network, Sparkles, UploadCloud } from "lucide-react";
import { Link } from "react-router-dom";

import {
  getCases,
  getDocumentExtractions,
  getEntityMatches,
  processDocument,
  reviewEntityMatch,
  reviewExtraction,
  reviewRelationship,
  uploadDocument,
} from "../services/api";
import type { DocumentExtractions, DocumentProcessingResult, DocumentUploadResult, EntityMatch, ReviewDecision } from "../types/documents";
import type { CaseSummary } from "../types/workspace";

const maxSizeBytes = 10 * 1024 * 1024;
const supportedExtensions = [".pdf", ".txt", ".csv", ".json"];

const SAMPLE_FIR_TEXT = `FIRST INFORMATION REPORT & INTERROGATION SUMMARY
Case Reference: CYBER-2026-022
Jurisdiction: Special Cyber Cell, Delhi

During the raid on 12th March 2026 at Sector 62 Noida, suspect Rajesh Sharma (Phone: +91-9811223344) was apprehended operating a VoIP gateway.
Rajesh Sharma disclosed that he works for Vikram Malhotra and routinely transferred ₹2,50,000 to Vikram Malhotra via UPI ID vikram.malhotra@okhdfcbank.

Further analysis of CDR records revealed that Rajesh Sharma called Amit Verma (+91-9876543210) over 45 times in the last 7 days.
Amit Verma operates dummy bank account no. 918273645019 at HDFC Bank Connaught Place and transferred ₹1,80,000 to Meera Kapoor.
Suspect vehicle DL-01-AB-1234 registered to Sanjay Gupta was spotted near Jaipur Railway Station meeting Amit Verma.`;

const SAMPLE_HAWALA_TEXT = `FINANCIAL INTELLIGENCE NOTE - CRYPTO & HAWALA ROUTING
Case Reference: HAWALA-2026-088
Reporting Unit: Enforcement & Economic Intelligence

Interrogation of Mule Account Holder Tariq Khan (Phone: +91-9988776655, Account: 50100492817263 at Axis Bank Mumbai):
Tariq Khan confirmed he received multiple deposits totaling ₹15,00,000 from Rohit Kapoor and transferred ₹12,00,000 to Imran Qureshi.
Imran Qureshi operates from Bandra Kurla Complex and frequently contacted Deepak Agarwal for crypto conversion.
Deepak Agarwal transferred ₹8,50,000 to Sunita Rawat towards settlement of offshore SIM box logistics.`;

export function DocumentIntelligencePage() {
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [caseId, setCaseId] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [upload, setUpload] = useState<DocumentUploadResult | null>(null);
  const [processing, setProcessing] = useState<DocumentProcessingResult | null>(null);
  const [extractions, setExtractions] = useState<DocumentExtractions | null>(null);
  const [matches, setMatches] = useState<EntityMatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getCases().then((rows) => {
      setCases(rows);
      if (rows.length && !rows.some((c) => c.id === caseId)) {
        setCaseId(rows[0].id);
      }
    }).catch(() => {});
  }, []);

  const currentCase = cases.find((c) => c.id === caseId);

  function selectFile(nextFile: File | null) {
    setError(null);
    if (!nextFile) {
      setFile(null);
      return;
    }
    const extension = nextFile.name.slice(nextFile.name.lastIndexOf(".")).toLowerCase();
    if (!supportedExtensions.includes(extension)) {
      setError("Unsupported file type. Please upload a PDF, TXT, CSV, or JSON document.");
      return;
    }
    if (nextFile.size > maxSizeBytes) {
      setError("File is larger than 10 MB.");
      return;
    }
    setFile(nextFile);
  }

  function loadSample(sampleText: string, sampleFilename: string) {
    const blob = new Blob([sampleText], { type: "text/plain" });
    const sampleFile = new File([blob], sampleFilename, { type: "text/plain" });
    selectFile(sampleFile);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    selectFile(event.dataTransfer.files[0] ?? null);
  }

  async function uploadAndProcess() {
    if (!file) {
      setError("Choose or load a document first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const uploaded = await uploadDocument(caseId, file);
      setUpload(uploaded);
      const result = await processDocument(uploaded.document_id);
      setProcessing(result);
      setExtractions(await getDocumentExtractions(uploaded.document_id));
      setMatches(await getEntityMatches(caseId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Document processing failed.");
    } finally {
      setBusy(false);
    }
  }

  async function review(matchId: number, decision: ReviewDecision) {
    await reviewEntityMatch(matchId, decision);
    setMatches(await getEntityMatches(caseId));
  }

  async function reviewEntityExtraction(extractionId: number, decision: ReviewDecision) {
    await reviewExtraction(extractionId, decision);
    if (upload) {
      setExtractions(await getDocumentExtractions(upload.document_id));
    }
  }

  async function reviewRelationshipExtraction(relationshipId: number, decision: ReviewDecision) {
    await reviewRelationship(relationshipId, decision);
    if (upload) {
      setExtractions(await getDocumentExtractions(upload.document_id));
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Document Intelligence & Knowledge Graph Ingestion</p>
          <h1>Ingest & Extract Provenance</h1>
          <p className="muted">Extract entities, trace relationships, and synchronize automatically to the Neo4j Knowledge Graph</p>
        </div>
        {processing?.status === "COMPLETED" && currentCase && (
          <Link className="veil-button" to={`/network?case=${encodeURIComponent(currentCase.case_number)}&case_id=${currentCase.id}`}>
            <Network size={15} /> Explore Case Graph <ArrowRight size={14} />
          </Link>
        )}
      </header>

      <div className="veil-panel">
        <div className="panel-head"><h2><UploadCloud size={16} style={{ display: "inline", marginRight: "6px", verticalAlign: "middle" }} /> Ingest Investigation Document</h2></div>
        <div className="panel-body form-stack">
          <div style={{ display: "grid", gridTemplateColumns: "240px 1fr auto", gap: "16px", alignItems: "end" }}>
            <label>
              Target Investigation Case
              <select className="veil-select" value={caseId} onChange={(e) => setCaseId(Number(e.target.value))}>
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>{c.case_number} - {c.title.slice(0, 32)}</option>
                ))}
              </select>
            </label>

            <div
              style={{
                border: "2px dashed #1e3a47",
                borderRadius: "8px",
                padding: "20px",
                textAlign: "center",
                backgroundColor: "#07141b",
                cursor: "pointer",
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={onDrop}
            >
              <label style={{ cursor: "pointer", display: "block" }}>
                <input className="hidden" style={{ display: "none" }} type="file" accept=".pdf,.txt,.csv,.json" onChange={(event) => selectFile(event.target.files?.[0] ?? null)} />
                <FileText size={24} style={{ margin: "0 auto 6px", color: "#67d3e7" }} />
                <div>{file ? <strong style={{ color: "#ecf5f7" }}>{file.name} ({(file.size / 1024).toFixed(1)} KB)</strong> : "Drag & drop PDF, TXT, CSV, or click to browse"}</div>
              </label>
            </div>

            <button className="veil-button" style={{ height: "42px" }} disabled={busy || !file} onClick={() => void uploadAndProcess()}>
              {busy ? "Processing & Syncing..." : "Upload & Sync Graph"}
            </button>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "8px" }}>
            <span style={{ fontSize: "12px", color: "#849ba5" }}><Sparkles size={12} style={{ display: "inline", marginRight: "4px" }} /> Quick Demo Templates:</span>
            <button type="button" className="veil-button secondary" style={{ fontSize: "11px", padding: "3px 8px" }} onClick={() => loadSample(SAMPLE_FIR_TEXT, "FIR_Raid_Interrogation_Noida.txt")}>
              Load Sample FIR / Interrogation Note
            </button>
            <button type="button" className="veil-button secondary" style={{ fontSize: "11px", padding: "3px 8px" }} onClick={() => loadSample(SAMPLE_HAWALA_TEXT, "Hawala_Crypto_Routing_Log.txt")}>
              Load Financial / Hawala Ledger
            </button>
          </div>

          {error && <div className="veil-error" style={{ marginTop: "10px" }}>{error}</div>}
        </div>
      </div>

      {processing && (
        <div className="metric-grid">
          <div className="metric"><span>Document</span><strong>{upload?.filename ?? "None"}</strong></div>
          <div className="metric"><span>Status</span><strong><span className="status-pill COMPLETED">{processing.status}</span></strong></div>
          <div className="metric"><span>Entities Extracted</span><strong>{processing.entities_found}</strong></div>
          <div className="metric"><span>Relationships</span><strong>{processing.relationships_found}</strong></div>
          <div className="metric"><span>Neo4j Graph Status</span><strong><span className="status-pill ACTIVE">{processing.graph_sync_status}</span></strong></div>
        </div>
      )}

      {processing?.status === "COMPLETED" && currentCase && (
        <div className="veil-panel" style={{ borderLeft: "4px solid #34d399", background: "#06231c", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <CheckCircle2 size={24} style={{ color: "#34d399" }} />
            <div>
              <strong style={{ color: "#ecfdf5", fontSize: "15px" }}>Knowledge Graph Generated & Synced in Neo4j</strong>
              <p style={{ color: "#a7f3d0", fontSize: "12px", margin: "2px 0 0" }}>All extracted suspects, accounts, phones, and transactions have been linked to {currentCase.case_number}.</p>
            </div>
          </div>
          <Link className="veil-button" to={`/network?case=${encodeURIComponent(currentCase.case_number)}&case_id=${currentCase.id}`}>
            <Network size={15} /> View in Interactive Graph
          </Link>
        </div>
      )}

      {extractions ? (
        <div className="veil-grid-2">
          <section className="veil-panel">
            <div className="panel-head"><h2>Extracted Entities ({extractions.entities.length})</h2></div>
            <div className="panel-body stack-list">
              {extractions.entities.map((item) => (
                <div key={item.id} className="stack-row">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ color: "#ecf5f7" }}>{item.text}</strong>
                    <span className="status-pill">{Math.round(item.confidence * 100)}%</span>
                  </div>
                  <small className="muted">{item.entity_type} · {item.source_reference}</small>
                  <p style={{ fontSize: "11px", color: "#8ea3ad", margin: "4px 0" }}>{item.source_context}</p>
                  <div className="quick-links" style={{ marginTop: "4px" }}>
                    {(["ACCEPT", "REJECT", "DEFER"] as ReviewDecision[]).map((decision) => (
                      <button key={decision} className="veil-button secondary" style={{ fontSize: "10px", padding: "2px 6px" }} onClick={() => void reviewEntityExtraction(item.id, decision)}>
                        {decision}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {!extractions.entities.length && <p className="muted">No entities extracted.</p>}
            </div>
          </section>

          <section className="veil-panel">
            <div className="panel-head"><h2>Extracted Relationships ({extractions.relationships.length})</h2></div>
            <div className="panel-body stack-list">
              {extractions.relationships.map((item) => (
                <div key={item.id} className="stack-row">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ color: "#38bdf8" }}>{item.source_entity} &rarr; [{item.relationship_type}] &rarr; {item.target_entity}</strong>
                    <span className="status-pill">{Math.round(item.confidence * 100)}%</span>
                  </div>
                  <p style={{ fontSize: "11px", color: "#8ea3ad", margin: "4px 0" }}>{item.source_text}</p>
                  <div className="quick-links" style={{ marginTop: "4px" }}>
                    {(["ACCEPT", "REJECT", "DEFER"] as ReviewDecision[]).map((decision) => (
                      <button key={decision} className="veil-button secondary" style={{ fontSize: "10px", padding: "2px 6px" }} onClick={() => void reviewRelationshipExtraction(item.id, decision)}>
                        {decision}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {!extractions.relationships.length && <p className="muted">No relationships extracted.</p>}
            </div>
          </section>
        </div>
      ) : null}

      {matches.length > 0 && (
        <section className="veil-panel">
          <div className="panel-head"><h2>Entity Resolution Matches ({matches.length})</h2></div>
          <div className="panel-body stack-list">
            {matches.map((match) => (
              <div key={match.id} className="stack-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong>{match.candidate_label ?? "No existing entity"}</strong>
                  <small className="muted"> {match.match_type} · {Math.round(match.confidence * 100)}% · {match.status}</small>
                </div>
                <div className="quick-links">
                  {(["ACCEPT", "REJECT", "DEFER"] as ReviewDecision[]).map((decision) => (
                    <button key={decision} className="veil-button secondary" style={{ fontSize: "11px", padding: "3px 8px" }} onClick={() => void review(match.id, decision)}>
                      {decision}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
