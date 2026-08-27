from datetime import datetime
from typing import Any

from sqlalchemy import JSON, CheckConstraint, DateTime, Enum, Float, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import AlertSeverity, AlertStatus


class Alert(Base):
    __tablename__ = "alerts"
    __table_args__ = (CheckConstraint("score >= 0 AND score <= 100", name="ck_alert_score"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("cases.id", ondelete="CASCADE"), index=True)
    entity_id: Mapped[int | None] = mapped_column(index=True)
    alert_type: Mapped[str] = mapped_column(String(100))
    severity: Mapped[AlertSeverity] = mapped_column(Enum(AlertSeverity))
    score: Mapped[float] = mapped_column(Float)
    explanation: Mapped[str] = mapped_column(Text)
    status: Mapped[AlertStatus] = mapped_column(Enum(AlertStatus), default=AlertStatus.OPEN)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    metadata_: Mapped[dict[str, Any] | None] = mapped_column("metadata", JSON)

    case = relationship("Case", back_populates="alerts")
