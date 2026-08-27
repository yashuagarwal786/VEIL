import csv
import io
import json
from dataclasses import dataclass

from pypdf import PdfReader

from app.nlp.cleaner import clean_text


@dataclass(frozen=True)
class TextPage:
    page_number: int
    text: str
    start_offset: int
    end_offset: int


@dataclass(frozen=True)
class ExtractedText:
    text: str
    pages: list[TextPage]
    ocr_unavailable: bool = False


class TextExtractionError(ValueError):
    pass


def extract_text(content: bytes, extension: str) -> ExtractedText:
    if extension == ".txt":
        return _single_page(content.decode("utf-8", errors="replace"))
    if extension == ".csv":
        return _extract_csv(content)
    if extension == ".json":
        return _extract_json(content)
    if extension == ".pdf":
        return _extract_pdf(content)
    raise TextExtractionError("Unsupported document type.")


def _single_page(text: str) -> ExtractedText:
    cleaned = clean_text(text)
    if not cleaned:
        raise TextExtractionError("No readable text found in document.")
    return ExtractedText(text=cleaned, pages=[TextPage(page_number=1, text=cleaned, start_offset=0, end_offset=len(cleaned))])


def _extract_csv(content: bytes) -> ExtractedText:
    decoded = content.decode("utf-8", errors="replace")
    reader = csv.reader(io.StringIO(decoded))
    rows = [" | ".join(cell.strip() for cell in row if cell.strip()) for row in reader]
    return _single_page("\n".join(row for row in rows if row))


def _extract_json(content: bytes) -> ExtractedText:
    try:
        parsed = json.loads(content.decode("utf-8", errors="replace"))
    except json.JSONDecodeError as exc:
        raise TextExtractionError("Malformed JSON document.") from exc
    return _single_page(json.dumps(parsed, ensure_ascii=False, indent=2))


def _extract_pdf(content: bytes) -> ExtractedText:
    try:
        reader = PdfReader(io.BytesIO(content))
    except Exception as exc:
        raise TextExtractionError("Corrupt PDF document.") from exc
    pages: list[TextPage] = []
    chunks: list[str] = []
    offset = 0
    for index, page in enumerate(reader.pages[:25], start=1):
        page_text = clean_text(page.extract_text() or "")
        if not page_text:
            continue
        start = offset
        chunks.append(page_text)
        offset += len(page_text) + 2
        pages.append(TextPage(index, page_text, start, offset))
    text = "\n\n".join(chunks)
    if not text:
        return ExtractedText(text="OCR processing is unavailable for this document.", pages=[], ocr_unavailable=True)
    return ExtractedText(text=text, pages=pages)
