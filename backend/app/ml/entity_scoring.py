from math import isfinite

from app.ml.thresholds import PRIORITY_WEIGHTS


def priority_score(components: dict[str, float | None]) -> dict:
    available = {key: float(value) for key, value in components.items() if value is not None and isfinite(float(value))}
    if not available: return {"score": 0.0, "components": {}, "data_sufficiency": "LOW", "note": "Insufficient historical data for behavioral baseline."}
    total = sum(PRIORITY_WEIGHTS[key] for key in available); score = sum(available[key] * PRIORITY_WEIGHTS[key] / total for key in available)
    sufficiency = "HIGH" if len(available) >= 4 else "MEDIUM" if len(available) >= 2 else "LOW"
    return {"score": round(min(100, max(0, score)), 2), "components": available, "data_sufficiency": sufficiency, "note": None if sufficiency == "HIGH" else "Limited historical data; interpretation should be cautious."}
