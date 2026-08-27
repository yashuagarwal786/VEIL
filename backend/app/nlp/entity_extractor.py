import re
from dataclasses import dataclass

from app.nlp.normalizer import normalize_by_type
from app.nlp.text_extractor import TextPage


@dataclass(frozen=True)
class ExtractedEntity:
    text: str
    type: str
    normalized_value: str
    confidence: float
    page: int | None
    start_offset: int
    end_offset: int
    source_reference: str
    source_context: str


PATTERNS: list[tuple[str, re.Pattern[str], float]] = [
    ("EMAIL", re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"), 0.98),
    ("PHONE", re.compile(r"(?<!\d)(?:\+91[-\s]?)?[6-9]\d{9}(?!\d)|\+1-555-\d{5}"), 0.96),
    ("MONEY", re.compile(r"(?i)(?:₹|rs\.?\s*|inr\s*)\d[\d,]*(?:\.\d{1,2})?"), 0.95),
    ("BANK_ACCOUNT", re.compile(r"\b(?:acct|account)\s*(?:no\.?|number)?\s*[:#-]?\s*(?:\*{2,}|x{2,})?[\d-]{4,}\b", re.I), 0.9),
    ("VEHICLE", re.compile(r"\b[A-Z]{2}[-\s]?\d{2}[-\s]?[A-Z]{1,2}[-\s]?\d{4}\b|\bSYN-\d{4}-\d{3}\b"), 0.93),
    ("CASE_REFERENCE", re.compile(r"\b(?:FIR|CASE|VEIL)-\d{4}-\d{3}\b|\bCASE-\d{3,6}\b", re.I), 0.94),
    ("DATE", re.compile(r"\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\b|\b\d{4}-\d{2}-\d{2}\b", re.I), 0.88),
]

PERSON_PATTERN = re.compile(r"\b([A-Z][a-z]+(?:\s+[A-Z]\.|(?:\s+[A-Z][a-z]+)))(?:\s+\d{2})?")
LOCATION_HINT = re.compile(r"\b(?:near|at|from|to)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,4}\s(?:Station|Market|Avenue|Street|District|Depot|Hub))\b")
ORG_HINT = re.compile(r"\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3}\s+(?:Bank|Finance|Logistics|Store|Company|Organization))\b")


class RuleBasedEntityExtractor:
    def extract(self, text: str, pages: list[TextPage]) -> list[ExtractedEntity]:
        page = pages[0] if pages else TextPage(1, text, 0, len(text))
        entities: dict[tuple[str, int, int], ExtractedEntity] = {}
        for entity_type, pattern, confidence in PATTERNS:
            for match in pattern.finditer(text):
                self._add(entities, entity_type, match.group(0), confidence, page.page_number, match.start(), match.end(), text)
        for match in PERSON_PATTERN.finditer(text):
            value = match.group(1)
            if value.lower() in {"Jaipur Railway", "Project Eclipse", "Synthetic Field"}:
                continue
            self._add(entities, "PERSON", value, 0.76, page.page_number, match.start(1), match.end(1), text)
        for pattern, entity_type, confidence in [(LOCATION_HINT, "LOCATION", 0.82), (ORG_HINT, "ORGANIZATION", 0.84)]:
            for match in pattern.finditer(text):
                self._add(entities, entity_type, match.group(1), confidence, page.page_number, match.start(1), match.end(1), text)
        return list(entities.values())

    def _add(
        self,
        entities: dict[tuple[str, int, int], ExtractedEntity],
        entity_type: str,
        value: str,
        confidence: float,
        page: int | None,
        start: int,
        end: int,
        text: str,
    ) -> None:
        context_start = max(0, start - 60)
        context_end = min(len(text), end + 60)
        entities[(entity_type, start, end)] = ExtractedEntity(
            text=value,
            type=entity_type,
            normalized_value=normalize_by_type(entity_type, value),
            confidence=confidence,
            page=page,
            start_offset=start,
            end_offset=end,
            source_reference=f"page {page}, chars {start}-{end}",
            source_context=text[context_start:context_end],
        )
