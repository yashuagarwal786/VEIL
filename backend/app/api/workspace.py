from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, File, Form, Header, HTTPException, Query, UploadFile
from sqlalchemy import func, or_, select

from app.db.session import SessionLocal
from app.models.alert import Alert
from app.models.analytics_result import AnalyticsResult
from app.models.bank_account import BankAccount
from app.models.case import Case
from app.models.communication import Communication
from app.models.document import Document
from app.models.enums import ExtractionReviewStatus, ProcessingStatus
from app.models.extraction import DocumentExtraction, EntityMatch, ExtractedRelationship, ReviewAudit
from app.models.investigator import Investigator
from app.models.entity import CaseEntity
from app.models.evidence import Evidence
from app.models.location import Location
from app.models.organization import Organization
from app.models.person import Person
from app.models.phone import Phone
from app.models.transaction import Transaction
from app.models.vehicle import Vehicle
from app.nlp.document_loader import DocumentValidationError, validate_document
from app.security.auth import get_investigator_from_token, require_admin, require_case_access, token_from_header
from app.services.behavioral_analytics import BehavioralAnalyticsService
from app.services.document_processing import DocumentProcessingService

router = APIRouter()

INVESTIGATORS = [
    {"investigator_id": "INV-1042", "name": "Yash Agarwal", "role": "Senior Investigator"},
    {"investigator_id": "INV-2031", "name": "Aarav Mehta", "role": "Investigator"},
    {"investigator_id": "INV-0001", "name": "Operations Admin", "role": "Administrator"},
]


def _legacy_investigator(investigator_id: str | None, case_id: int, fallback_index: int) -> dict:
    if investigator_id:
        return {"investigator_id": investigator_id, "name": investigator_id, "role": "Investigator"}
    return INVESTIGATORS[fallback_index % len(INVESTIGATORS)]


def _investigator_map(session) -> dict[str, dict]:
    return {item.investigator_id: {"investigator_id": item.investigator_id, "name": item.name, "role": item.role_label} for item in session.scalars(select(Investigator)).all()}


def ownership_for_case(item: Case, investigators: dict[str, dict] | None = None) -> dict:
    assigned_id = item.assigned_investigator_id
    creator_id = item.created_by_investigator_id
    assigned = (investigators or {}).get(assigned_id or "") or _legacy_investigator(assigned_id, item.id, item.id - 1)
    creator = (investigators or {}).get(creator_id or "") or _legacy_investigator(creator_id, item.id, 2)
    modifier = (investigators or {}).get(assigned_id or "") or _legacy_investigator(assigned_id, item.id, item.id)
    priority_score = min(96, 48 + (item.id * 7) % 45)
    risk_level = item.priority if getattr(item, "priority", None) in {"LOW", "MEDIUM", "HIGH", "CRITICAL"} else "CRITICAL" if priority_score >= 88 else "HIGH" if priority_score >= 72 else "MEDIUM" if priority_score >= 55 else "LOW"
    return {"assigned_investigator": assigned, "created_by": creator, "last_modified_by": modifier, "risk_level": risk_level, "priority_score": priority_score}


def case_row(item: Case, investigators: dict[str, dict] | None = None) -> dict:
    return {"id": item.id, "case_number": item.case_number, "title": item.title, "description": item.description, "case_type": item.case_type, "priority": item.priority, "status": item.status.value, "assigned_at": item.assigned_at, "jurisdiction": item.jurisdiction, "sensitivity": item.sensitivity, "created_at": item.created_at, "updated_at": item.updated_at, **ownership_for_case(item, investigators)}


def _current_investigator(session, authorization: str | None) -> Investigator:
    return get_investigator_from_token(session, token_from_header(authorization))


def source_row(session, document: Document) -> dict:
    entity_count = session.query(DocumentExtraction).filter(DocumentExtraction.document_id == document.id).count()
    relationship_count = session.query(ExtractedRelationship).filter(ExtractedRelationship.document_id == document.id).count()
    review_count = session.query(DocumentExtraction).filter(DocumentExtraction.document_id == document.id, DocumentExtraction.review_status == ExtractionReviewStatus.REVIEW_REQUIRED).count()
    return {"id": document.id, "case_id": document.case_id, "filename": document.filename, "original_filename": document.original_filename or document.filename, "file_type": document.document_type, "data_category": document.data_category, "source_description": document.source_description, "uploaded_by": document.uploaded_by_investigator_id, "uploaded_at": document.upload_timestamp, "processing_status": document.processing_status.value, "processing_started_at": document.processing_started_at, "processing_completed_at": document.processing_completed_at, "processing_error": document.error_message, "checksum": document.checksum_sha256, "storage_reference": document.storage_path, "entities": entity_count, "relationships": relationship_count, "review_required": review_count}


@router.get("/dashboard")
def dashboard(case_id: int = Query(1, ge=1), authorization: str | None = Header(default=None)) -> dict:
    with SessionLocal() as session:
        if authorization:
            investigator = _current_investigator(session, authorization)
            require_case_access(session, investigator, case_id)
        overview = {
            "active_cases": session.scalar(select(func.count()).select_from(Case).where(Case.status == "ACTIVE")) or 0,
            "entities": session.scalar(select(func.count()).select_from(CaseEntity).where(CaseEntity.case_id == case_id)) or 0,
            "open_alerts": session.scalar(select(func.count()).select_from(Alert).where(Alert.case_id == case_id, Alert.status == "OPEN")) or 0,
            "documents": session.scalar(select(func.count()).select_from(Document).where(Document.case_id == case_id)) or 0,
            "anomalies": session.scalar(select(func.count()).select_from(AnalyticsResult).where(AnalyticsResult.case_id == case_id, AnalyticsResult.analysis_type != "INVESTIGATION_PRIORITY")) or 0,
        }
        priorities = session.scalars(select(AnalyticsResult).where(AnalyticsResult.case_id == case_id, AnalyticsResult.analysis_type == "INVESTIGATION_PRIORITY").order_by(AnalyticsResult.score.desc()).limit(8)).all()
        names = {item.id: item.name for item in session.scalars(select(Person).where(Person.id.in_([row.entity_id for row in priorities if row.entity_id]))).all()}
        recent_alerts = session.scalars(select(Alert).where(Alert.case_id == case_id).order_by(Alert.created_at.desc()).limit(6)).all()
        anomalies = session.scalars(select(AnalyticsResult).where(AnalyticsResult.case_id == case_id, AnalyticsResult.analysis_type != "INVESTIGATION_PRIORITY").order_by(AnalyticsResult.generated_at)).all()
        return {"case_id": case_id, "metrics": overview, "priority_entities": [{"entity_id": row.entity_id, "name": names.get(row.entity_id, f"Entity {row.entity_id}"), "score": row.score, "data_sufficiency": row.result.get("data_sufficiency", "LOW"), "key_signal": (row.result.get("explanations") or ["Available analytical signals"])[0]} for row in priorities], "recent_alerts": [{"id": item.id, "entity_id": item.entity_id, "title": item.alert_type.replace("_", " ").title(), "severity": item.severity.value, "score": item.score, "status": item.status.value, "created_at": item.created_at} for item in recent_alerts], "anomaly_series": [{"date": row.generated_at.date().isoformat(), "type": row.analysis_type, "score": row.score} for row in anomalies]}


@router.get("/cases")
def cases(status: str | None = None, limit: int = Query(50, ge=1, le=200), authorization: str | None = Header(default=None)) -> list[dict]:
    with SessionLocal() as session:
        investigator = _current_investigator(session, authorization)
        query = select(Case).order_by(Case.updated_at.desc()).limit(limit)
        if status: query = query.where(Case.status == status.upper())
        if not investigator.can_view_all_cases:
            query = query.where(or_(Case.assigned_investigator_id == investigator.investigator_id, Case.created_by_investigator_id == investigator.investigator_id))
        investigators = _investigator_map(session)
        return [case_row(item, investigators) for item in session.scalars(query).all()]


@router.post("/cases")
def create_case(payload: dict, authorization: str | None = Header(default=None)) -> dict:
    with SessionLocal() as session:
        investigator = _current_investigator(session, authorization)
        require_admin(investigator)
        assigned_to = payload.get("assigned_investigator_id")
        item = Case(
            case_number=payload["case_reference"],
            title=payload["title"],
            description=payload.get("description"),
            status="ASSIGNED" if assigned_to else "NEW",
            case_type=payload.get("case_type", "GENERAL"),
            priority=payload.get("priority", "MEDIUM"),
            created_by_investigator_id=investigator.investigator_id,
            assigned_investigator_id=assigned_to,
            assigned_at=datetime.utcnow() if assigned_to else None,
            jurisdiction=payload.get("jurisdiction"),
            sensitivity=payload.get("sensitivity", "INTERNAL"),
        )
        session.add(item)
        session.add(ReviewAudit(decision="CASE_CREATED", actor_type=investigator.investigator_id, metadata_={"case_reference": item.case_number}))
        session.commit()
        session.refresh(item)
        return case_row(item, _investigator_map(session))


@router.post("/cases/{case_id}/assign")
def assign_case(case_id: int, payload: dict, authorization: str | None = Header(default=None)) -> dict:
    with SessionLocal() as session:
        investigator = _current_investigator(session, authorization)
        require_admin(investigator)
        item = session.get(Case, case_id)
        if not item:
            raise HTTPException(404, "Case not found")
        assignee = session.scalar(select(Investigator).where(Investigator.investigator_id == payload["assigned_investigator_id"]))
        if not assignee:
            raise HTTPException(400, "Assigned investigator not found")
        item.assigned_investigator_id = assignee.investigator_id
        item.assigned_at = datetime.utcnow()
        item.status = "ASSIGNED" if item.status.value == "NEW" else item.status
        session.add(ReviewAudit(decision="CASE_ASSIGNED", actor_type=investigator.investigator_id, metadata_={"case_reference": item.case_number, "assigned_to": assignee.investigator_id}))
        session.commit()
        session.refresh(item)
        return case_row(item, _investigator_map(session))


@router.get("/cases/{case_id}")
def case_detail(case_id: int, authorization: str | None = Header(default=None)) -> dict:
    with SessionLocal() as session:
        investigator = _current_investigator(session, authorization) if authorization else None
        item = require_case_access(session, investigator, case_id) if investigator else session.get(Case, case_id)
        if not item: raise HTTPException(404, "Case not found")
        result = case_row(item, _investigator_map(session))
        relationships = session.scalar(select(func.count()).select_from(ExtractedRelationship).where(ExtractedRelationship.case_id == case_id)) or 0
        result["metrics"] = {"entities": session.scalar(select(func.count()).select_from(CaseEntity).where(CaseEntity.case_id == case_id)) or 0, "documents": session.scalar(select(func.count()).select_from(Document).where(Document.case_id == case_id)) or 0, "data_sources": session.scalar(select(func.count()).select_from(Document).where(Document.case_id == case_id)) or 0, "relationships": relationships, "evidence": session.scalar(select(func.count()).select_from(Evidence).where(Evidence.case_id == case_id)) or 0, "alerts": session.scalar(select(func.count()).select_from(Alert).where(Alert.case_id == case_id, Alert.status == "OPEN")) or 0}
        return result


@router.get("/cases/{case_id}/sources")
def case_sources(case_id: int, authorization: str | None = Header(default=None)) -> list[dict]:
    with SessionLocal() as session:
        investigator = _current_investigator(session, authorization)
        require_case_access(session, investigator, case_id)
        rows = session.scalars(select(Document).where(Document.case_id == case_id).order_by(Document.upload_timestamp.desc())).all()
        return [source_row(session, item) for item in rows]


@router.post("/cases/{case_id}/sources")
async def upload_case_source(
    case_id: int,
    file: UploadFile = File(...),
    data_category: str = Form("OTHER"),
    source_description: str | None = Form(default=None),
    authorization: str | None = Header(default=None),
) -> dict:
    content = await file.read()
    try:
        validated = validate_document(file.filename or "", content, file.content_type)
    except DocumentValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    with SessionLocal() as session:
        investigator = _current_investigator(session, authorization)
        require_case_access(session, investigator, case_id)
        document = DocumentProcessingService(session).create_document(case_id=case_id, filename=validated.filename, document_type=validated.extension, content=validated.content, mime_type=validated.mime_type, data_category=data_category, source_description=source_description, uploaded_by=investigator.investigator_id)
        session.add(ReviewAudit(decision="SOURCE_UPLOADED", actor_type=investigator.investigator_id, metadata_={"case_id": case_id, "document_id": document.id, "filename": document.filename}))
        session.commit()
        return {"source": source_row(session, document), "job": {"id": f"process-document-{document.id}", "status": "QUEUED", "next": f"/api/workspace/sources/{document.id}/process"}}


@router.get("/sources/{source_id}")
def source_detail(source_id: int, authorization: str | None = Header(default=None)) -> dict:
    with SessionLocal() as session:
        investigator = _current_investigator(session, authorization)
        document = session.get(Document, source_id)
        if not document:
            raise HTTPException(404, "Data source not found")
        require_case_access(session, investigator, document.case_id)
        return source_row(session, document)


@router.post("/sources/{source_id}/process")
def process_source(source_id: int, authorization: str | None = Header(default=None)) -> dict:
    with SessionLocal() as session:
        investigator = _current_investigator(session, authorization)
        document = session.get(Document, source_id)
        if not document:
            raise HTTPException(404, "Data source not found")
        require_case_access(session, investigator, document.case_id)
        try:
            result = DocumentProcessingService(session).process(source_id)
            BehavioralAnalyticsService(session).recalculate(document.case_id)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        session.add(ReviewAudit(decision="SOURCE_PROCESSED", actor_type=investigator.investigator_id, metadata_={"case_id": document.case_id, "document_id": source_id, "result": result}))
        session.commit()
        return {"source": source_row(session, document), "processing": result}


@router.get("/sources/{source_id}/status")
def source_status(source_id: int, authorization: str | None = Header(default=None)) -> dict:
    with SessionLocal() as session:
        investigator = _current_investigator(session, authorization)
        document = session.get(Document, source_id)
        if not document:
            raise HTTPException(404, "Data source not found")
        require_case_access(session, investigator, document.case_id)
        return {"id": document.id, "status": document.processing_status.value, "processing_started_at": document.processing_started_at, "processing_completed_at": document.processing_completed_at, "error": document.error_message}


@router.get("/cases/{case_id}/activity")
def case_activity(case_id: int, authorization: str | None = Header(default=None)) -> list[dict]:
    with SessionLocal() as session:
        investigator = _current_investigator(session, authorization)
        require_case_access(session, investigator, case_id)
        docs = session.scalars(select(Document).where(Document.case_id == case_id).order_by(Document.upload_timestamp.desc()).limit(20)).all()
        audits = session.scalars(select(ReviewAudit).order_by(ReviewAudit.created_at.desc()).limit(20)).all()
        events = [{"id": f"source-{item.id}", "type": "DATA_SOURCE", "status": item.processing_status.value, "summary": f"{item.filename} {item.processing_status.value.lower()}", "created_at": item.upload_timestamp} for item in docs]
        events += [{"id": f"audit-{item.id}", "type": "AUDIT", "status": item.decision, "summary": item.decision.replace("_", " ").title(), "created_at": item.created_at} for item in audits]
        return sorted(events, key=lambda row: row["created_at"], reverse=True)[:30]


@router.get("/cases/{case_id}/findings")
def case_findings(case_id: int, authorization: str | None = Header(default=None)) -> list[dict]:
    with SessionLocal() as session:
        investigator = _current_investigator(session, authorization)
        require_case_access(session, investigator, case_id)
        rows = session.scalars(select(AnalyticsResult).where(AnalyticsResult.case_id == case_id).order_by(AnalyticsResult.score.desc().nullslast()).limit(25)).all()
        return [{"id": f"INT-{item.id}", "case_id": item.case_id, "entity_id": item.entity_id, "title": item.analysis_type.replace("_", " ").title(), "score": item.score, "summary": (item.result.get("explanations") or ["Evidence-backed investigation lead"])[0], "reasons": item.result.get("explanations") or [], "generated_at": item.generated_at} for item in rows]


@router.get("/entities")
def entities(case_id: int = Query(1, ge=1), query: str | None = None, limit: int = Query(100, ge=1, le=250)) -> list[dict]:
    with SessionLocal() as session:
        ids = select(CaseEntity.entity_id).where(CaseEntity.case_id == case_id, CaseEntity.entity_type == "person")
        statement = select(Person).where(Person.id.in_(ids)).order_by(Person.name).limit(limit)
        if query: statement = statement.where(Person.name.ilike(f"%{query}%"))
        return [{"id": f"P{item.id:03d}", "source_id": item.id, "type": "Person", "name": item.name, "aliases": item.aliases or [], "phone": item.phone, "email": item.email, "case_id": case_id} for item in session.scalars(statement).all()]


@router.get("/entities/{entity_id}")
def entity_detail(entity_id: str, case_id: int = Query(1, ge=1)) -> dict:
    try: source_id = int(entity_id.removeprefix("P"))
    except ValueError as exc: raise HTTPException(400, "Unsupported entity identifier") from exc
    with SessionLocal() as session:
        person = session.get(Person, source_id)
        if not person: raise HTTPException(404, "Entity not found")
        priority = session.scalar(select(AnalyticsResult).where(AnalyticsResult.case_id == case_id, AnalyticsResult.entity_id == source_id, AnalyticsResult.analysis_type == "INVESTIGATION_PRIORITY").order_by(AnalyticsResult.generated_at.desc()))
        anomalies = session.scalars(select(AnalyticsResult).where(AnalyticsResult.case_id == case_id, AnalyticsResult.entity_id == source_id, AnalyticsResult.analysis_type != "INVESTIGATION_PRIORITY").order_by(AnalyticsResult.score.desc())).all()
        transactions = session.scalars(select(Transaction).where(or_(Transaction.sender_entity_id == source_id, Transaction.receiver_entity_id == source_id)).order_by(Transaction.timestamp.desc()).limit(50)).all()
        communications = session.scalars(select(Communication).where(or_(Communication.caller_entity_id == source_id, Communication.receiver_entity_id == source_id)).order_by(Communication.timestamp.desc()).limit(50)).all()
        return {"id": f"P{source_id:03d}", "source_id": source_id, "type": "Person", "name": person.name, "aliases": person.aliases or [], "phone": person.phone, "email": person.email, "address": person.address, "case_id": case_id, "priority": None if not priority else {"score": priority.score, **priority.result}, "anomalies": [{"type": row.analysis_type, "score": row.score, "result": row.result} for row in anomalies], "transactions": [{"id": item.id, "sender_id": item.sender_entity_id, "receiver_id": item.receiver_entity_id, "amount": float(item.amount), "timestamp": item.timestamp, "type": item.transaction_type} for item in transactions], "communications": [{"id": item.id, "caller_id": item.caller_entity_id, "receiver_id": item.receiver_entity_id, "duration_seconds": item.duration_seconds, "timestamp": item.timestamp, "type": item.communication_type} for item in communications]}


@router.get("/evidence")
def evidence(case_id: int = Query(1, ge=1), query: str | None = None, evidence_type: str | None = None, min_confidence: float = Query(0, ge=0, le=1), limit: int = Query(100, ge=1, le=250)) -> list[dict]:
    with SessionLocal() as session:
        statement = select(Evidence, Document.filename).outerjoin(Document, Evidence.document_id == Document.id).where(Evidence.case_id == case_id, Evidence.confidence >= min_confidence).order_by(Evidence.created_at.desc()).limit(limit)
        if query: statement = statement.where(or_(Evidence.content.ilike(f"%{query}%"), Evidence.source_reference.ilike(f"%{query}%"), Document.filename.ilike(f"%{query}%")))
        if evidence_type: statement = statement.where(Evidence.evidence_type == evidence_type)
        return [{"id": item.id, "case_id": item.case_id, "document_id": item.document_id, "document_name": filename, "type": item.evidence_type, "source_reference": item.source_reference, "content": item.content, "confidence": item.confidence, "created_at": item.created_at} for item, filename in session.execute(statement).all()]


@router.get("/documents")
def documents(case_id: int = Query(1, ge=1), limit: int = Query(100, ge=1, le=250)) -> list[dict]:
    with SessionLocal() as session:
        rows = session.scalars(select(Document).where(Document.case_id == case_id).order_by(Document.upload_timestamp.desc()).limit(limit)).all()
        return [{"id": item.id, "case_id": item.case_id, "filename": item.filename, "document_type": item.document_type, "status": item.processing_status.value, "uploaded_at": item.upload_timestamp, "mime_type": item.mime_type} for item in rows]


@router.get("/timeline")
def timeline(case_id: int = Query(1, ge=1), entity_id: int | None = None, event_type: str | None = None, limit: int = Query(250, ge=1, le=500)) -> list[dict]:
    with SessionLocal() as session:
        entity_ids = set(session.scalars(select(CaseEntity.entity_id).where(CaseEntity.case_id == case_id, CaseEntity.entity_type == "person")).all())
        if entity_id: entity_ids &= {entity_id}
        events = []
        if not event_type or event_type.upper() == "TRANSACTION":
            rows = session.scalars(select(Transaction).where(Transaction.sender_entity_id.in_(entity_ids)).order_by(Transaction.timestamp.desc()).limit(limit)).all()
            events += [{"id": f"transaction-{item.id}", "type": "TRANSACTION", "timestamp": item.timestamp, "entity_id": item.sender_entity_id, "title": f"Transaction to P{item.receiver_entity_id:03d}", "summary": f"Amount {float(item.amount):,.2f}", "severity": "ATTENTION" if (item.metadata_ or {}).get("unusual") or float(item.amount) >= 25000 else "NORMAL", "details": {"transaction_id": item.id, "sender_id": item.sender_entity_id, "receiver_id": item.receiver_entity_id, "amount": float(item.amount), "location_id": (item.metadata_ or {}).get("location_id")}} for item in rows]
        if not event_type or event_type.upper() == "COMMUNICATION":
            rows = session.scalars(select(Communication).where(Communication.caller_entity_id.in_(entity_ids)).order_by(Communication.timestamp.desc()).limit(limit)).all()
            events += [{"id": f"communication-{item.id}", "type": "COMMUNICATION", "timestamp": item.timestamp, "entity_id": item.caller_entity_id, "title": f"{item.communication_type.title()} to P{item.receiver_entity_id:03d}", "summary": f"Duration {item.duration_seconds}s", "severity": "NORMAL", "details": {"communication_id": item.id, "caller_id": item.caller_entity_id, "receiver_id": item.receiver_entity_id, "duration_seconds": item.duration_seconds}} for item in rows]
        if not event_type or event_type.upper() == "DOCUMENT":
            rows = session.scalars(select(Document).where(Document.case_id == case_id).order_by(Document.upload_timestamp.desc()).limit(limit)).all()
            events += [{"id": f"document-{item.id}", "type": "DOCUMENT", "timestamp": item.upload_timestamp, "entity_id": None, "title": item.filename, "summary": f"Processing status: {item.processing_status.value}", "severity": "NORMAL", "details": {"document_id": item.id}} for item in rows]
        if not event_type or event_type.upper() == "ALERT":
            rows = session.scalars(select(Alert).where(Alert.case_id == case_id).order_by(Alert.created_at.desc()).limit(limit)).all()
            events += [{"id": f"alert-{item.id}", "type": "ALERT", "timestamp": item.created_at, "entity_id": item.entity_id, "title": item.alert_type.replace("_", " ").title(), "summary": item.explanation, "severity": item.severity.value, "details": {"alert_id": item.id, "score": item.score}} for item in rows]
        return sorted(events, key=lambda row: row["timestamp"], reverse=True)[:limit]


@router.get("/locations")
def locations(case_id: int = Query(1, ge=1), entity_id: int | None = None, limit: int = Query(250, ge=1, le=500)) -> list[dict]:
    with SessionLocal() as session:
        ids = set(session.scalars(select(CaseEntity.entity_id).where(CaseEntity.case_id == case_id, CaseEntity.entity_type == "person")).all())
        if entity_id: ids &= {entity_id}
        rows = session.scalars(select(Transaction).where(Transaction.sender_entity_id.in_(ids)).order_by(Transaction.timestamp).limit(limit)).all()
        location_ids = {(item.metadata_ or {}).get("location_id") for item in rows} - {None}
        places = {item.id: item for item in session.scalars(select(Location).where(Location.id.in_(location_ids))).all()}
        return [{"id": f"location-event-{item.id}", "location_id": place.id, "name": place.name, "latitude": float(place.latitude), "longitude": float(place.longitude), "entity_id": item.sender_entity_id, "timestamp": item.timestamp, "event_type": "TRANSACTION", "event_id": item.id, "amount": float(item.amount), "geographic_deviation": bool(place.id == 25)} for item in rows if (place := places.get((item.metadata_ or {}).get("location_id")))]


@router.get("/search")
def global_search(query: str = Query(..., min_length=2, max_length=100), limit: int = Query(8, ge=1, le=25)) -> list[dict]:
    term = f"%{query}%"
    with SessionLocal() as session:
        results = [{"id": f"C{item.id:03d}", "type": "CASE", "label": item.title, "context": item.case_number, "url": f"/cases/{item.id}"} for item in session.scalars(select(Case).where(or_(Case.title.ilike(term), Case.case_number.ilike(term))).limit(limit)).all()]
        results += [{"id": f"P{item.id:03d}", "type": "PERSON", "label": item.name, "context": item.phone or "Person", "url": f"/entities/P{item.id:03d}"} for item in session.scalars(select(Person).where(Person.name.ilike(term)).limit(limit)).all()]
        sources = [(Organization, "ORGANIZATION", "ORG", "name"), (Phone, "PHONE", "PH", "number"), (BankAccount, "BANK ACCOUNT", "BA", "account_number_masked"), (Vehicle, "VEHICLE", "VEH", "registration_number"), (Location, "LOCATION", "LOC", "name")]
        for model, label, prefix, field in sources:
            column = getattr(model, field)
            results += [{"id": f"{prefix}{item.id:03d}", "type": label, "label": str(getattr(item, field)), "context": "Investigation entity", "url": f"/network?focus={prefix}{item.id:03d}"} for item in session.scalars(select(model).where(column.ilike(term)).limit(limit)).all()]
        results += [{"id": f"DOC{item.id:03d}", "type": "DOCUMENT", "label": item.filename, "context": item.document_type, "url": f"/documents/{item.id}"} for item in session.scalars(select(Document).where(Document.filename.ilike(term)).limit(limit)).all()]
        return results[:limit * 4]
