from enum import Enum


class CaseStatus(str, Enum):
    ACTIVE = "ACTIVE"
    CLOSED = "CLOSED"
    ARCHIVED = "ARCHIVED"


class ProcessingStatus(str, Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class AlertSeverity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class AlertStatus(str, Enum):
    OPEN = "OPEN"
    REVIEWED = "REVIEWED"
    DISMISSED = "DISMISSED"


class ExtractionKind(str, Enum):
    ENTITY = "ENTITY"
    RELATIONSHIP = "RELATIONSHIP"


class ExtractionReviewStatus(str, Enum):
    AUTO_ACCEPT = "AUTO_ACCEPT"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    REJECTED = "REJECTED"


class MatchStatus(str, Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    DEFERRED = "DEFERRED"


class MatchDecision(str, Enum):
    ACCEPT = "ACCEPT"
    REJECT = "REJECT"
    DEFER = "DEFER"


class MatchType(str, Enum):
    EXACT_MATCH = "EXACT_MATCH"
    HIGH_CONFIDENCE_MATCH = "HIGH_CONFIDENCE_MATCH"
    POSSIBLE_MATCH = "POSSIBLE_MATCH"
    NO_MATCH = "NO_MATCH"
