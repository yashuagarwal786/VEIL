from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import ProcessingStatus


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("cases.id", ondelete="CASCADE"), index=True)
    filename: Mapped[str] = mapped_column(String(255))
    document_type: Mapped[str] = mapped_column(String(100))
    text: Mapped[str | None] = mapped_column(Text)
    upload_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    processing_status: Mapped[ProcessingStatus] = mapped_column(
        Enum(ProcessingStatus),
        default=ProcessingStatus.PENDING,
    )
    storage_path: Mapped[str | None] = mapped_column(String(500))
    mime_type: Mapped[str | None] = mapped_column(String(150))
    file_size_bytes: Mapped[int | None] = mapped_column()
    processing_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    processing_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error_message: Mapped[str | None] = mapped_column(Text)
    extracted_text_length: Mapped[int | None] = mapped_column()
    metadata_: Mapped[dict[str, Any] | None] = mapped_column("metadata", JSON)

    case = relationship("Case", back_populates="documents")
    evidence = relationship("Evidence", back_populates="document", cascade="all, delete-orphan")
    extractions = relationship("DocumentExtraction", back_populates="document", cascade="all, delete-orphan")
    extracted_relationships = relationship("ExtractedRelationship", back_populates="document", cascade="all, delete-orphan")
