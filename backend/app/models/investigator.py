from datetime import datetime

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.mixins import TimestampMixin


class Investigator(TimestampMixin, Base):
    __tablename__ = "investigators"

    id: Mapped[int] = mapped_column(primary_key=True)
    investigator_id: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    role: Mapped[str] = mapped_column(String(40), index=True)
    role_label: Mapped[str] = mapped_column(String(80))
    department: Mapped[str] = mapped_column(String(160))
    clearance: Mapped[str] = mapped_column(String(120))
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    can_view_all_cases: Mapped[bool] = mapped_column(Boolean, default=False)
    can_assign_cases: Mapped[bool] = mapped_column(Boolean, default=False)
    can_generate_reports: Mapped[bool] = mapped_column(Boolean, default=True)
    can_review_audit_trail: Mapped[bool] = mapped_column(Boolean, default=False)
    last_login: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
