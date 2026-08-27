from dataclasses import dataclass
from difflib import SequenceMatcher
from typing import Any

from sqlalchemy.orm import Session

from app.models.enums import MatchType
from app.models.person import Person
from app.nlp.entity_extractor import ExtractedEntity
from app.nlp.normalizer import normalize_email, normalize_name, normalize_phone


@dataclass(frozen=True)
class ResolutionCandidate:
    candidate_entity_type: str
    candidate_entity_id: int | None
    candidate_label: str | None
    match_type: MatchType
    confidence: float
    signals: dict[str, Any]


class EntityResolver:
    def __init__(self, session: Session) -> None:
        self.session = session

    def resolve(self, extracted: ExtractedEntity) -> list[ResolutionCandidate]:
        if extracted.type == "PERSON":
            return self._resolve_person(extracted)
        if extracted.type == "PHONE":
            person = self.session.query(Person).filter(Person.phone.like(f"%{extracted.normalized_value[-5:]}")).first()
            if person:
                return [
                    ResolutionCandidate("Person", person.id, person.name, MatchType.HIGH_CONFIDENCE_MATCH, 0.9, {"phone_suffix_match": 0.9})
                ]
        return [ResolutionCandidate(extracted.type, None, None, MatchType.NO_MATCH, 0.0, {"no_candidate": 1.0})]

    def _resolve_person(self, extracted: ExtractedEntity) -> list[ResolutionCandidate]:
        normalized = normalize_name(extracted.text)
        candidates = []
        for person in self.session.query(Person).limit(200).all():
            name_score = SequenceMatcher(None, normalized, normalize_name(person.name)).ratio()
            alias_score = max([SequenceMatcher(None, normalized, normalize_name(alias)).ratio() for alias in (person.aliases or [])] or [0.0])
            phone_score = 0.0
            email_score = 0.0
            if "@" in extracted.text and person.email:
                email_score = 1.0 if normalize_email(extracted.text) == normalize_email(person.email) else 0.0
            if person.phone and normalize_phone(person.phone) == extracted.normalized_value:
                phone_score = 1.0
            confidence = max(name_score * 0.72 + alias_score * 0.95 + phone_score * 0.1, email_score)
            if confidence >= 0.98:
                match_type = MatchType.EXACT_MATCH
            elif confidence >= 0.86:
                match_type = MatchType.HIGH_CONFIDENCE_MATCH
            elif confidence >= 0.65:
                match_type = MatchType.POSSIBLE_MATCH
            else:
                continue
            candidates.append(
                ResolutionCandidate(
                    "Person",
                    person.id,
                    person.name,
                    match_type,
                    round(confidence, 4),
                    {"name_similarity": round(name_score, 4), "alias_similarity": round(alias_score, 4), "phone_match": phone_score, "email_match": email_score},
                )
            )
        return sorted(candidates, key=lambda item: item.confidence, reverse=True)[:5] or [
            ResolutionCandidate("Person", None, None, MatchType.NO_MATCH, 0.0, {"no_candidate": 1.0})
        ]
