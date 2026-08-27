from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class CaseEntity(Base):
    __tablename__ = "case_entities"
    __table_args__ = (UniqueConstraint("case_id", "entity_type", "entity_id", name="uq_case_entity"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("cases.id", ondelete="CASCADE"), index=True)
    entity_type: Mapped[str] = mapped_column(String(50))
    entity_id: Mapped[int] = mapped_column(index=True)

    case = relationship("Case", back_populates="entities")
