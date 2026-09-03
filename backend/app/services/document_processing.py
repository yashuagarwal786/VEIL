from __future__ import annotations

import hashlib
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.graph.sync import GraphSyncService
from app.models.document import Document
from app.models.enums import ExtractionKind, ExtractionReviewStatus, MatchStatus, ProcessingStatus
from app.models.evidence import Evidence
from app.models.extraction import DocumentExtraction, EntityMatch, ExtractedRelationship
from app.nlp.entity_extractor import RuleBasedEntityExtractor
from app.nlp.entity_resolver import EntityResolver
from app.nlp.relationship_extractor import RuleBasedRelationshipExtractor
from app.nlp.text_extractor import extract_text
from app.storage.local import LocalStorage


AUTO_ACCEPT_THRESHOLD = 0.9
REVIEW_THRESHOLD = 0.7


class DocumentProcessingService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.storage = LocalStorage()
        self.entity_extractor = RuleBasedEntityExtractor()
        self.relationship_extractor = RuleBasedRelationshipExtractor()

    def create_document(
        self,
        case_id: int,
        filename: str,
        document_type: str,
        content: bytes,
        mime_type: str,
        data_category: str = "OTHER",
        source_description: str | None = None,
        uploaded_by: str | None = None,
    ) -> Document:
        stored = self.storage.save(filename, content)
        document = Document(
            case_id=case_id,
            filename=filename,
            original_filename=filename,
            document_type=document_type.upper().lstrip("."),
            data_category=data_category.upper(),
            source_description=source_description,
            uploaded_by_investigator_id=uploaded_by,
            text=None,
            storage_path=stored.reference,
            mime_type=mime_type,
            file_size_bytes=len(content),
            checksum_sha256=hashlib.sha256(content).hexdigest(),
            processing_status=ProcessingStatus.PENDING,
            metadata_={"synthetic": False},
        )
        self.session.add(document)
        self.session.commit()
        self.session.refresh(document)
        return document

    def process(self, document_id: int, sync_graph: bool = True) -> dict[str, object]:
        document = self.session.get(Document, document_id)
        if not document:
            raise ValueError("Document not found.")
        document.processing_status = ProcessingStatus.PROCESSING
        document.processing_started_at = datetime.now(timezone.utc)
        document.error_message = None
        self.session.flush()

        graph_status = "not_requested"
        try:
            content = self.storage.read(document.storage_path or "")
            extracted_text = extract_text(content, f".{document.document_type.lower()}")
            document.text = extracted_text.text
            document.extracted_text_length = len(extracted_text.text)
            if extracted_text.ocr_unavailable:
                raise ValueError("OCR processing is unavailable for this document.")

            self._clear_previous(document.id)
            entities = self.entity_extractor.extract(extracted_text.text, extracted_text.pages)
            relationships = self.relationship_extractor.extract(extracted_text.text, extracted_text.pages[0].page_number if extracted_text.pages else 1)
            evidence_created = 0
            review_required = 0
            resolver = EntityResolver(self.session)

            for entity in entities:
                status = self._review_status(entity.confidence)
                if status == ExtractionReviewStatus.REVIEW_REQUIRED:
                    review_required += 1
                extraction = DocumentExtraction(
                    document_id=document.id,
                    case_id=document.case_id,
                    kind=ExtractionKind.ENTITY,
                    entity_type=entity.type,
                    extracted_text=entity.text,
                    normalized_value=entity.normalized_value,
                    confidence=entity.confidence,
                    page_number=entity.page,
                    start_offset=entity.start_offset,
                    end_offset=entity.end_offset,
                    source_reference=entity.source_reference,
                    source_context=entity.source_context,
                    review_status=status,
                    metadata_={"extractor": "rules"},
                )
                self.session.add(extraction)
                self.session.flush()
                for candidate in resolver.resolve(entity):
                    match = EntityMatch(
                        extraction_id=extraction.id,
                        case_id=document.case_id,
                        candidate_entity_type=candidate.candidate_entity_type,
                        candidate_entity_id=candidate.candidate_entity_id,
                        candidate_label=candidate.candidate_label,
                        match_type=candidate.match_type,
                        confidence=candidate.confidence,
                        signals=candidate.signals,
                        status=MatchStatus.PENDING,
                    )
                    self.session.add(match)

            for relationship in relationships:
                status = self._review_status(relationship.confidence)
                if status == ExtractionReviewStatus.REVIEW_REQUIRED:
                    review_required += 1
                evidence = Evidence(
                    case_id=document.case_id,
                    document_id=document.id,
                    evidence_type="RELATIONSHIP",
                    source_reference=relationship.source_reference,
                    content=relationship.source_text,
                    confidence=relationship.confidence,
                    metadata_={"page": relationship.page, "extractor": "rules"},
                )
                self.session.add(evidence)
                self.session.flush()
                self.session.add(
                    ExtractedRelationship(
                        document_id=document.id,
                        case_id=document.case_id,
                        relationship_type=relationship.relationship_type,
                        source_text=relationship.source_text,
                        source_entity_text=relationship.source_entity,
                        target_entity_text=relationship.target_entity,
                        source_normalized=relationship.source_entity.lower(),
                        target_normalized=relationship.target_entity.lower(),
                        confidence=relationship.confidence,
                        page_number=relationship.page,
                        source_reference=relationship.source_reference,
                        review_status=status,
                        evidence_id=evidence.id,
                        graph_relationship_id=f"DOC_REL_{document.id}_{evidence.id}",
                        metadata_={"extractor": "rules"},
                    )
                )
                evidence_created += 1

            document.processing_status = ProcessingStatus.COMPLETED
            document.processing_completed_at = datetime.now(timezone.utc)
            self.session.commit()

            if sync_graph:
                try:
                    GraphSyncService(self.session).sync_all(reset=False)
                    graph_status = "completed"
                except Exception:
                    graph_status = "failed_pending_retry"

            return {
                "document_id": document.id,
                "status": document.processing_status,
                "entities_found": len(entities),
                "relationships_found": len(relationships),
                "evidence_created": evidence_created,
                "review_required": review_required,
                "graph_sync_status": graph_status,
            }
        except Exception as exc:
            document.processing_status = ProcessingStatus.FAILED
            document.error_message = str(exc)
            document.processing_completed_at = datetime.now(timezone.utc)
            self.session.commit()
            raise

    def _clear_previous(self, document_id: int) -> None:
        self.session.query(ExtractedRelationship).filter(ExtractedRelationship.document_id == document_id).delete()
        self.session.query(DocumentExtraction).filter(DocumentExtraction.document_id == document_id).delete()

    def _review_status(self, confidence: float) -> ExtractionReviewStatus:
        if confidence >= AUTO_ACCEPT_THRESHOLD:
            return ExtractionReviewStatus.AUTO_ACCEPT
        if confidence >= REVIEW_THRESHOLD:
            return ExtractionReviewStatus.REVIEW_REQUIRED
        return ExtractionReviewStatus.REJECTED
