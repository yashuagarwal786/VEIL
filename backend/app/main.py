from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.analytics import router as analytics_router
from app.api.alerts import router as alerts_router
from app.api.documents import router as documents_router
from app.api.entities import router as entities_router
from app.api.graph import router as graph_router
from app.api.health import router as health_router
from app.api.workspace import router as workspace_router
from app.core.config import settings


app = FastAPI(
    title="VEIL API",
    description="Foundation API for Visualizing Evidence & Intelligence Links.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api/health", tags=["health"])
app.include_router(graph_router, prefix="/api/graph", tags=["graph"])
app.include_router(analytics_router, prefix="/api/analytics", tags=["analytics"])
app.include_router(alerts_router, prefix="/api/alerts", tags=["alerts"])
app.include_router(documents_router, prefix="/api/documents", tags=["documents"])
app.include_router(entities_router, prefix="/api/entities", tags=["entities"])
app.include_router(workspace_router, prefix="/api/workspace", tags=["workspace"])


@app.get("/", include_in_schema=False)
def root() -> dict[str, str]:
    return {"service": "VEIL API"}
