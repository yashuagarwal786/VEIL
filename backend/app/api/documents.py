from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.db.session import SessionLocal
from app.models.document import Document
from app.models.enums import ExtractionReviewStatus, MatchDecision
from app.models.evidence import Evidence
from app.models.extraction import DocumentExtraction, ExtractedRelationship, ReviewAudit
from app.nlp.document_loader import DocumentValidationError, validate_document
from app.schemas.documents import (
    DocumentExtractionsResponse,
    DocumentDetailResponse,
    DocumentProcessingResponse,
    DocumentStatusResponse,
    DocumentUploadResponse,
    ExtractionReviewRequest,
    ExtractionResponse,
    RelationshipExtractionResponse,
)
from app.services.document_processing import DocumentProcessingService

router = APIRouter()


@router.post("/upload", response_model=DocumentUploadResponse, summary="Upload an investigation document")
async def upload_document(case_id: int = Form(...), file: UploadFile = File(...)) -> DocumentUploadResponse:
    content = await file.read()
    try:
        validated = validate_document(file.filename or "", content, file.content_type)
    except DocumentValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    with SessionLocal() as session:
        document = DocumentProcessingService(session).create_document(
            case_id=case_id,
            filename=validated.filename,
            document_type=validated.extension,
            content=validated.content,
            mime_type=validated.mime_type,
        )
        return DocumentUploadResponse(document_id=document.id, filename=document.filename, status=document.processing_status)


@router.post("/{document_id}/process", response_model=DocumentProcessingResponse, summary="Process an uploaded document")
def process_document(document_id: int) -> DocumentProcessingResponse:
    with SessionLocal() as session:
        try:
            result = DocumentProcessingService(session).process(document_id)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        return DocumentProcessingResponse(**result)


@router.get("/{document_id}/status", response_model=DocumentStatusResponse, summary="Get document processing status")
def document_status(document_id: int) -> DocumentStatusResponse:
    with SessionLocal() as session:
        document = session.get(Document, document_id)
        if not document:
            raise HTTPException(status_code=404, detail="Document not found.")
        return DocumentStatusResponse(
            document_id=document.id,
            filename=document.filename,
            status=document.processing_status,
            processing_started_at=document.processing_started_at,
            processing_completed_at=document.processing_completed_at,
            error_message=document.error_message,
            extracted_text_length=document.extracted_text_length,
        )


@router.get("/{document_id}", response_model=DocumentDetailResponse, summary="Get document detail and extraction summary")
def document_detail(document_id: int) -> DocumentDetailResponse:
    with SessionLocal() as session:
        document = session.get(Document, document_id)
        if not document:
            raise HTTPException(status_code=404, detail="Document not found.")
        entity_count = session.query(DocumentExtraction).filter(DocumentExtraction.document_id == document_id).count()
        relationship_count = session.query(ExtractedRelationship).filter(ExtractedRelationship.document_id == document_id).count()
        evidence_count = session.query(Evidence).filter(Evidence.document_id == document_id).count()
        review_count = (
            session.query(DocumentExtraction)
            .filter(
                DocumentExtraction.document_id == document_id,
                DocumentExtraction.review_status == ExtractionReviewStatus.REVIEW_REQUIRED,
            )
            .count()
            + session.query(ExtractedRelationship)
            .filter(
                ExtractedRelationship.document_id == document_id,
                ExtractedRelationship.review_status == ExtractionReviewStatus.REVIEW_REQUIRED,
            )
            .count()
        )
        return DocumentDetailResponse(
            document_id=document.id,
            filename=document.filename,
            case_id=document.case_id,
            document_type=document.document_type,
            mime_type=document.mime_type,
            file_size_bytes=document.file_size_bytes,
            upload_timestamp=document.upload_timestamp,
            status=document.processing_status,
            processing_started_at=document.processing_started_at,
            processing_completed_at=document.processing_completed_at,
            error_message=document.error_message,
            extracted_text_length=document.extracted_text_length,
            extraction_summary={
                "entities": entity_count,
                "relationships": relationship_count,
                "evidence": evidence_count,
                "review_required": review_count,
            },
        )


@router.get("/{document_id}/extractions", response_model=DocumentExtractionsResponse, summary="Get document extractions")
def document_extractions(document_id: int) -> DocumentExtractionsResponse:
    with SessionLocal() as session:
        document = session.get(Document, document_id)
        if not document:
            raise HTTPException(status_code=404, detail="Document not found.")
        entities = session.query(DocumentExtraction).filter(DocumentExtraction.document_id == document_id).all()
        relationships = session.query(ExtractedRelationship).filter(ExtractedRelationship.document_id == document_id).all()
        evidence = session.query(Evidence).filter(Evidence.document_id == document_id).all()
        return DocumentExtractionsResponse(
            document_id=document.id,
            status=document.processing_status,
            entities=[
                ExtractionResponse(
                    id=item.id,
                    kind=item.kind.value,
                    entity_type=item.entity_type,
                    text=item.extracted_text,
                    normalized_value=item.normalized_value,
                    confidence=item.confidence,
                    page=item.page_number,
                    source_reference=item.source_reference,
                    source_context=item.source_context,
                    review_status=item.review_status.value,
                )
                for item in entities
            ],
            relationships=[
                RelationshipExtractionResponse(
                    id=item.id,
                    relationship_type=item.relationship_type,
                    source_entity=item.source_entity_text,
                    target_entity=item.target_entity_text,
                    confidence=item.confidence,
                    page=item.page_number,
                    source_reference=item.source_reference,
                    source_text=item.source_text,
                    review_status=item.review_status.value,
                )
                for item in relationships
            ],
            evidence=[{"id": item.id, "type": item.evidence_type, "source_reference": item.source_reference, "confidence": item.confidence} for item in evidence],
        )


def _review_status_from_decision(decision: MatchDecision) -> ExtractionReviewStatus:
    if decision == MatchDecision.ACCEPT:
        return ExtractionReviewStatus.AUTO_ACCEPT
    if decision == MatchDecision.REJECT:
        return ExtractionReviewStatus.REJECTED
    return ExtractionReviewStatus.REVIEW_REQUIRED


@router.post("/extractions/{extraction_id}/review", response_model=ExtractionResponse, summary="Review an extracted entity")
def review_extraction(extraction_id: int, request: ExtractionReviewRequest) -> ExtractionResponse:
    with SessionLocal() as session:
        extraction = session.get(DocumentExtraction, extraction_id)
        if not extraction:
            raise HTTPException(status_code=404, detail="Extraction not found.")
        extraction.review_status = _review_status_from_decision(request.decision)
        session.add(
            ReviewAudit(
                extraction_id=extraction.id,
                decision=request.decision.value,
                actor_type="demo_investigator",
                metadata_={"review_target": "document_extraction"},
            )
        )
        session.commit()
        session.refresh(extraction)
        return ExtractionResponse(
            id=extraction.id,
            kind=extraction.kind.value,
            entity_type=extraction.entity_type,
            text=extraction.extracted_text,
            normalized_value=extraction.normalized_value,
            confidence=extraction.confidence,
            page=extraction.page_number,
            source_reference=extraction.source_reference,
            source_context=extraction.source_context,
            review_status=extraction.review_status.value,
        )


@router.post("/relationships/{relationship_id}/review", response_model=RelationshipExtractionResponse, summary="Review an extracted relationship")
def review_relationship(relationship_id: int, request: ExtractionReviewRequest) -> RelationshipExtractionResponse:
    with SessionLocal() as session:
        relationship = session.get(ExtractedRelationship, relationship_id)
        if not relationship:
            raise HTTPException(status_code=404, detail="Extracted relationship not found.")
        relationship.review_status = _review_status_from_decision(request.decision)
        session.add(
            ReviewAudit(
                decision=request.decision.value,
                actor_type="demo_investigator",
                metadata_={"review_target": "extracted_relationship", "relationship_id": relationship.id},
            )
        )
        session.commit()
        session.refresh(relationship)
        return RelationshipExtractionResponse(
            id=relationship.id,
            relationship_type=relationship.relationship_type,
            source_entity=relationship.source_entity_text,
            target_entity=relationship.target_entity_text,
            confidence=relationship.confidence,
            page=relationship.page_number,
            source_reference=relationship.source_reference,
            source_text=relationship.source_text,
            review_status=relationship.review_status.value,
        )
