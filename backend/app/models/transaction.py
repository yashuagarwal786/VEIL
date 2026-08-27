from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import JSON, DateTime, Index, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (Index("ix_transactions_timestamp", "timestamp"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    sender_entity_id: Mapped[int] = mapped_column(index=True)
    receiver_entity_id: Mapped[int] = mapped_column(index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    transaction_type: Mapped[str] = mapped_column(String(100))
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    metadata_: Mapped[dict[str, Any] | None] = mapped_column("metadata", JSON)
