MODEL_VERSION = "1.0"
MIN_BASELINE_OBSERVATIONS = 4
PRIORITY_WEIGHTS = {"transaction": 0.30, "communication": 0.20, "temporal": 0.20, "geographic": 0.15, "network": 0.15}
SEVERITY_THRESHOLDS = ((85, "CRITICAL"), (70, "HIGH"), (45, "MEDIUM"), (0, "LOW"))


def severity_for(score: float) -> str:
    return next(severity for threshold, severity in SEVERITY_THRESHOLDS if score >= threshold)
