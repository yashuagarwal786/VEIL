from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class AnalyticsResult(Base):
    __tablename__ = "analytics_results"
    __table_args__ = (Index("ix_analytics_results_case_type", "case_id", "analysis_type"), Index("ix_analytics_results_entity_type", "entity_id", "analysis_type"))

    id: Mapped[int] = mapped_column(primary_key=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("cases.id", ondelete="CASCADE"), index=True)
    entity_id: Mapped[int | None] = mapped_column(index=True)
    analysis_type: Mapped[str] = mapped_column(String(100), index=True)
    score: Mapped[float | None] = mapped_column(Float)
    result: Mapped[dict[str, Any]] = mapped_column(JSON)
    model_name: Mapped[str] = mapped_column(String(100))
    model_version: Mapped[str] = mapped_column(String(30))
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
