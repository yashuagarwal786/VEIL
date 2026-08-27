import { useState } from "react";
import type { DragEvent, ReactNode } from "react";

import {
  getDocumentExtractions,
  getEntityMatches,
  processDocument,
  reviewExtraction,
  reviewEntityMatch,
  reviewRelationship,
  uploadDocument,
} from "../services/api";
import type { DocumentExtractions, DocumentProcessingResult, DocumentUploadResult, EntityMatch, ReviewDecision } from "../types/documents";

const maxSizeBytes = 10 * 1024 * 1024;
const supportedExtensions = [".pdf", ".txt", ".csv", ".json"];

export function DocumentIntelligencePage() {
  const [caseId, setCaseId] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [upload, setUpload] = useState<DocumentUploadResult | null>(null);
  const [processing, setProcessing] = useState<DocumentProcessingResult | null>(null);
  const [extractions, setExtractions] = useState<DocumentExtractions | null>(null);
  const [matches, setMatches] = useState<EntityMatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function selectFile(nextFile: File | null) {
    setError(null);
    if (!nextFile) {
      setFile(null);
      return;
    }
    const extension = nextFile.name.slice(nextFile.name.lastIndexOf(".")).toLowerCase();
    if (!supportedExtensions.includes(extension)) {
      setError("Unsupported file type.");
      return;
    }
    if (nextFile.size > maxSizeBytes) {
      setError("File is larger than 10 MB.");
      return;
    }
    setFile(nextFile);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    selectFile(event.dataTransfer.files[0] ?? null);
  }

  async function uploadAndProcess() {
    if (!file) {
      setError("Choose a document first.");
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
    <section className="flex flex-col gap-6 py-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-signal">Document Intelligence</p>
        <h1 className="mt-2 text-3xl font-semibold">Extract, Review, Preserve Provenance</h1>
      </div>

      <div className="rounded-lg border border-ink/10 bg-white p-5">
        <div className="grid gap-4 md:grid-cols-[160px_1fr_auto] md:items-end">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Case ID
            <input className="h-10 rounded-md border border-ink/15 px-3" min={1} type="number" value={caseId} onChange={(event) => setCaseId(Number(event.target.value))} />
          </label>
          <div
            className="flex min-h-28 items-center justify-center rounded-lg border border-dashed border-ink/25 bg-surface px-4 text-center"
            onDragOver={(event) => event.preventDefault()}
            onDrop={onDrop}
          >
            <label className="cursor-pointer text-sm">
              <input className="hidden" type="file" accept=".pdf,.txt,.csv,.json" onChange={(event) => selectFile(event.target.files?.[0] ?? null)} />
              {file ? file.name : "Drop a PDF, TXT, CSV, or JSON document here, or choose a file"}
            </label>
          </div>
          <button className="h-10 rounded-md bg-signal px-4 font-semibold text-white disabled:opacity-60" disabled={busy} onClick={() => void uploadAndProcess()}>
            {busy ? "Processing" : "Upload & Process"}
          </button>
        </div>
        {error ? <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Document" value={upload?.filename ?? "None"} />
        <Metric label="Status" value={processing?.status ?? upload?.status ?? "Idle"} />
        <Metric label="Entities" value={processing?.entities_found ?? 0} />
        <Metric label="Relationships" value={processing?.relationships_found ?? 0} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Metric label="Evidence Created" value={processing?.evidence_created ?? 0} />
        <Metric label="Review Required" value={processing?.review_required ?? 0} />
      </div>

      {extractions ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Entities">
            {extractions.entities.map((item) => (
              <div key={item.id} className="mb-3 rounded-md bg-surface p-3 text-sm">
                <div className="flex justify-between gap-3 font-semibold">
                  <span>{item.text}</span>
                  <span>{Math.round(item.confidence * 100)}%</span>
                </div>
                <div className="mt-1 text-ink/60">{item.entity_type} · {item.source_reference}</div>
                <div className="mt-2 text-xs text-ink/70">{item.source_context}</div>
                <ReviewButtons onReview={(decision) => void reviewEntityExtraction(item.id, decision)} />
              </div>
            ))}
          </Panel>
          <Panel title="Relationships">
            {extractions.relationships.map((item) => (
              <div key={item.id} className="mb-3 rounded-md bg-surface p-3 text-sm">
                <div className="font-semibold">
                  {item.source_entity} &gt; {item.relationship_type} &gt; {item.target_entity}
                </div>
                <div className="mt-1 text-ink/60">Extraction Confidence {Math.round(item.confidence * 100)}% · {item.source_reference}</div>
                <div className="mt-2 text-xs text-ink/70">{item.source_text}</div>
                <ReviewButtons onReview={(decision) => void reviewRelationshipExtraction(item.id, decision)} />
              </div>
            ))}
          </Panel>
        </div>
      ) : null}

      <Panel title="Entity Resolution Review">
        {matches.map((match) => (
          <div key={match.id} className="mb-3 rounded-md bg-surface p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold">{match.candidate_label ?? "No existing entity"}</div>
                <div className="text-ink/60">{match.match_type} · {Math.round(match.confidence * 100)}% · {match.status}</div>
              </div>
              <div className="flex gap-2">
                {(["ACCEPT", "REJECT", "DEFER"] as ReviewDecision[]).map((decision) => (
                  <button key={decision} className="rounded-md border border-ink/15 px-3 py-2 text-xs font-semibold" onClick={() => void review(match.id, decision)}>
                    {decision}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </Panel>
    </section>
  );
}

function ReviewButtons({ onReview }: { onReview: (decision: ReviewDecision) => void }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {(["ACCEPT", "REJECT", "DEFER"] as ReviewDecision[]).map((decision) => (
        <button key={decision} className="rounded-md border border-ink/15 px-3 py-1.5 text-xs font-semibold" onClick={() => onReview(decision)}>
          {decision}
        </button>
      ))}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white p-4">
      <p className="text-sm text-ink/60">{label}</p>
      <p className="mt-1 break-words text-xl font-semibold">{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white p-4">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-3 max-h-96 overflow-auto">{children}</div>
    </div>
  );
}
