from app.models.case import Case
from app.models.enums import CaseStatus
from app.models.evidence import Evidence


def test_case_model_creation() -> None:
    case = Case(
        case_number="VEIL-TEST-001",
        title="Synthetic Test Case",
        description="Model construction smoke test.",
        status=CaseStatus.ACTIVE,
    )

    assert case.case_number == "VEIL-TEST-001"
    assert case.status == CaseStatus.ACTIVE


def test_evidence_confidence_value() -> None:
    evidence = Evidence(
        case_id=1,
        evidence_type="DOCUMENT_REFERENCE",
        content="Synthetic supporting evidence.",
        confidence=0.82,
    )

    assert evidence.confidence == 0.82
