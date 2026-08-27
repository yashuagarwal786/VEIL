from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    service: str


class DatabaseHealthResponse(BaseModel):
    status: str
    database: str
    detail: str | None = None


class GraphHealthResponse(BaseModel):
    status: str
    graph: str
    detail: str | None = None
