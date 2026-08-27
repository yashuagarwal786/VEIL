from fastapi import APIRouter
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.db.session import SessionLocal
from app.graph.client import GraphClient
from app.schemas.health import DatabaseHealthResponse, GraphHealthResponse, HealthResponse

router = APIRouter()


@router.get("", response_model=HealthResponse, summary="API health check")
def health() -> HealthResponse:
    return HealthResponse(status="ok", service="VEIL API")


@router.get(
    "/database",
    response_model=DatabaseHealthResponse,
    summary="PostgreSQL connectivity check",
)
def database_health() -> DatabaseHealthResponse:
    try:
        with SessionLocal() as session:
            session.execute(text("SELECT 1"))
        return DatabaseHealthResponse(status="ok", database="connected")
    except SQLAlchemyError:
        return DatabaseHealthResponse(status="error", database="disconnected", detail="Database connectivity check failed.")


@router.get("/graph", response_model=GraphHealthResponse, summary="Neo4j connectivity check")
def graph_health() -> GraphHealthResponse:
    client = GraphClient()
    try:
        client.verify_connectivity()
        return GraphHealthResponse(status="ok", graph="connected")
    except Exception:
        return GraphHealthResponse(status="error", graph="disconnected", detail="Neo4j connectivity check failed.")
    finally:
        client.close()


@router.get("/neo4j", response_model=GraphHealthResponse, summary="Neo4j connectivity check")
def neo4j_health() -> GraphHealthResponse:
    return graph_health()
