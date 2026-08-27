import re
from dataclasses import dataclass

from app.nlp.normalizer import normalize_name


@dataclass(frozen=True)
class ExtractedRelationshipResult:
    relationship_type: str
    source_entity: str
    target_entity: str
    confidence: float
    page: int | None
    source_text: str
    source_reference: str


RELATIONSHIP_PATTERNS: list[tuple[str, re.Pattern[str], float]] = [
    ("CALLS", re.compile(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:called|contacted)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b"), 0.94),
    ("TRANSFERRED_TO", re.compile(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+transferred\s+(?:₹|Rs\.?|INR)?\s*[\d,]+(?:\.\d{1,2})?\s+to\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b", re.I), 0.93),
    ("VISITED", re.compile(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:met|visited)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:near|at)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){1,4})\b"), 0.86),
    ("RELATIONSHIP_ASSERTION", re.compile(r"\b(?:suspect|reported|claimed)\s+that\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+knows\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b", re.I), 0.72),
]


class RuleBasedRelationshipExtractor:
    def extract(self, text: str, page: int | None = 1) -> list[ExtractedRelationshipResult]:
        relationships: list[ExtractedRelationshipResult] = []
        for rel_type, pattern, confidence in RELATIONSHIP_PATTERNS:
            for match in pattern.finditer(text):
                relationships.append(
                    ExtractedRelationshipResult(
                        relationship_type=rel_type,
                        source_entity=match.group(1),
                        target_entity=match.group(2),
                        confidence=confidence,
                        page=page,
                        source_text=match.group(0),
                        source_reference=f"page {page}, chars {match.start()}-{match.end()}",
                    )
                )
        return relationships
