from datetime import datetime

from sqlalchemy import DateTime, Enum, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import CaseStatus
from app.models.mixins import TimestampMixin


class Case(TimestampMixin, Base):
    __tablename__ = "cases"

    id: Mapped[int] = mapped_column(primary_key=True)
    case_number: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[CaseStatus] = mapped_column(Enum(CaseStatus), default=CaseStatus.ACTIVE)
    case_type: Mapped[str] = mapped_column(String(100), default="GENERAL")
    priority: Mapped[str] = mapped_column(String(30), default="MEDIUM", index=True)
    created_by_investigator_id: Mapped[str | None] = mapped_column(String(30), index=True)
    assigned_investigator_id: Mapped[str | None] = mapped_column(String(30), index=True)
    assigned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    jurisdiction: Mapped[str | None] = mapped_column(String(120))
    sensitivity: Mapped[str] = mapped_column(String(80), default="INTERNAL")

    documents = relationship("Document", back_populates="case", cascade="all, delete-orphan")
    evidence = relationship("Evidence", back_populates="case", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="case", cascade="all, delete-orphan")
    entities = relationship("CaseEntity", back_populates="case", cascade="all, delete-orphan")
