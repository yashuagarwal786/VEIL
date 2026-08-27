from datetime import date
from typing import Any

from sqlalchemy import JSON, Date, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.mixins import TimestampMixin


class Person(TimestampMixin, Base):
    __tablename__ = "persons"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    aliases: Mapped[list[str] | None] = mapped_column(JSON)
    phone: Mapped[str | None] = mapped_column(String(40), index=True)
    email: Mapped[str | None] = mapped_column(String(255))
    date_of_birth: Mapped[date | None] = mapped_column(Date)
    address: Mapped[str | None] = mapped_column(String(500))
    metadata_: Mapped[dict[str, Any] | None] = mapped_column("metadata", JSON)
