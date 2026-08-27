from types import SimpleNamespace
from pathlib import Path

from app.nlp.document_loader import DocumentValidationError, validate_document
from app.nlp.entity_extractor import RuleBasedEntityExtractor
from app.nlp.entity_resolver import EntityResolver
from app.nlp.normalizer import normalize_email, normalize_money, normalize_name, normalize_phone, normalize_vehicle
from app.nlp.relationship_extractor import RuleBasedRelationshipExtractor
from app.nlp.text_extractor import extract_text


def test_validate_rejects_executable() -> None:
    try:
        validate_document("bad.exe", b"MZ executable", "application/octet-stream")
    except DocumentValidationError as exc:
        assert "Unsupported" in str(exc) or "Executable" in str(exc)
    else:
        raise AssertionError("Executable validation should fail")


def test_txt_csv_json_extraction() -> None:
    txt = extract_text(b"Rahul Sharma called Amit Kumar.", ".txt")
    csv = extract_text(b"name,phone\nRahul Sharma,9876543210", ".csv")
    json_doc = extract_text(b'{"name":"Rahul Sharma","amount":"INR 50000"}', ".json")

    assert "Rahul Sharma" in txt.text
    assert "9876543210" in csv.text
    assert "INR 50000" in json_doc.text


def test_pdf_extraction() -> None:
    pdf_path = Path("data") / "synthetic" / "documents" / "project_eclipse_statement.pdf"
    extracted = extract_text(pdf_path.read_bytes(), ".pdf")

    assert "Rahul Sharma" in extracted.text
    assert extracted.pages[0].page_number == 1


def test_normalization() -> None:
    assert normalize_name("  RAHUL   Sharma ") == "rahul sharma"
    assert normalize_phone("+91 98765 43210") == "9876543210"
    assert normalize_email("Rahul@Example.Test") == "rahul@example.test"
    assert normalize_money("INR 50,000") == "50000.00"
    assert normalize_vehicle("rj 14 ab 1234") == "RJ14AB1234"


def test_entity_extraction_rules() -> None:
    text = "Rahul Sharma called Amit Kumar near Jaipur Railway Station. Phone 9876543210. Email rahul@example.test. INR 50000."
    result = RuleBasedEntityExtractor().extract(text, extract_text(text.encode(), ".txt").pages)
    types = {item.type for item in result}

    assert {"PERSON", "LOCATION", "PHONE", "EMAIL", "MONEY"} <= types


def test_relationship_extraction_rules() -> None:
    text = "Rahul Sharma called Amit Kumar. Rahul Sharma transferred INR 50000 to Amit Kumar."
    result = RuleBasedRelationshipExtractor().extract(text)
    types = {item.relationship_type for item in result}

    assert "CALLS" in types
    assert "TRANSFERRED_TO" in types


class FakeQuery:
    def __init__(self, rows):
        self.rows = rows

    def limit(self, _: int):
        return self

    def all(self):
        return self.rows

    def filter(self, *_):
        return self

    def first(self):
        return self.rows[0] if self.rows else None


class FakeSession:
    def __init__(self, rows):
        self.rows = rows

    def query(self, _):
        return FakeQuery(self.rows)


def test_entity_resolution_categories() -> None:
    person = SimpleNamespace(id=14, name="Rahul Sharma", aliases=["Rahul S."], phone="+91 9876543210", email="rahul@example.test")
    extracted = RuleBasedEntityExtractor().extract("Rahul S. called Amit Kumar.", extract_text(b"Rahul S. called Amit Kumar.", ".txt").pages)[0]

    matches = EntityResolver(FakeSession([person])).resolve(extracted)  # type: ignore[arg-type]

    assert matches[0].confidence >= 0.65
    assert matches[0].candidate_entity_id == 14


def test_entity_resolution_no_match() -> None:
    person = SimpleNamespace(id=14, name="Rahul Sharma", aliases=[], phone="+91 9876543210", email="rahul@example.test")
    extracted = RuleBasedEntityExtractor().extract("Meera Iyer called Amit Kumar.", extract_text(b"Meera Iyer called Amit Kumar.", ".txt").pages)[0]

    matches = EntityResolver(FakeSession([person])).resolve(extracted)  # type: ignore[arg-type]

    assert matches[0].match_type.value == "NO_MATCH"
