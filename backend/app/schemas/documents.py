from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.models.enums import MatchDecision, ProcessingStatus


class DocumentUploadResponse(BaseModel):
    document_id: int
    filename: str
    status: ProcessingStatus


class DocumentStatusResponse(BaseModel):
    document_id: int
    filename: str
    status: ProcessingStatus
    processing_started_at: datetime | None
    processing_completed_at: datetime | None
    error_message: str | None
    extracted_text_length: int | None


class DocumentProcessingResponse(BaseModel):
    document_id: int
    status: ProcessingStatus
    entities_found: int
    relationships_found: int
    evidence_created: int
    review_required: int
    graph_sync_status: str


class ExtractionResponse(BaseModel):
    id: int
    kind: str
    entity_type: str
    text: str
    normalized_value: str
    confidence: float
    page: int | None
    source_reference: str | None
    source_context: str | None
    review_status: str


class RelationshipExtractionResponse(BaseModel):
    id: int
    relationship_type: str
    source_entity: str
    target_entity: str
    confidence: float
    page: int | None
    source_reference: str | None
    source_text: str
    review_status: str


class DocumentExtractionsResponse(BaseModel):
    document_id: int
    status: ProcessingStatus
    entities: list[ExtractionResponse]
    relationships: list[RelationshipExtractionResponse]
    evidence: list[dict[str, Any]] = Field(default_factory=list)


class DocumentDetailResponse(DocumentStatusResponse):
    case_id: int
    document_type: str
    mime_type: str | None
    file_size_bytes: int | None
    upload_timestamp: datetime
    extraction_summary: dict[str, int]


class MatchReviewRequest(BaseModel):
    decision: MatchDecision


class ExtractionReviewRequest(BaseModel):
    decision: MatchDecision


class EntityMatchResponse(BaseModel):
    id: int
    extraction_id: int
    case_id: int
    candidate_entity_type: str
    candidate_entity_id: int | None
    candidate_label: str | None
    match_type: str
    confidence: float
    signals: dict[str, Any] | None
    status: str
