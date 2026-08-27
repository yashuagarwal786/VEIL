from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select

from app.graph.analytics import GraphAnalyticsService
from app.graph.ids import normalize_case_id
from app.schemas.analytics import (
    BridgeEntityResult,
    CentralityResult,
    CommunitiesResponse,
    CommunityResult,
    KeyEntityResult,
    NetworkSummaryResponse,
)
from app.db.session import SessionLocal
from app.models.analytics_result import AnalyticsResult
from app.models.alert import Alert
from app.models.person import Person
from app.services.behavioral_analytics import BehavioralAnalyticsService

router = APIRouter()


@router.get(
    "/centrality/degree",
    response_model=list[CentralityResult],
    summary="Calculate degree centrality as a structural connectivity measure",
)
def degree_centrality(case_id: str | None = None, limit: int = Query(default=10, ge=1, le=100)) -> list[CentralityResult]:
    return [CentralityResult(**item) for item in GraphAnalyticsService().calculate_degree_centrality(normalize_case_id(case_id) if case_id else None, limit)]


@router.get(
    "/centrality/betweenness",
    response_model=list[CentralityResult],
    summary="Calculate betweenness centrality to identify possible bridge entities",
)
def betweenness_centrality(case_id: str | None = None, limit: int = Query(default=10, ge=1, le=100)) -> list[CentralityResult]:
    return [CentralityResult(**item) for item in GraphAnalyticsService().calculate_betweenness_centrality(normalize_case_id(case_id) if case_id else None, limit)]


@router.get(
    "/centrality/pagerank",
    response_model=list[CentralityResult],
    summary="Calculate PageRank as a structural graph-importance measure, not a criminality score",
)
def pagerank(case_id: str | None = None, limit: int = Query(default=10, ge=1, le=100)) -> list[CentralityResult]:
    return [CentralityResult(**item) for item in GraphAnalyticsService().calculate_pagerank(normalize_case_id(case_id) if case_id else None, limit)]


@router.get("/communities", response_model=CommunitiesResponse, summary="Detect graph communities")
def communities(case_id: str | None = None) -> CommunitiesResponse:
    items = GraphAnalyticsService().detect_communities(normalize_case_id(case_id) if case_id else None)
    return CommunitiesResponse(communities=[CommunityResult(**item) for item in items])


@router.get("/networks/{case_id}", response_model=NetworkSummaryResponse, summary="Summarize a case network")
def network_summary(case_id: str) -> NetworkSummaryResponse:
    return NetworkSummaryResponse(**GraphAnalyticsService().get_network_summary(normalize_case_id(case_id)))


@router.get("/key-entities", response_model=list[KeyEntityResult], summary="Rank entities by transparent structural importance")
def key_entities(case_id: str, limit: int = Query(default=10, ge=1, le=100)) -> list[KeyEntityResult]:
    return [KeyEntityResult(**item) for item in GraphAnalyticsService().find_key_entities(normalize_case_id(case_id), limit)]


@router.get("/bridge-entities", response_model=list[BridgeEntityResult], summary="Identify potential bridge entities across communities")
def bridge_entities(case_id: str, limit: int = Query(default=10, ge=1, le=100)) -> list[BridgeEntityResult]:
    return [BridgeEntityResult(**item) for item in GraphAnalyticsService().find_bridge_entities(normalize_case_id(case_id), limit)]


def _result(item: AnalyticsResult) -> dict:
    return {"id": item.id, "case_id": item.case_id, "entity_id": item.entity_id, "analysis_type": item.analysis_type, "score": item.score, "result": item.result, "model_name": item.model_name, "model_version": item.model_version, "generated_at": item.generated_at}


@router.get("/anomalies")
def anomalies(case_id: int | None = None, entity_id: int | None = None, anomaly_type: str | None = None, severity: str | None = None, limit: int = Query(100, ge=1, le=500)) -> list[dict]:
    with SessionLocal() as session:
        query = select(AnalyticsResult).where(AnalyticsResult.analysis_type.in_(["TRANSACTION_ANOMALY", "COMMUNICATION_ANOMALY", "TEMPORAL_ANOMALY", "GEOGRAPHIC_DEVIATION"])).order_by(AnalyticsResult.score.desc()).limit(limit)
        if case_id is not None: query = query.where(AnalyticsResult.case_id == case_id)
        if entity_id is not None: query = query.where(AnalyticsResult.entity_id == entity_id)
        if anomaly_type: query = query.where(AnalyticsResult.analysis_type == anomaly_type.upper())
        rows = [_result(item) for item in session.scalars(query).all()]
        return [item for item in rows if not severity or ("CRITICAL" if (item["score"] or 0) >= 85 else "HIGH" if (item["score"] or 0) >= 70 else "MEDIUM" if (item["score"] or 0) >= 45 else "LOW") == severity.upper()]


@router.get("/anomalies/{kind}")
def anomalies_by_kind(kind: str, case_id: int | None = None, limit: int = Query(100, ge=1, le=500)) -> list[dict]:
    mapping = {"transactions": "TRANSACTION_ANOMALY", "communications": "COMMUNICATION_ANOMALY", "temporal": "TEMPORAL_ANOMALY", "geographic": "GEOGRAPHIC_DEVIATION"}
    if kind not in mapping: raise HTTPException(404, "Unknown anomaly type")
    with SessionLocal() as session:
        query = select(AnalyticsResult).where(AnalyticsResult.analysis_type == mapping[kind]).order_by(AnalyticsResult.score.desc()).limit(limit)
        if case_id is not None: query = query.where(AnalyticsResult.case_id == case_id)
        return [_result(item) for item in session.scalars(query).all()]


@router.get("/entity/{entity_id}/behavior")
def entity_behavior(entity_id: int, case_id: int = Query(...)) -> dict:
    with SessionLocal() as session:
        rows = session.scalars(select(AnalyticsResult).where(AnalyticsResult.case_id == case_id, AnalyticsResult.entity_id == entity_id, AnalyticsResult.analysis_type != "INVESTIGATION_PRIORITY").order_by(AnalyticsResult.generated_at.desc())).all()
        return {"entity_id": entity_id, "case_id": case_id, "anomalies": [_result(item) for item in rows], "transaction_baseline": "Insufficient historical data for behavioral baseline." if not rows else {"analytical_observations": len(rows)}, "communication_baseline": {"analytical_observations": len(rows)}, "location_baseline": {"analytical_observations": len(rows)}, "data_sufficiency": "MEDIUM" if len(rows) >= 2 else "LOW"}


@router.get("/entity/{entity_id}/priority")
def entity_priority(entity_id: int, case_id: int = Query(...)) -> dict:
    with SessionLocal() as session:
        item = session.scalar(select(AnalyticsResult).where(AnalyticsResult.case_id == case_id, AnalyticsResult.entity_id == entity_id, AnalyticsResult.analysis_type == "INVESTIGATION_PRIORITY").order_by(AnalyticsResult.generated_at.desc()))
        if not item: raise HTTPException(404, "No calculated priority for this entity. Recalculate analytics first.")
        return _result(item)


@router.get("/entity/{entity_id}/activity")
def entity_activity(entity_id: int, case_id: int = Query(...)) -> list[dict]:
    from app.models.communication import Communication
    from app.models.transaction import Transaction
    with SessionLocal() as session:
        events = [{"type": "transaction", "id": item.id, "timestamp": item.timestamp, "amount": float(item.amount), "counterparty_id": item.receiver_entity_id} for item in session.scalars(select(Transaction).where(Transaction.sender_entity_id == entity_id)).all()]
        events += [{"type": "communication", "id": item.id, "timestamp": item.timestamp, "duration_seconds": item.duration_seconds, "counterparty_id": item.receiver_entity_id} for item in session.scalars(select(Communication).where(Communication.caller_entity_id == entity_id)).all()]
        return sorted(events, key=lambda item: item["timestamp"])


@router.get("/cases/{case_id}/overview")
def case_overview(case_id: int) -> dict:
    with SessionLocal() as session:
        rows = session.scalars(select(AnalyticsResult).where(AnalyticsResult.case_id == case_id)).all()
        alerts = session.execute(select(func.count()).select_from(Alert).where(Alert.case_id == case_id, Alert.severity.in_(["HIGH", "CRITICAL"]))).scalar_one()
        return {"case_id": case_id, "total_anomalies": sum(item.analysis_type != "INVESTIGATION_PRIORITY" for item in rows), "high_severity_alerts": alerts, "anomalous_transactions": sum(item.analysis_type == "TRANSACTION_ANOMALY" for item in rows), "communication_spikes": sum(item.analysis_type == "COMMUNICATION_ANOMALY" for item in rows), "geographic_deviations": sum(item.analysis_type == "GEOGRAPHIC_DEVIATION" for item in rows), "network_changes": 0, "high_priority_entities": sum(item.analysis_type == "INVESTIGATION_PRIORITY" and (item.score or 0) >= 70 for item in rows)}


class RecalculateRequest(BaseModel): case_id: int


@router.post("/recalculate")
def recalculate(body: RecalculateRequest) -> dict:
    with SessionLocal() as session: return BehavioralAnalyticsService(session).recalculate(body.case_id)
