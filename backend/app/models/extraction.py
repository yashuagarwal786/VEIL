from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, Enum, Float, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import ExtractionKind, ExtractionReviewStatus, MatchStatus, MatchType


class DocumentExtraction(Base):
    __tablename__ = "document_extractions"

    id: Mapped[int] = mapped_column(primary_key=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("documents.id", ondelete="CASCADE"), index=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("cases.id", ondelete="CASCADE"), index=True)
    kind: Mapped[ExtractionKind] = mapped_column(Enum(ExtractionKind), default=ExtractionKind.ENTITY)
    entity_type: Mapped[str] = mapped_column(String(80), index=True)
    extracted_text: Mapped[str] = mapped_column(String(500))
    normalized_value: Mapped[str] = mapped_column(String(500), index=True)
    confidence: Mapped[float] = mapped_column(Float)
    page_number: Mapped[int | None] = mapped_column()
    start_offset: Mapped[int | None] = mapped_column()
    end_offset: Mapped[int | None] = mapped_column()
    source_reference: Mapped[str | None] = mapped_column(String(255))
    source_context: Mapped[str | None] = mapped_column(Text)
    review_status: Mapped[ExtractionReviewStatus] = mapped_column(Enum(ExtractionReviewStatus), index=True)
    resolved_entity_type: Mapped[str | None] = mapped_column(String(80))
    resolved_entity_id: Mapped[int | None] = mapped_column()
    metadata_: Mapped[dict[str, Any] | None] = mapped_column("metadata", JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    document = relationship("Document", back_populates="extractions")
    matches = relationship("EntityMatch", back_populates="extraction", cascade="all, delete-orphan")


class ExtractedRelationship(Base):
    __tablename__ = "extracted_relationships"

    id: Mapped[int] = mapped_column(primary_key=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("documents.id", ondelete="CASCADE"), index=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("cases.id", ondelete="CASCADE"), index=True)
    relationship_type: Mapped[str] = mapped_column(String(100), index=True)
    source_text: Mapped[str] = mapped_column(String(500))
    source_entity_text: Mapped[str] = mapped_column(String(255))
    target_entity_text: Mapped[str] = mapped_column(String(255))
    source_normalized: Mapped[str] = mapped_column(String(255))
    target_normalized: Mapped[str] = mapped_column(String(255))
    confidence: Mapped[float] = mapped_column(Float)
    page_number: Mapped[int | None] = mapped_column()
    source_reference: Mapped[str | None] = mapped_column(String(255))
    review_status: Mapped[ExtractionReviewStatus] = mapped_column(Enum(ExtractionReviewStatus), index=True)
    evidence_id: Mapped[int | None] = mapped_column(ForeignKey("evidence.id", ondelete="SET NULL"))
    graph_relationship_id: Mapped[str | None] = mapped_column(String(120))
    metadata_: Mapped[dict[str, Any] | None] = mapped_column("metadata", JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    document = relationship("Document", back_populates="extracted_relationships")
    evidence = relationship("Evidence")


class EntityMatch(Base):
    __tablename__ = "entity_matches"

    id: Mapped[int] = mapped_column(primary_key=True)
    extraction_id: Mapped[int] = mapped_column(ForeignKey("document_extractions.id", ondelete="CASCADE"), index=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("cases.id", ondelete="CASCADE"), index=True)
    candidate_entity_type: Mapped[str] = mapped_column(String(80), index=True)
    candidate_entity_id: Mapped[int | None] = mapped_column(index=True)
    candidate_label: Mapped[str | None] = mapped_column(String(255))
    match_type: Mapped[MatchType] = mapped_column(Enum(MatchType), index=True)
    confidence: Mapped[float] = mapped_column(Float)
    signals: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    status: Mapped[MatchStatus] = mapped_column(Enum(MatchStatus), default=MatchStatus.PENDING, index=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    actor_type: Mapped[str | None] = mapped_column(String(80))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    extraction = relationship("DocumentExtraction", back_populates="matches")


class ReviewAudit(Base):
    __tablename__ = "review_audit"

    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int | None] = mapped_column(ForeignKey("entity_matches.id", ondelete="SET NULL"), index=True)
    extraction_id: Mapped[int | None] = mapped_column(ForeignKey("document_extractions.id", ondelete="SET NULL"), index=True)
    decision: Mapped[str] = mapped_column(String(40))
    actor_type: Mapped[str] = mapped_column(String(80), default="demo_investigator")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    metadata_: Mapped[dict[str, Any] | None] = mapped_column("metadata", JSON)
