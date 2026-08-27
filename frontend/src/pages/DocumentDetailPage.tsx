import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

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
      setError("Invalid document id.");
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
        setError(err instanceof Error ? err.message : "Unable to load document.");
      }
    }
    void load();
  }, [documentId]);

  return (
    <section className="flex flex-col gap-6 py-8">
      <div>
        <Link className="text-sm font-semibold text-signal underline underline-offset-4" to="/documents">
          Back to documents
        </Link>
        <h1 className="mt-3 text-3xl font-semibold">Document Detail</h1>
      </div>

      {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      {detail ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Metric label="Filename" value={detail.filename} />
            <Metric label="Status" value={detail.status} />
            <Metric label="Case" value={detail.case_id} />
            <Metric label="Type" value={detail.document_type} />
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <Metric label="Entities" value={detail.extraction_summary.entities} />
            <Metric label="Relationships" value={detail.extraction_summary.relationships} />
            <Metric label="Evidence" value={detail.extraction_summary.evidence} />
            <Metric label="Review Required" value={detail.extraction_summary.review_required} />
          </div>
        </>
      ) : null}

      {extractions ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Panel title="Entities" value={JSON.stringify(extractions.entities, null, 2)} />
          <Panel title="Relationships" value={JSON.stringify(extractions.relationships, null, 2)} />
          <Panel title="Evidence" value={JSON.stringify(extractions.evidence, null, 2)} />
        </div>
      ) : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white p-4">
      <p className="text-sm text-ink/60">{label}</p>
      <p className="mt-1 break-words text-lg font-semibold">{value}</p>
    </div>
  );
}

function Panel({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white p-4">
      <h2 className="font-semibold">{title}</h2>
      <pre className="mt-3 max-h-96 overflow-auto rounded-md bg-surface p-3 text-xs">{value}</pre>
    </div>
  );
}
