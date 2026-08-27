from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Communication(Base):
    __tablename__ = "communications"
    __table_args__ = (Index("ix_communications_timestamp", "timestamp"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    caller_entity_id: Mapped[int] = mapped_column(index=True)
    receiver_entity_id: Mapped[int] = mapped_column(index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    duration_seconds: Mapped[int] = mapped_column(Integer)
    communication_type: Mapped[str] = mapped_column(String(100))
    metadata_: Mapped[dict[str, Any] | None] = mapped_column("metadata", JSON)
