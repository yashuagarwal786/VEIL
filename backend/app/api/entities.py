from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query

from app.db.session import SessionLocal
from app.models.enums import MatchDecision, MatchStatus
from app.models.extraction import EntityMatch, ReviewAudit
from app.schemas.documents import EntityMatchResponse, MatchReviewRequest

router = APIRouter()


@router.get("/matches", response_model=list[EntityMatchResponse], summary="List entity resolution match candidates")
def list_matches(
    case_id: int | None = None,
    status: MatchStatus | None = None,
    entity_type: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
) -> list[EntityMatchResponse]:
    with SessionLocal() as session:
        query = session.query(EntityMatch)
        if case_id is not None:
            query = query.filter(EntityMatch.case_id == case_id)
        if status is not None:
            query = query.filter(EntityMatch.status == status)
        if entity_type is not None:
            query = query.filter(EntityMatch.candidate_entity_type == entity_type)
        return [
            EntityMatchResponse(
                id=item.id,
                extraction_id=item.extraction_id,
                case_id=item.case_id,
                candidate_entity_type=item.candidate_entity_type,
                candidate_entity_id=item.candidate_entity_id,
                candidate_label=item.candidate_label,
                match_type=item.match_type.value,
                confidence=item.confidence,
                signals=item.signals,
                status=item.status.value,
            )
            for item in query.limit(limit).all()
        ]


@router.post("/matches/{match_id}/review", response_model=EntityMatchResponse, summary="Review an entity resolution match")
def review_match(match_id: int, request: MatchReviewRequest) -> EntityMatchResponse:
    with SessionLocal() as session:
        match = session.get(EntityMatch, match_id)
        if not match:
            raise HTTPException(status_code=404, detail="Match candidate not found.")
        status_by_decision = {
            MatchDecision.ACCEPT: MatchStatus.ACCEPTED,
            MatchDecision.REJECT: MatchStatus.REJECTED,
            MatchDecision.DEFER: MatchStatus.DEFERRED,
        }
        match.status = status_by_decision[request.decision]
        match.reviewed_at = datetime.now(timezone.utc)
        match.actor_type = "demo_investigator"
        session.add(ReviewAudit(match_id=match.id, extraction_id=match.extraction_id, decision=request.decision.value, actor_type="demo_investigator"))
        session.commit()
        session.refresh(match)
        return EntityMatchResponse(
            id=match.id,
            extraction_id=match.extraction_id,
            case_id=match.case_id,
            candidate_entity_type=match.candidate_entity_type,
            candidate_entity_id=match.candidate_entity_id,
            candidate_label=match.candidate_label,
            match_type=match.match_type.value,
            confidence=match.confidence,
            signals=match.signals,
            status=match.status.value,
        )
