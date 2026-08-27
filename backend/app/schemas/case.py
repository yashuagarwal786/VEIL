from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import CaseStatus


class CaseRead(BaseModel):
    id: int
    case_number: str
    title: str
    description: str | None
    status: CaseStatus
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
