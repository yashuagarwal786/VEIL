import mimetypes
from dataclasses import dataclass
from pathlib import Path


SUPPORTED_EXTENSIONS = {".pdf", ".txt", ".csv", ".json"}
SUPPORTED_MIME_TYPES = {
    "application/pdf",
    "text/plain",
    "text/csv",
    "application/csv",
    "application/json",
}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024


@dataclass(frozen=True)
class ValidatedDocument:
    filename: str
    extension: str
    mime_type: str
    size_bytes: int
    content: bytes


class DocumentValidationError(ValueError):
    pass


def validate_document(filename: str, content: bytes, content_type: str | None) -> ValidatedDocument:
    clean_name = Path(filename).name
    extension = Path(clean_name).suffix.lower()
    guessed_mime = mimetypes.guess_type(clean_name)[0] or "application/octet-stream"
    mime_type = content_type or guessed_mime

    if not clean_name or clean_name in {".", ".."}:
        raise DocumentValidationError("Invalid filename.")
    if extension not in SUPPORTED_EXTENSIONS:
        raise DocumentValidationError("Unsupported file extension.")
    if mime_type not in SUPPORTED_MIME_TYPES and guessed_mime not in SUPPORTED_MIME_TYPES:
        raise DocumentValidationError("Unsupported MIME type.")
    if len(content) == 0:
        raise DocumentValidationError("Document is empty.")
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise DocumentValidationError("Document exceeds the maximum supported size.")
    if content[:2] == b"MZ" or content[:4] == b"\x7fELF":
        raise DocumentValidationError("Executable files are not supported.")
    if extension == ".pdf" and not content.startswith(b"%PDF"):
        raise DocumentValidationError("PDF content is not readable.")

    return ValidatedDocument(clean_name, extension, mime_type, len(content), content)
