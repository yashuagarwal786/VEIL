export type ProcessingStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export type DocumentUploadResult = {
  document_id: number;
  filename: string;
  status: ProcessingStatus;
};

export type DocumentProcessingResult = {
  document_id: number;
  status: ProcessingStatus;
  entities_found: number;
  relationships_found: number;
  evidence_created: number;
  review_required: number;
  graph_sync_status: string;
};

export type DocumentStatus = {
  document_id: number;
  filename: string;
  status: ProcessingStatus;
  processing_started_at: string | null;
  processing_completed_at: string | null;
  error_message: string | null;
  extracted_text_length: number | null;
};

export type DocumentDetail = DocumentStatus & {
  case_id: number;
  document_type: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  upload_timestamp: string;
  extraction_summary: {
    entities: number;
    relationships: number;
    evidence: number;
    review_required: number;
  };
};

export type Extraction = {
  id: number;
  kind: string;
  entity_type: string;
  text: string;
  normalized_value: string;
  confidence: number;
  page: number | null;
  source_reference: string | null;
  source_context: string | null;
  review_status: string;
};

export type RelationshipExtraction = {
  id: number;
  relationship_type: string;
  source_entity: string;
  target_entity: string;
  confidence: number;
  page: number | null;
  source_reference: string | null;
  source_text: string;
  review_status: string;
};

export type DocumentExtractions = {
  document_id: number;
  status: ProcessingStatus;
  entities: Extraction[];
  relationships: RelationshipExtraction[];
  evidence: Array<Record<string, unknown>>;
};

export type EntityMatch = {
  id: number;
  extraction_id: number;
  case_id: number;
  candidate_entity_type: string;
  candidate_entity_id: number | null;
  candidate_label: string | null;
  match_type: string;
  confidence: number;
  signals: Record<string, unknown> | null;
  status: string;
};

export type ReviewDecision = "ACCEPT" | "REJECT" | "DEFER";
