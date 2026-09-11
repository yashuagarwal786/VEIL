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
    ("CALLS", re.compile(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\s+(?:called|contacted|dialed|phoned|spoke with|received call from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b", re.I), 0.94),
    ("COMMUNICATED_WITH", re.compile(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\s+(?:communicated with|messaged|chatted with|interacted with|exchanged texts with)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b", re.I), 0.91),
    ("TRANSFERRED_TO", re.compile(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\s+(?:transferred|paid|sent|routed|wired|deposited|credited)\s+(?:₹|Rs\.?|INR)?\s*[\d,]+(?:\.\d{1,2})?(?:\s*(?:lakh|crore|k|thousand))?\s+(?:to|towards)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b", re.I), 0.95),
    ("TRANSFERRED_TO", re.compile(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\s+(?:transferred|sent money|paid funds|routed money)\s+to\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b", re.I), 0.90),
    ("VISITED", re.compile(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\s+(?:met|visited|stayed at|spotted at|travelled with)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b", re.I), 0.86),
    ("ASSOCIATED_WITH", re.compile(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\s+(?:works for|employed by|accomplice of|partner of|associated with|subordinate to|coordinating with|handler for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b", re.I), 0.88),
    ("RELATIONSHIP_ASSERTION", re.compile(r"\b(?:suspect|reported|claimed|disclosed)\s+that\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+knows\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b", re.I), 0.75),
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
