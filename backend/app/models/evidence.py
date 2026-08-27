from datetime import datetime
from typing import Any

from sqlalchemy import JSON, CheckConstraint, DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Evidence(Base):
    __tablename__ = "evidence"
    __table_args__ = (CheckConstraint("confidence >= 0 AND confidence <= 1", name="ck_evidence_confidence"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("cases.id", ondelete="CASCADE"), index=True)
    document_id: Mapped[int | None] = mapped_column(ForeignKey("documents.id", ondelete="SET NULL"), index=True)
    evidence_type: Mapped[str] = mapped_column(String(100))
    source_reference: Mapped[str | None] = mapped_column(String(255))
    content: Mapped[str] = mapped_column(Text)
    confidence: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    metadata_: Mapped[dict[str, Any] | None] = mapped_column("metadata", JSON)

    case = relationship("Case", back_populates="evidence")
    document = relationship("Document", back_populates="evidence")
