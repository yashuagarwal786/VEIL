from sqlalchemy import Enum, String, Text
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

    documents = relationship("Document", back_populates="case", cascade="all, delete-orphan")
    evidence = relationship("Evidence", back_populates="case", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="case", cascade="all, delete-orphan")
    entities = relationship("CaseEntity", back_populates="case", cascade="all, delete-orphan")
