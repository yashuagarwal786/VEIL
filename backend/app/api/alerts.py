from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.alert import Alert
from app.models.enums import AlertStatus

router = APIRouter()


def serialize(alert: Alert) -> dict:
    return {"id": alert.id, "case_id": alert.case_id, "entity_id": alert.entity_id, "type": alert.alert_type, "severity": alert.severity.value, "score": alert.score, "title": alert.alert_type.replace("_", " ").title(), "explanation": alert.explanation, "status": alert.status.value, "generated_at": alert.created_at, "details": alert.metadata_ or {}}


@router.get("")
def list_alerts(case_id: int | None = None, severity: str | None = None, type: str | None = None, status: AlertStatus | None = None, limit: int = Query(100, ge=1, le=500)) -> list[dict]:
    with SessionLocal() as session:
        query = select(Alert).order_by(Alert.created_at.desc()).limit(limit)
        if case_id is not None: query = query.where(Alert.case_id == case_id)
        if severity: query = query.where(Alert.severity == severity.upper())
        if type: query = query.where(Alert.alert_type == type.upper())
        if status: query = query.where(Alert.status == status)
        return [serialize(item) for item in session.scalars(query).all()]


@router.get("/{alert_id}")
def get_alert(alert_id: int) -> dict:
    with SessionLocal() as session:
        alert = session.get(Alert, alert_id)
        if not alert: raise HTTPException(404, "Alert not found")
        return serialize(alert)


class AlertReview(BaseModel): status: AlertStatus


@router.patch("/{alert_id}")
def update_alert(alert_id: int, body: AlertReview) -> dict:
    with SessionLocal() as session:
        alert = session.get(Alert, alert_id)
        if not alert: raise HTTPException(404, "Alert not found")
        alert.status = body.status; session.commit(); session.refresh(alert)
        return serialize(alert)
